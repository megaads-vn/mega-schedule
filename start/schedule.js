'use strict'

const ScheduleData = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const schedule = require('node-schedule');
const request = require('request');
const Ws = use('Ws');
const Logger = use('Logger');
const Mail = use('Mail');
const Config = use('Config');
global.globalSchedule = {}; global.scheduleRun = [];

class Schedule {

    async run() {
        var data = await ScheduleData.all();
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
        
        console.log("globalSchedule", globalSchedule);
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

    requestUrl(scheduleId, url) {
        var self = this;
        var requestParams = {
            uri: url,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36",
              "Cache-Control": "no-cache, no-store, must-revalidate"
            },
            maxRedirects: 5,
            timeout: 10 * 60 * 1000
        };
        request(requestParams, function (error, response, body) {
            let responseCode = 500;
            if (typeof response != "undefined" && typeof response.statusCode != "undefined") {
                responseCode = response.statusCode;
            }
            if (error) {
                Logger.info('Request Error', {
                    time: new Date(),
                    scheduleId: scheduleId,
                    url: url,
                    error: error
                });
                self.sendMail(scheduleId, responseCode, error);
            }
            try {
                var parseResult = JSON.parse(body);
                if (responseCode != 200 || (typeof parseResult.status != "undefined" && parseResult.status == "fail")) {
                    self.sendMail(scheduleId, responseCode, body);
                }
            } catch(err) {
                
            }
            self.writeLog(scheduleId, response, body, error);
        });
    }

    writeLog(scheduleId, response, body, err) {
        if(typeof(response) != 'undefined' && response != null) {
            if(typeof(response.statusCode) != 'undefined' && response.statusCode != '' && response.statusCode != null) {
                var content = '+ Status: ' + response.statusCode;
            } else {
                var content = '';
            }
            var contentTypes = response.headers['content-type'].split(';');
            if (contentTypes.indexOf('application/json') > -1) {
                content += '<br />+ Body: ' + body;
            }

            if (err) {
                content += '<br />+ Error: ' + err;
            }
            const logObj = new LogSchedule();
            logObj.schedule_id = scheduleId;
            logObj.log = content;
            logObj.save();
        }

    }

    async sendMail(scheduleId, statusCode, body) {
        if (Config.get('mail.send') === "on") {
            var currentTime = new Date();
            var scheduleInfo = await ScheduleData.find(scheduleId);
            if(scheduleInfo.last_time) {
                var lastTime = new Date(scheduleInfo.last_time);
            }
            if (scheduleInfo.last_time == null || currentTime.getTime() >= lastTime.getTime() + 60 * 60 * 1000) {
                let htmlTeplate = "<ul>";
                htmlTeplate += `<li>URL: ${scheduleInfo.url}</li>`;
                htmlTeplate += `<li>Note: ${scheduleInfo.note}</li>`;
                htmlTeplate += `<li>Status Code: ${statusCode}</li>`;
                htmlTeplate += `<li>Body: ${body}</li>`;
                htmlTeplate += "</ul>";
                scheduleInfo.last_time = currentTime.getDateTime();
                scheduleInfo.save();
                var result = await Mail.raw(htmlTeplate, (message) => {
                    let receivers = Config.get('mail.receivers');
                    receivers.forEach((item) => {
                        message.to(item.email, item.name);
                    });
                    message.from('no-reply@monitor.megaads.vn', 'Mega Schedule').subject('Request Error - Mega Schedule')
                }).catch(error => {
                    Logger.info('Sent Mail', error);
                });
                return result;
            }
        }
    }

}

module.exports = new Schedule;
