'use strict'

const http = require("http");
const { find } = require("../../Models/User");

const Env = use('Env');
const Config = use('Config');
const User = use('App/Models/User');

class HomeController {

    index({ response, session, view }) {
        var sessionToken = session.get('token');
        var sso = Config.get('sso');
        if (sso.active) {
            var userSession = session.get('user');
            if (!userSession) {
                const redirectUrl = `${sso.login_url}?continue=${sso.callback_url}`
                return response.redirect(redirectUrl);
            } else {
                return response.route('schedule');
            }
        } else if(typeof(sessionToken) != 'undefined' && sessionToken != '' && sessionToken != null) {
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

    async ssoCallback({request, response, view, session}) {
        const token = request.input('token');
        const isAutoCreateUser = Config.get('sso.auto_create_user');
        let result  = await this.ssoGetUser(token)
        result = JSON.parse(result);
        if (result.status === 'success') {
            const ssoUser = result.user
            const findUser = await User.query().where('email', ssoUser.email).first();
            if (!findUser) {
                if (isAutoCreateUser) {
                    let newUser = new User()
                    newUser.name = ssoUser.full_name
                    newUser.email = ssoUser.email
                    newUser.status = 'active'
                    await newUser.save()
                    response.redirect('/schedule');
                } else {
                    response.send('Unauthorized')
                }
            } else {
                session.put('user', JSON.stringify(findUser));
                response.redirect('/schedule')
            }
        } else {
            response.send('Unauthorized')
        }
    }

    async ssoGetUser(token) {
        const authUrl = Config.get('sso.auth_url');
        const appId = Config.get('sso.app_id');
        return new Promise(function (resolve, reject) {
            http.get(`${authUrl}?token=${token}&app_id=${appId}`,
                (res) => {

                    res.on('data', (d) => {
                        let user = d.toString();
                        resolve(user);
                    });

                }).on('error', (e) => {
                    console.log("Error callback");
                });
        });
    }

    async ssoPostback({request, response, session}) {
        let retval = {
            status: 'fail',
        }
        const email = request.input('email', '')
        const active = request.input('active', '')
        if (email !== '' && active !== '') {
            const findUser = await User.query()
                                    .whereRaw("replace(`email`, '.', '') = replace('" + email + "', '.', '')")
                                    .first()
            if (!findUser) {
                retval.message = 'Account doesn\'t exists'
                if (!active) {
                    retval.status = 'successful'
                    retval.msg = 'Account doesn\'t exists'
                } else {
                    let newUser = new User();
                    newUser.name = request.input('full_name')
                    newUser.email = request.input('email')
                    newUser.status = 'active'
                    await newUser.save()
                    retval.status = 'successful'
                    retval.msg = `Account created successfully with email ${email}`
                }
            } else {
                let updateStatus = 'active'
                if (!active) {
                    updateStatus = 'deactive'
                    session.forget('user')
                }
                await User.query()
                        .where('id', findUser.id)
                        .update({status: updateStatus})

                retval.status = 'successful'
                retval.msg = `Update user's status to ${updateStatus}`
            }
        } else {
            retval.msg = 'Invalid params';
        }
        return response.json(retval)
    }

}

module.exports = HomeController
