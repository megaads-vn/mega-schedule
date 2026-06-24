'use strict'

const ScheduleData = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const EmailService = use('App/Services/EmailService');
const schedule = require('node-schedule');
const request = require('request');
const Ws = use('Ws');
const axios = require('axios');
const https = require('https');

// Shared https.Agent - reuse across all requests to prevent memory leak
// Previously, a new Agent was created per request, leaking TLS sockets and buffers
const sharedHttpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,
    maxSockets: 50
});

const MAX_SCHEDULE_RUN_ITEMS = 50;

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

    async runNow(scheduleId) {
        var data = await ScheduleData.query().where('id', '=', scheduleId).firstOrFail();
        var scheduleInfo = data.toJSON();
        if (scheduleInfo.ip_request) {
            await this.requestUrlV2(scheduleInfo);
        } else {
            await this.requestUrl(scheduleInfo);
        }
        return data;
    }

    update(scheduleInfo) {
        if (typeof (scheduleInfo.id) != "undefined" && typeof (globalSchedule[scheduleInfo.id]) != 'undefined') {
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
            // Cap scheduleRun to prevent unbounded memory growth
            if (scheduleRun.length >= MAX_SCHEDULE_RUN_ITEMS) {
                scheduleRun.splice(MAX_SCHEDULE_RUN_ITEMS - 1);
            }
            const listUrl = scheduleInfo.url.split('\n');
            for (const url of listUrl) {
                if (!url.trim()) {
                    continue;
                }
                scheduleRun.unshift({
                    runTime: new Date().getDateTime(),
                    runLink: url,
                    method: scheduleInfo.method
                });
                var socket = Ws.getChannel('activitySchedule').topic('activitySchedule');
                if (socket) {
                    socket.broadcast('scheduleRun', scheduleRun);
                }
                if (scheduleInfo.ip_request) {

                    self.requestUrlV2({ ...scheduleInfo, url: url });
                } else {
                    self.requestUrl({ ...scheduleInfo, url: url });
                }
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
            timeout: 2 * 60 * 1000 // Reduced from 10min to 2min to free sockets faster
        };
        if (['POST', 'PUT', 'PATCH'].indexOf(scheduleInfo.method) > -1 && scheduleInfo.body) {
            requestParams.json = true;
            requestParams.body = JSON.parse(scheduleInfo.body);
        }

        let logObj = new LogSchedule;
        let currentTime = new Date().getDateTime();
        logObj.merge({
            schedule_id: scheduleInfo.id,
            url: scheduleInfo.url,
            request: `+ ${scheduleInfo.url}<br />+ ${currentTime}`
        });
        await logObj.save();

        request(requestParams, (error, response, body) => {
            var responseCode = 500;
            if (response && response.statusCode) {
                responseCode = response.statusCode;
            }

            if (scheduleInfo.alert_enabled == 1) {
                if (error) {
                    EmailService.sendMail(scheduleInfo, responseCode, error);
                } else if (responseCode >= 400) {
                    EmailService.sendMail(scheduleInfo, responseCode, body);
                } else {
                    try {
                        var parseResult = typeof body === 'object' ? body : JSON.parse(body);
                        if (scheduleInfo.expected_status && parseResult.status && parseResult.status != scheduleInfo.expected_status) {
                            EmailService.sendMail(scheduleInfo, responseCode, body);
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            }

            this.writeLog(logObj, response, body, error);
        });
    }

    async requestUrlV2(scheduleInfo) {
        const url = new URL(scheduleInfo.url);
        let requestParams = {
            method: scheduleInfo.method || 'GET',
            url: `https://${scheduleInfo.ip_request}${url.pathname}${url.search}`,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 (MegaAds - Schedule)",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Content-Type": "application/json",
                "Host": url.hostname
            },
            // Reuse shared agent instead of creating new one per request (was leaking memory)
            httpsAgent: sharedHttpsAgent,
            maxRedirects: 5,
            timeout: 2 * 60 * 1000 // Reduced from 10min to 2min to free memory faster
        };
        if (['POST', 'PUT', 'PATCH'].indexOf(scheduleInfo.method) > -1 && scheduleInfo.body) {
            requestParams.data = scheduleInfo.body;
        }

        let logObj = new LogSchedule;
        let currentTime = new Date().getDateTime();
        logObj.merge({
            schedule_id: scheduleInfo.id,
            url: scheduleInfo.url,
            request: `+ ${scheduleInfo.url}<br />+ ${currentTime}`
        });
        await logObj.save();
        let response = null;
        let body = '';
        let error = null;
        try {
            response = await axios(requestParams);
            let responseCode = 500;
            if (response.status) {
                responseCode = response.status;
            }
            body = response.data;

            if (scheduleInfo.alert_enabled == 1) {
                if (responseCode >= 400) {
                    EmailService.sendMail(scheduleInfo, responseCode, body);
                } else if (scheduleInfo.expected_status && body.status && body.status != scheduleInfo.expected_status) {
                    EmailService.sendMail(scheduleInfo, responseCode, body);
                }
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
            if (scheduleInfo.alert_enabled == 1) {
                EmailService.sendMail(scheduleInfo, responseCode, body);
            }
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

        let statusCode = (response && response.statusCode) ? response.statusCode : null;
        logObj.status_code = statusCode;
        logObj.is_error = (err || (statusCode && statusCode >= 400)) ? 1 : 0;

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

        let statusCode = (response && response.status) ? response.status : null;
        logObj.status_code = statusCode;
        logObj.is_error = (err || (statusCode && statusCode >= 400)) ? 1 : 0;

        if (response && response.status) {
            content.push('+ Status: ' + response.status);
            let contentTypes = [];
            if (response.headers && response.headers['content-type']) {
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

        // Release references to allow GC to reclaim memory
        response = null;
        body = null;
        err = null;
    }

}

module.exports = new ScheduleService;
