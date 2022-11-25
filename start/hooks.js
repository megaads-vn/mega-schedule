const { hooks } = require('@adonisjs/ignitor')

hooks.after.providersBooted(() => {
  const ScheduleService = use('App/Services/ScheduleService');
  ScheduleService.run();
})