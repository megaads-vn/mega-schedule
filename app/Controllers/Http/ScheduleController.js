'use strict'

const Schedule = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const BaseController = use('App/Controllers/Http/BaseController');
const ScheduleService = use('App/Services/ScheduleService');
const Common = use('App/Helpers/Common');
const Logging = use('App/Models/Logging');
const Database = use('Database');

class ScheduleController extends BaseController {
    
    token = null;
    tmpOldScheduleData = null;

    async index({ view, response, session, auth }) {
        var data = {
            seconds: this.range(1, 60),
            minutes: this.range(1, 60),
            hours: this.range(1, 25),
            days: this.range(1, 32),
            months: this.range(1, 13),
        };

        return view.render('schedule.index', data);
    }

    async find({ request, response, session }) {
        var result = this.getSuccessStatus();
        var pageId = parseInt(request.input('pageId', 0));
        var pageSize = parseInt(request.input('pageSize', 30));

        var id = request.input('id');
        if (id && id != '') {
            var schedules = await Schedule.findOrFail(id);
            var recordsCount = 1;
        } else {
            var query = this.buildFilterData(Schedule.query(), request);
            var queryCount = this.buildFilterData(Schedule.query(), request);
            queryCount = await queryCount.clearSelect().count('* as recordsCount');
            var recordsCount = (typeof (queryCount[0]['recordsCount']) != 'undefined') ? queryCount[0]['recordsCount'] : 0;
            var schedules = await query.forPage(pageId + 1, pageSize).orderBy('s.id', 'desc').fetch();
        }
        result.data = schedules;
        result.pageId = pageId;
        result.pagesCount = this.recordsCountToPagesCount(recordsCount, pageSize);

        response.json(result);
    }

    // Statistics of failed runs within a recent time window. Drives the dashboard
    // panel and the per-schedule error badges on the list page.
    async stats({ request, response }) {
        let result = this.getDefaultStatus();
        let statusCode = 200;
        try {
            let hours = parseInt(request.input('hours', 24));
            if (isNaN(hours) || hours <= 0) {
                hours = 24;
            }
            const since = this.formatDateTime(new Date(Date.now() - hours * 60 * 60 * 1000));

            const rows = await Database.table('log_schedule')
                .where('is_error', 1)
                .where('created_at', '>=', since)
                .select('schedule_id')
                .count('* as cnt')
                .groupBy('schedule_id');

            let errorsBySchedule = {};
            let totalErrors = 0;
            rows.forEach((row) => {
                const count = parseInt(row.cnt) || 0;
                errorsBySchedule[row.schedule_id] = count;
                totalErrors += count;
            });

            // Failed links ranked by how many times each one failed in the window.
            const linkRows = await Database.table('log_schedule')
                .where('is_error', 1)
                .where('created_at', '>=', since)
                .whereNotNull('url')
                .where('url', '!=', '')
                .select('url')
                .max('schedule_id as schedule_id')
                .max('status_code as last_status_code')
                .count('* as cnt')
                .groupBy('url')
                .orderBy('cnt', 'desc')
                .limit(100);

            const failedLinks = linkRows.map((row) => {
                return {
                    url: row.url,
                    schedule_id: row.schedule_id,
                    last_status_code: row.last_status_code,
                    error_count: parseInt(row.cnt) || 0
                };
            });

            result = this.getSuccessStatus();
            result.data = {
                window_hours: hours,
                total_errors: totalErrors,
                failing_schedules: rows.length,
                errors_by_schedule: errorsBySchedule,
                failed_links: failedLinks
            };
        } catch (err) {
            console.error('SCHEDULE_STATS_ERROR:', err.message);
            result.message = 'Has error when building statistics';
            statusCode = 500;
        }
        return response.status(statusCode).json(result);
    }

