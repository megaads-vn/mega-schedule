'use strict'

const Mail = use('Mail');

class EmailService {

    async sendMail(scheduleInfo, statusCode, body) {

        if (scheduleInfo.emails && scheduleInfo.emails != '') {
            let bodyStr = typeof body === 'object' ? JSON.stringify(body) : body;
            let expectedStatusInfo = '';
            if (scheduleInfo.expected_status) {
                let actualStatus = '';
                try {
                    let parsed = typeof body === 'object' ? body : JSON.parse(body);
                    actualStatus = parsed.status || 'N/A';
                } catch (e) {
                    actualStatus = 'N/A';
                }
                expectedStatusInfo = `<li>Expected Status: ${scheduleInfo.expected_status}</li>
                    <li>Actual Status: ${actualStatus}</li>`;
            }
            let htmlTeplate = `
                <ul style="padding-left: 0px">
                    <li>URL: ${scheduleInfo.url}</li>
                    <li>Note: ${scheduleInfo.note}</li>
                    <li>Status Code: ${statusCode}</li>
                    ${expectedStatusInfo}
                    <li>Body: ${bodyStr}</li>
                </ul>`;

            scheduleInfo.last_time = new Date().getDateTime();
            try {
                const ScheduleData = use('App/Models/Schedule');
                const scheduleRecord = await ScheduleData.find(scheduleInfo.id);
                if (scheduleRecord) {
                    scheduleRecord.last_time = scheduleInfo.last_time;
                    await scheduleRecord.save();
                }
            } catch (e) {
                console.error('Failed to update last_time:', e);
            }

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