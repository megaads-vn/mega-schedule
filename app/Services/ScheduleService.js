'use strict'

const ScheduleData = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const EmailService = use('App/Services/EmailService');
const schedule = require('node-schedule');
const request = require('request');
const Ws = use('Ws');

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
            self.requestUrl(scheduleInfo);
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

}

module.exports = new ScheduleService;