    async create({ request, response, session }) {
        let res  = {
            status: 'fail'
        };
        let statusCode = 200;
        try {
            this.token = session.get('token');
            let insertData = this.buildData(request.all(), new Schedule);
            const createResult = await this.insertOrUpdateSchedule(insertData);
            
            if (createResult) {
                res = {
                    status: 'successful',
                    message: 'Create schedule successfuly!'
                };
            }
        } catch (err) {
            const errId = new Date().getTime();
            res.message = `Has an error when create schedule! \n<strong>Error code ${errId}</strong>`;
            res.error = err.message;
            console.error(`[${errId}]`, err.message);
            console.error(`[${errId}]`, err);
            statusCode = 500;
        }
        return response.status(statusCode).json(res)
    }

    async update({ params, request, response, session }) {
        let res = {
            status: 'fail'
        };
        let statusCode = 200;
        try {
            if (!params.id || typeof params.id === 'undefined') {
                throw "Missing parameter(s). Please check again";
            }
            if (params.id && params.id != '') {
                var schedule = await Schedule.findOrFail(params.id);
                this.token = session.get('token');
                this.tmpOldScheduleData = JSON.parse(JSON.stringify(schedule))
                const updateData = this.buildData(request.all(), schedule);
                const hasChanged = this.hasDataChanged(this.tmpOldScheduleData, updateData.toJSON());
                if (!hasChanged) {
                    res = {
                        'status': 'successful',
                        'message': 'No data changed.'
                    };
                } else {
                    const result = await this.insertOrUpdateSchedule(updateData, 'update');
                    if (result) {
                        res = {
                            status: 'successful',
                            message: 'Update schedule succeed'
                        };
                    }
                }
            } 

        } catch (err) {
            const errId = new Date().getTime();
            res.message = `Has an error when update schedule!\n <strong>Error code ${errId}</strong>`;
            res.error = err.message;
            console.error(`[${errId}]`, err.message);
            console.error(`[${errId}]`, err);
            statusCode = 500;
        }
        
        return response.status(statusCode).json(res);
    }

    async delete({ params, response }) {
        var result = this.getDefaultStatus();
        if (params.id && params.id != '') {
            var schedule = await Schedule.findOrFail(params.id);
            ScheduleService.delete(params.id);
            var status = schedule.delete();
            if (status) {
                var log = await LogSchedule.query().where('schedule_id', params.id).delete();
                result = this.getSuccessStatus();
            }
        }
        response.json(result);
    }
    async requestNow({ params, response }) {
        var result = this.getDefaultStatus();
        if (params.id && params.id != '') {
           result = await ScheduleService.runNow(params.id);
        }
        response.json(result);
    }

    async history({ params, request, response }) {
        var result = this.getDefaultStatus();
        if(params.id && params.id != '') {
            var logs = await LogSchedule.query()
                                        .where('schedule_id', params.id)
                                        .limit(parseInt(request.input('limit', 10)))
                                        .offset(parseInt(request.input('offset', 0)))
                                        .orderBy('id', 'desc')
                                        .fetch();

            result = this.getSuccessStatus();
            result.data = logs;
        }
        response.json(result);
    }

    async changeStatus({ request, response }) {
        let result = this.getDefaultStatus();
        let statusCode = 200;
        try {
            const data = request.all();
            if (data.ids && data.ids != '' && data.status && data.status != '') {
                await Schedule.query().whereIn('id', data.ids).update({ status: data.status });
                result = this.getSuccessStatus();
                if (data.status == 'active') {
                    let schedules = await Schedule.query().whereIn('id', data.ids).fetch();
                    schedules = schedules.toJSON();
                    schedules.forEach(schedule => {
                        ScheduleService.create(schedule);
                    });
                } else {
                    let schedules = await Schedule.query().whereIn('id', data.ids).fetch();
                    schedules = schedules.toJSON();
                    schedules.forEach(schedule => {
                        ScheduleService.delete(schedule.id);
                    });
                }
            } else {
                result.message = 'Invalid data';
                statusCode = 400;
            }
        } catch (e) {
            console.error(e);
            result.message = 'Has error when change status';
            statusCode = 500;
        }
        return response.status(statusCode).json(result);
    }

