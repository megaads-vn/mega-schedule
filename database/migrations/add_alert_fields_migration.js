'use strict'

const Schema = use('Schema')

class AddAlertFieldsSchema extends Schema {
  up() {
    this.table('schedule', (table) => {
      table.tinyint('alert_enabled').defaultTo(0).after('emails')
      table.string('expected_status', 100).nullable().after('alert_enabled')
    })
  }

  down() {
    this.table('schedule', (table) => {
      table.dropColumn('alert_enabled')
      table.dropColumn('expected_status')
    })
  }
}

module.exports = AddAlertFieldsSchema
