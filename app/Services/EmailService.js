'use strict'

const Mail = use('Mail');
const Config = use('Config');
const ScheduleData = use('App/Models/Schedule');

class EmailService {

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

module.exports = new EmailService