    buildData(data, schedule) {
        if (data.url && data.url != '' && data.time && data.time != '') {
            schedule.url = data.url;
            schedule.run_at = data.time;

            if (data.project_id && data.project_id != '') {
                schedule.project_id = data.project_id;
            }

            if (data.status && data.status != '') {
                schedule.status = data.status;
            }

            if (typeof data.note != "undefined") {
                schedule.note = data.note;
            }

            if (typeof data.emails != "undefined") {
                schedule.emails = data.emails;
            }

            if (data.customTime && data.customTime != '') {
                schedule.custom_time = data.customTime;
            }

            if (data.method && data.method != '') {
                schedule.method = data.method;
            }
            if (typeof data.body != "undefined") {
                schedule.body = data.body;
            }
            if (typeof data.ip_request != "undefined") {
                schedule.ip_request = data.ip_request;
            }
            if (typeof data.alert_enabled != "undefined") {
                schedule.alert_enabled = data.alert_enabled ? 1 : 0;
            }
            if (typeof data.expected_status != "undefined") {
                schedule.expected_status = data.expected_status;
            }
        }
        return schedule;
    }

    async insertOrUpdateSchedule(schedule, mode = 'create') {
        let status = false;
        try {
            let userId = null;
            if (mode == 'create') {
                const user = await Common.findUserByToken(this.token);
                if (user) {
                    userId = user.id;
                    schedule.created_by = user.id;
                }
            } else {
                const user = await Common.findUserByToken(this.token);
                if (user) {
                    userId = user.id;
                    schedule.updated_by = user.id;
                }
            }
            
            status = await schedule.save();
            const loggingData = {
                old: this.tmpOldScheduleData ? this.tmpOldScheduleData : {},
                new: schedule.toJSON()
            };
            await this.saveLogging(userId, schedule.id, `schedule_${mode}`, loggingData)
            
            let scheduleObj = schedule.toJSON();
            if (schedule.status == 'active') {
                if (mode === 'create') {
                    ScheduleService.create(scheduleObj);        
                } else {
                    ScheduleService.update(scheduleObj);        
                }
            } else {
                ScheduleService.delete(scheduleObj.id);
            }
            
        } catch (err) {
            throw err;
        }
        return status;
    }

    buildFilterData(query, request) {
        let input = request.all();
        query.from('schedule as s')
        query.leftJoin('users as c', 'c.id', '=', 's.created_by' );
        query.leftJoin('users as u', 'u.id', '=', 's.updated_by' );
        query.select('s.*', 'c.name as creator_name','u.name as updator_name');
        if (input.terms && input.terms != '') {
            query.where(function (query) {
                query.orWhere('s.note', 'LIKE', `%${input.terms}%`);
                query.orWhere('s.url', 'LIKE', `%${input.terms}%`);
            });
        }
        if (input.project_id && input.project_id != '') {
            query.where('s.project_id', '=', input.project_id);
        }
        if (input.status && input.status != '') {
            query.where('s.status', '=', input.status);
        }
        return query;
    }

    range(start, end) {
        return Array.from({length: (end - start)}, (v, k) => k + start);
    }

    // Format a Date as 'YYYY-MM-DD HH:mm:ss' to match how log_schedule.created_at
    // is stored, so range comparisons work. (The global Date#getDateTime helper
    // always returns the current time, so it can't be used for an arbitrary date.)
    formatDateTime(date) {
        const pad = (n) => (n < 10 ? '0' : '') + n;
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
            + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    async saveLogging(userId, targetId, action, data) {
        try {
            const logging = new Logging;
            logging.action = action;
            logging.user_id = userId;
            logging.target_id = targetId;
            logging.data = JSON.stringify(data);
            logging.created_at = new Date().getTime();
            await logging.save();
        } catch (err) {
            throw err;
        }
    }

    hasDataChanged(oldData, newData) {
        let retVal = false
        try {
            const oldKeys = Object.keys(newData) // chỉ check các field bạn update
            for (const key of oldKeys) {
                if (oldData[key] !== newData[key]) {
                    retVal = true;
                    break;
                }
            }
        } catch (err) {
            throw err;
        }
        return retVal;
    }
}

module.exports = ScheduleController
