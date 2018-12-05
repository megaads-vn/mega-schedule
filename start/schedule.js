'use strict'

const ScheduleData = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const schedule = require('node-schedule');
const request = require('request');
// const Ws = use('Ws');

global.globalSchedule = [];

class Schedule {

    async run() {
        var data = await ScheduleData.all();
        this.init(data.toJSON());
    }

    init(data) {
        var self = this;
        data.forEach(function (scheduleInfo) {
            self.create(scheduleInfo);
        });
    }

    delete(scheduleId) {
        if (typeof (globalSchedule[scheduleId]) != 'undefined') {
            globalSchedule[scheduleId].cancel();
        }
    }

    update(scheduleInfo) {
        if(typeof(scheduleInfo.id) != "undefined" && typeof(globalSchedule[scheduleInfo.id]) != 'undefined') {
            globalSchedule[scheduleInfo.id].cancel();
        }
        this.create(scheduleInfo);
    }

    create(scheduleInfo) {
        var self = this;
        var runAt = scheduleInfo.run_at.trim().replace(/\s\s+/g, ' ');
        globalSchedule[scheduleInfo.id] = schedule.scheduleJob(runAt, function (scheduleInfo) {
            console.log("Run: " + scheduleInfo.url);
            // Ws.channel('activitySchedule', ({ socket }) => {
            //     socket.emit('activitySchedule', scheduleInfo);
            // });
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
            maxRedirects: 5
        };
        request(requestParams, function (error, response, body) {
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
                content += '<br >+ Error: ' + err;
            }
            const logObj = new LogSchedule();
            logObj.schedule_id = scheduleId;
            logObj.log = content;
            logObj.save();
        }

    }

}

module.exports = new Schedule;