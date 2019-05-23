'use strict'

const Model = use('Model')

class Schedule extends Model {

    static get table () {
        return 'schedule';
    }

    static get primaryKey () {
        return 'id';
    }

    static get createdAtColumn () {
        return 'created_at';
    }

    static get updatedAtColumn () {
        return 'updated_at';
    }

    static get hidden () {
        return [];
    }

    static get visible () {
        return ['id', 'note', 'url', 'run_at', 'custom_time', 'created_at', 'updated_at'];
    }

    // logs () {
    //     return this.hasMany('App/Models/ScheduleLog')
    // }
}

module.exports = Schedule
