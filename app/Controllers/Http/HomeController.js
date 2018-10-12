'use strict'

const Env = use('Env');

class HomeController {

    index({ response, session, view }) {
        var sessionToken = session.get('token');
        if(typeof(sessionToken) != 'undefined' && sessionToken != '' && sessionToken != null) {
            return response.route('schedule');
        }
        return view.render('welcome');
    }

    authenticate({ request, response, view, session }) {
        var sessionToken = session.get('token');
        if(typeof(sessionToken) != 'undefined' && sessionToken != '' && sessionToken != null) {
            return response.route('schedule');
        }

        var body = request.post();
        if (typeof (body['token']) != 'undefined' && body['token'] != '' && body['token'] != null) {
            if (Env.getOrFail('APP_TOKEN') === body['token']) {
                session.put('token', body['token']);
                response.route('schedule');
            }
        }
        return view.render('welcome', {status: 'Invalid token...'});
    }

}

module.exports = HomeController
