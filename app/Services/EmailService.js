'use strict'

const Mail = use('Mail');
const Config = use('Config');
const ScheduleData = use('App/Models/Schedule');

class EmailService {

    async sendMail(scheduleId, statusCode, body) {
        var currentTime = new Date();
        var scheduleInfo = await ScheduleData.find(scheduleId);
        if(scheduleInfo.last_time) {
            var lastTime = new Date(scheduleInfo.last_time);
        }
        if ((scheduleInfo.emails && scheduleInfo.emails != '') || Config.get('mail.send') === "on") {
            if (!scheduleInfo.last_time || currentTime.getTime() >= lastTime.getTime() + 60 * 60 * 1000) {
                let htmlTeplate = `<ul style="padding-left: 0px">`;
                htmlTeplate += `<li>URL: ${scheduleInfo.url}</li>`;
                htmlTeplate += `<li>Note: ${scheduleInfo.note}</li>`;
                htmlTeplate += `<li>Status Code: ${statusCode}</li>`;
                htmlTeplate += `<li>Body: ${body}</li>`;
                htmlTeplate += "</ul>";
                scheduleInfo.last_time = currentTime.getDateTime();
                await scheduleInfo.save();

                var result = await Mail.raw(htmlTeplate, (message) => {
                    let receivers = [];
                    if (scheduleInfo.emails && scheduleInfo.emails != '') {
                        receivers = scheduleInfo.emails.split(',').map(function (item) { return {email: item.trim(), name: 'Notifications'} });
                    } else {
                        receivers = Config.get('mail.receivers');
                    }
                    receivers.forEach((item) => {
                        message.to(item.email, item.name);
                    });
                    message.from('no-reply@monitor.megaads.vn', 'Mega Schedule').subject('Request Error - Mega Schedule')
                }).catch(error => {
                    console.error(error);
                });
                return result;
            }
        }
        
    }

}

module.exports = new EmailService