'use strict'

const Schedule = use('App/Models/Schedule');
const LogSchedule = use('App/Models/LogSchedule');
const BaseController = use('App/Controllers/Http/BaseController');
const scheduleRunning = require('../../../start/schedule');

class ScheduleController extends BaseController {

    index({ view }) {
        var data = {
            seconds: this.range(1, 60),
            minutes: this.range(1, 60),
            hours: this.range(1, 25),
            days: this.range(1, 32),
            months: this.range(1, 13),
        }
        return view.render('list', data);
    }

    async find({ request, response }) {
        var result = this.getSuccessStatus();
        var pageId = parseInt(request.input('pageId', 0));
        var pageSize = parseInt(request.input('pageSize', 30));
        var id = request.input('id');
        if(typeof(id) != 'undefined' && id != '' && id != null) {
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
        if (typeof (params.id) != 'undefined' && params.id != '' && params.id != null) {
            var schedule = await Schedule.findOrFail(params.id);
            result = this.buildData(request.all(), schedule, 'update');
        }
        response.json(result);
    }

    async delete({ params, response }) {
        var result = this.getDefaultStatus();
        if(typeof(params.id) != 'undefined' && params.id != '' && params.id != null) {
            var schedule = await Schedule.findOrFail(params.id);
            scheduleRunning.delete(params.id);
            var status = schedule.delete();
            if (status) {
                var log = await LogSchedule.query().where('schedule_id', params.id).delete();
                result = this.getSuccessStatus();
            }
        }
        response.json(result);
    }

    async history({ params, response }) {
        var result = this.getDefaultStatus();
        if(typeof(params.id) != 'undefined' && params.id != '' && params.id != null) {
            var logs = await LogSchedule.query().where('schedule_id', params.id).limit(10).orderBy('id', 'desc');
            result = this.getSuccessStatus();
            result.data = logs;
        }
        response.json(result);
    }

    buildData(data, schedule, mode = 'create') {
        var result = this.getDefaultStatus();

        if (typeof (data.url) != 'undefined' && data.url != '' && data.url != null && typeof (data.time) != 'undefined' && data.time != '' && data.time != null) {
            var urlOld = schedule.url;
            var timeOld = schedule.run_at;
            schedule.url = data.url;
            schedule.run_at = data.time;

            if(typeof(data.note) != 'undefined' && data.note != '' && data.note != null) {
                schedule.note = data.note;
            }

            var status = schedule.save();
            status.then(function () {
                if (mode === 'create') {
                    scheduleRunning.create(schedule.toJSON());
                } else if (urlOld != data.url || timeOld != data.time) {
                    scheduleRunning.update(schedule.toJSON());
                }
            })

            if (status) {
                result = this.getSuccessStatus();
            }
        }
        return result;
    }

    buildFilterData(query, request) {
        if(typeof(request.input('note')) != 'undefined' && request.input('note') != '' && request.input('note') != null) {
            query.where('note', 'LIKE', '%' + request.input('note') + '%');
        }
        if(typeof(request.input('link')) != 'undefined' && request.input('link') != '' && request.input('link') != null) {
            query.where('url', 'LIKE', '%' + request.input('link') + '%');
        }
        return query;
    }

    range(start, end) {
        return Array.from({length: (end - start)}, (v, k) => k + start);
    }
}

module.exports = ScheduleController
