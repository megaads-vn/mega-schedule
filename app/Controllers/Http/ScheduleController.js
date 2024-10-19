'use strict'

const Schedule = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const BaseController = use('App/Controllers/Http/BaseController');
const ScheduleService = use('App/Services/ScheduleService');

class ScheduleController extends BaseController {

    index({ view }) {
        var data = {
            seconds: this.range(1, 60),
            minutes: this.range(1, 60),
            hours: this.range(1, 25),
            days: this.range(1, 32),
            months: this.range(1, 13),
        }
        return view.render('schedule.index', data);
    }

    async find({ request, response }) {
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
            queryCount = await queryCount.count('* as recordsCount');
            var recordsCount = (typeof (queryCount[0]['recordsCount']) != 'undefined') ? queryCount[0]['recordsCount'] : 0;
            var schedules = await query.forPage(pageId + 1, pageSize).orderBy('id', 'desc').fetch();
        }
        result.data = schedules;
        result.pageId = pageId;
        result.pagesCount = this.recordsCountToPagesCount(recordsCount, pageSize);

        response.json(result);
    }

    async create({ request, response }) {
        var schedule = new Schedule();
        response.json(this.buildData(request.all(), schedule, 'create'));
    }

    async update({ params, request, response }) {
        var result = this.getDefaultStatus();
        if (params.id && params.id != '') {
            var schedule = await Schedule.findOrFail(params.id);
            result = this.buildData(request.all(), schedule, 'update');
        }
        response.json(result);
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

    buildData(data, schedule, mode = 'create') {
        var result = this.getDefaultStatus();

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

            var status = schedule.save();
            status.then(function () {
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
            });

            if (status) {
                result = this.getSuccessStatus();
            }
        }
        return result;
    }

    buildFilterData(query, request) {
        let input = request.all();
        if (input.terms && input.terms != '') {
            query.where(function (query) {
                query.orWhere('note', 'LIKE', `%${input.terms}%`);
                query.orWhere('url', 'LIKE', `%${input.terms}%`);
            });
        }
        if (input.project_id && input.project_id != '') {
            query.where('project_id', '=', input.project_id);
        }
        if (input.status && input.status != '') {
            query.where('status', '=', input.status);
        }
        return query;
    }

    range(start, end) {
        return Array.from({length: (end - start)}, (v, k) => k + start);
    }
}

module.exports = ScheduleController
