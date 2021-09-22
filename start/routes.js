'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {import('@adonisjs/framework/src/Route/Manager'} */
const Route = use('Route')

Route.get('/', 'HomeController.index').as('home');
Route.post('/authenticate', 'HomeController.authenticate').as('authenticate');
Route.get('/schedule', 'ScheduleController.index').as('listSchedule').middleware(['token']);

Route.group(() => {
    Route.get('schedule/find', 'ScheduleController.find').as('findSchedule');
    Route.post('schedule/create', 'ScheduleController.create').as('createSchedule');
    Route.patch('schedule/update/:id', 'ScheduleController.update').as('updateSchedule');
    Route.delete('schedule/delete/:id', 'ScheduleController.delete').as('deleteSchedule');
    Route.get('schedule/history/:id', 'ScheduleController.history').as('historySchedule');

    Route.get('project/find', 'ProjectController.find').as('findProject');
    Route.post('project/create', 'ProjectController.create').as('findProject');
    Route.patch('project/update/:id', 'ProjectController.update').as('findProject');
    Route.delete('project/delete/:id', 'ProjectController.delete').as('findProject');

}).prefix('service').middleware(['token']);