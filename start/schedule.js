'use strict'

const ScheduleData = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const EmailService = use('App/Services/EmailService');
const schedule = require('node-schedule');
const request = require('request');
const Ws = use('Ws');
global.globalSchedule = {}; global.scheduleRun = [];

class Schedule {

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
                runLink: scheduleInfo.url
            });
            var socket = Ws.getChannel('activitySchedule').topic('activitySchedule');
            if(socket) {
                socket.broadcast('scheduleRun', scheduleRun);
            }
            self.requestUrl(scheduleInfo.id, scheduleInfo.url);
        }.bind(null, scheduleInfo));
    }

    async requestUrl(scheduleId, url) {
        let requestParams = {
            uri: url,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36 - Schedule",
              "Cache-Control": "no-cache, no-store, must-revalidate"
            },
            rejectUnauthorized: false,
            maxRedirects: 5,
            timeout: 10 * 60 * 1000
        };

        let logObj = new LogSchedule;
        let currentTime = new Date().getDateTime();
        logObj.merge({
            schedule_id: scheduleId,
            request: '+ Time: ' + currentTime
        });
        await logObj.save();

        request(requestParams, (error, response, body) => {
            var responseCode = 500;
            if (response && response.statusCode) {
                responseCode = response.statusCode;
            }
            if (error) {
                EmailService.sendMail(scheduleId, responseCode, error);
            }
            try {
                var parseResult = JSON.parse(body);
                if (responseCode != 200 || (parseResult.status && parseResult.status == "fail")) {
                    EmailService.sendMail(scheduleId, responseCode, body);
                }
            } catch(err) {}
            
            this.writeLog(logObj, response, body, error);
        });
    }

    writeLog(logObj, response, body, err) {
        let currentTime = new Date().getDateTime();
        let content = '+ Time: ' + currentTime;
        
        if (response && response.statusCode) {
            content += '<br />+ Status: ' + response.statusCode;
            let contentTypes = response.headers['content-type'].split(';');
            if (contentTypes.indexOf('application/json') > -1) {
                content += '<br />+ Body: ' + body;
            }
        }

        if (err) {
            content += '<br />+ Error: ' + err;
        }

        logObj.response = content;
        logObj.save();
    }

}

module.exports = new Schedule;
