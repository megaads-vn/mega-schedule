'use strict'

const Mail = use('Mail');
const ScheduleData = use('App/Models/Schedule');

class EmailService {

    async sendMail(scheduleId, statusCode, body) {
        let scheduleInfo = await ScheduleData.find(scheduleId);
        if (scheduleInfo.emails && scheduleInfo.emails != '') {
            let htmlTeplate = `
                <ul style="padding-left: 0px">
                    <li>URL: ${scheduleInfo.url}</li>
                    <li>Note: ${scheduleInfo.note}</li>
                    <li>Status Code: ${statusCode}</li>
                    <li>Body: ${body}</li>
                </ul>`;

            scheduleInfo.last_time = new Date().getDateTime();
            await scheduleInfo.save();

            let result = await Mail.raw(htmlTeplate, (message) => {
                let receivers = scheduleInfo.emails.split(',').map(item => { 
                    return {
                        email: item.trim(), 
                        name: 'Notifications'
                    };
                });
                receivers.forEach(item => {
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

module.exports = new EmailService