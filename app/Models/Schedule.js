'use strict'

const Model = use('Model')

class Schedule extends Model {

    static get table () {
        return 'schedule';
    }

    static get primaryKey () {
        return 'id';
    }

    // logs () {
    //     return this.hasMany('App/Models/ScheduleLog')
    // }
}

module.exports = Schedule
