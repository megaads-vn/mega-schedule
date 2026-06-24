'use strict'

const Schema = use('Schema')

class AddLogStatusSchema extends Schema {
  up() {
    this.table('log_schedule', (table) => {
      // HTTP status code of the run (null when the request never completed)
      table.integer('status_code').nullable().after('response')
      // 1 when the run failed (network error or status >= 400), used for statistics
      table.tinyint('is_error').defaultTo(0).after('status_code')
      table.index(['is_error', 'created_at'], 'log_schedule_is_error_created_at_idx')
    })
  }

  down() {
    this.table('log_schedule', (table) => {
      table.dropIndex(['is_error', 'created_at'], 'log_schedule_is_error_created_at_idx')
      table.dropColumn('status_code')
      table.dropColumn('is_error')
    })
  }
}

module.exports = AddLogStatusSchema
