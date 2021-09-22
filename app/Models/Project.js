'use strict'

const Model = use('Model')

class Project extends Model {

    static get table () {
        return 'projects';
    }

    static get primaryKey () {
        return 'id';
    }

}

module.exports = Project
