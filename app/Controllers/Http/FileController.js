'use strict'

const ExcelJS = require('exceljs');
const Helpers = use('Helpers');
const ScheduleService = use('App/Services/ScheduleService');
const Schedule = use('App/Models/Schedule');

class FileController {
    async upload({ request, response }) {
        let result = {};
        const excelFile = request.file('file', {
            types: ['xlsx', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            size: '10mb'
        })
        await excelFile.move(Helpers.tmpPath('uploads'), {
            name: 'uploadedFile.xlsx',
            overwrite: true
        })
        if (!excelFile.moved()) {
            let error = excelFile.error();
            result = {
                status: 'failed',
                message: error.message
            }
        } else {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(Helpers.tmpPath('uploads/uploadedFile.xlsx'));
            let data = [];
            const worksheet = workbook.getWorksheet(1);
            worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
                let rowData = {};
                row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                    rowData[colNumber] = cell.value;
                });
                data.push(rowData);
            });
            let headerData = data.shift();
            let isValidHeader = this.validateHeaderExcel(headerData);
            if (isValidHeader) {
                data.forEach((item, index) => {
                    let schedule = new Schedule();
                    schedule.note = item["1"];
                    schedule.url = item["2"];
                    schedule.run_at = item["3"];
                    schedule.project_id = item["4"];
                    schedule.method = item["5"];
                    schedule.body = item["6"];
                    schedule.status = item["7"];
                    schedule.ip_request = item["8"];
                    let status = schedule.save();
                    status.then(function () {
                        let scheduleObj = schedule.toJSON();
                        ScheduleService.create(scheduleObj);
                    });
                });
                result = {
                    status: 'successful',
                    message: 'Import file success'
                }
            } else {
                result = {
                    status: 'failed',
                    message: 'Header not valid'
                }
            }
        }

        response.send(result);
    }

    validateHeaderExcel(headerData) {
        let result = false;
        if (headerData["1"] == 'note' && headerData["2"] == 'url' && headerData["3"] == 'run_at' && headerData["4"] == 'project_id'
            && headerData["5"] == 'method' && headerData["6"] == 'body' && headerData["7"] == 'status' && headerData["8"] == 'ip_request') {
            result = true;
        }

        return result;
    }
}

module.exports = FileController
