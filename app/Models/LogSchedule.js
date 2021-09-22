'use strict'

const Model = use('Model')

class LogSchedule extends Model {

    static get table () {
        return 'log_schedule';
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
        return ['id', 'schedule_id', 'request', 'response', 'created_at', 'updated_at'];
    }
}

module.exports = LogSchedule
