'use strict'

const Schema = use('Schema')

class AddLogUrlSchema extends Schema {
  up() {
    this.table('log_schedule', (table) => {
      // The exact link requested in this run (a schedule can hold many URLs),
      // stored separately so failed links can be grouped/counted reliably.
      table.text('url').nullable().after('schedule_id')
    })
  }

  down() {
    this.table('log_schedule', (table) => {
      table.dropColumn('url')
    })
  }
}

module.exports = AddLogUrlSchema
