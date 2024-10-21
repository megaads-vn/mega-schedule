'use strict'

const ScheduleData = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const EmailService = use('App/Services/EmailService');
const schedule = require('node-schedule');
const request = require('request');
const Ws = use('Ws');
const axios = require('axios');
const https = require('https');
const agent = new https.Agent({
    rejectUnauthorized: false
});

class ScheduleService {

    async run() {
        var data = await ScheduleData.query().where('status', '=', 'active').fetch();
        this.init(data.toJSON());
    }

    init(data) {
        data.forEach(async (scheduleInfo) => {
            this.create(scheduleInfo);
        });
    }

    delete(scheduleId) {
        if (typeof (globalSchedule[scheduleId]) != 'undefined') {
            try {
                globalSchedule[scheduleId].cancel();
            } catch (error) { }
            delete globalSchedule[scheduleId];
        }
    }

    update(scheduleInfo) {
        if(typeof(scheduleInfo.id) != "undefined" && typeof(globalSchedule[scheduleInfo.id]) != 'undefined') {
            try {
                globalSchedule[scheduleInfo.id].cancel();
            } catch (error) { }
            delete globalSchedule[scheduleInfo.id];
        }
        this.create(scheduleInfo);
    }

    create(scheduleInfo) {
        var self = this;
        var runAt = scheduleInfo.run_at.trim().replace(/\s\s+/g, ' ');
        globalSchedule[scheduleInfo.id] = scheduleInfo;
        globalSchedule[scheduleInfo.id] = schedule.scheduleJob(runAt, function (scheduleInfo) {
            if (scheduleRun.length > 10) {
                scheduleRun.pop();
            }
            scheduleRun.unshift({
                runTime: new Date().getDateTime(),
                runLink: scheduleInfo.url,
                method: scheduleInfo.method
            });
            var socket = Ws.getChannel('activitySchedule').topic('activitySchedule');
            if(socket) {
                socket.broadcast('scheduleRun', scheduleRun);
            }
            if (scheduleInfo.ip_request) {
                self.requestUrlV2(scheduleInfo);
            } else {
                self.requestUrl(scheduleInfo);
            }
        }.bind(null, scheduleInfo));
    }

    async requestUrl(scheduleInfo) {
        let requestParams = {
            method: scheduleInfo.method || 'GET',
            uri: scheduleInfo.url,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 (MegaAds - Schedule)",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            },
            rejectUnauthorized: false,
            maxRedirects: 5,
            timeout: 10 * 60 * 1000
        };
        if (['POST', 'PUT', 'PATCH'].indexOf(scheduleInfo.method) > -1 && scheduleInfo.body) {
            requestParams.json = true;
            requestParams.body = JSON.parse(scheduleInfo.body);
        }

        let logObj = new LogSchedule;
        let currentTime = new Date().getDateTime();
        logObj.merge({
            schedule_id: scheduleInfo.id,
            request: '+ Time: ' + currentTime
        });
        await logObj.save();

        request(requestParams, (error, response, body) => {
            var responseCode = 500;
            if (response && response.statusCode) {
                responseCode = response.statusCode;
            }
            if (error) {
                EmailService.sendMail(scheduleInfo.id, responseCode, error);
            }

            try {
                var parseResult = JSON.parse(body);
                if (parseResult.status && ['fail', 'failed', 'error'].indexOf(parseResult.status) > -1) {
                    EmailService.sendMail(scheduleInfo.id, responseCode, body);
                }
            } catch(err) {}

            if (responseCode != 200) {
                EmailService.sendMail(scheduleInfo.id, responseCode, body);
            }
            this.writeLog(logObj, response, body, error);
        });
    }

