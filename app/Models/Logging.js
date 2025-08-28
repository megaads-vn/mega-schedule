'use strict'

const Model = use('Model')

class Logging extends Model {
    
    static get table() {
        return 'logging'
    }

    static get primaryKey () {
        return 'id';
    }

    static get createdAtColumn () {
        return 'created_at';
    }

    static get updatedAtColumn () {
        return null;
    }

    // static get hidden () {
    //     return [];
    // }

    // static get visible () {
    //     return ['id', 'user_id', 'target_id', 'action', 'data', 'created_at'];
    // }
}

module.exports = Logging