    async requestUrlV2(scheduleInfo) {
        let requestParams = {
            method: scheduleInfo.method || 'GET',
            url: scheduleInfo.url,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 (MegaAds - Schedule)",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Content-Type": "application/json",
            },
            httpsAgent: agent,
            maxRedirects: 5,
            timeout: 10 * 60 * 1000
        };
        if (['POST', 'PUT', 'PATCH'].indexOf(scheduleInfo.method) > -1 && scheduleInfo.body) {
            requestParams.data = scheduleInfo.body;
        }

        let logObj = new LogSchedule;
        let currentTime = new Date().getDateTime();
        logObj.merge({
            schedule_id: scheduleInfo.id,
            request: '+ Time: ' + currentTime
        });
        await logObj.save();
        let response = null;
        let body = '';
        let error = null;
        try {
            if (scheduleInfo.ip_request) {
                let ipFamily = this.getIPVersion(scheduleInfo.ip_request);
                const instance = axios.create({
                    httpsAgent: new https.Agent({
                        family: ipFamily, // Sử dụng IPv4. Nếu IP là IPv6, sử dụng family: 6
                        lookup: (hostname, options, callback) => {
                            // Bỏ qua hostname gốc và sử dụng IP mà bạn đã chỉ định
                            callback(null, scheduleInfo.ip_request, options.family);
                        }
                    })
                });
                response = await instance(requestParams);
            } else {
                response = await axios(requestParams);
            }
            let responseCode = 500;
            if (response.status) {
                responseCode = response.status;
            }
            body = response.data;
            if (body.status && ['fail', 'failed', 'error'].indexOf(body.status) > -1) {
                EmailService.sendMail(scheduleInfo.id, responseCode, body);
            }

            if (responseCode != 200) {
                EmailService.sendMail(scheduleInfo.id, responseCode, body);
            }

        } catch (exception) {
            let responseCode;
            if (exception.response) {
                let responseErr = exception.response;
                responseCode = responseErr.status;
                body = responseErr.data;
                error = responseErr.data;
            } else {
                body = exception.code;
                responseCode = 400;
                error = body;
            }
            EmailService.sendMail(scheduleInfo.id, responseCode, body);
        }
        this.writeLogV2(logObj, response, body, error);
    }

    getIPVersion(ip) {
        const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4})$|^::([0-9a-fA-F]{1,4}:){0,5}([0-9a-fA-F]{1,4})$|([0-9a-fA-F]{1,4}:){1,6}:$/;

        if (ipv4Regex.test(ip)) {
            return 4;
        } else if (ipv6Regex.test(ip)) {
            return 6;
        } else {
            return 0;
        }
    }


    writeLog(logObj, response, body, err) {
        let currentTime = new Date().getDateTime();
        let content = ['+ Time: ' + currentTime];

        if (response && response.statusCode) {
            content.push('+ Status: ' + response.statusCode);
            let contentTypes = [];
            if (response.headers['content-type']) {
                contentTypes = response.headers['content-type'].split(';');
            }
            if (contentTypes.indexOf('application/json') > -1) {
                if (typeof body == 'object') {
                    content.push('+ Body: ' + JSON.stringify(body));
                } else {
                    content.push('+ Body: ' + body);
                }
            }
        }
        if (err) {
            content.push('+ Error: ' + err);
        }

        logObj.response = content.join('<br />');
        logObj.save();
    }

    writeLogV2(logObj, response, body, err) {
        let currentTime = new Date().getDateTime();
        let content = ['+ Time: ' + currentTime];

        if (response && response.status) {
            content.push('+ Status: ' + response.status);
            let contentTypes = [];
            if (response.headers['content-type']) {
                contentTypes = response.headers['content-type'].split(';');
            }
            if (contentTypes.indexOf('application/json') > -1) {
                if (typeof body == 'object') {
                    content.push('+ Body: ' + JSON.stringify(body));
                } else {
                    content.push('+ Body: ' + body);
                }
            }
        }
        if (err) {
            content.push('+ Error: ' + err);
        }

        logObj.response = content.join('<br />');
        logObj.save();
    }

}

module.exports = new ScheduleService;
