'use strict'

const axios = require('axios');
const Env = use('Env');
const Config = use('Config');
const Request = use('Request');
const User = use('App/Models/User');

class HomeController {

    constructor() {
        this.ssoConfig = Config.get('app.sso');
    }

    index({ response, session, view, request }) {
        
        const userToken = session.get('token');
        if (this.ssoConfig.enable == 'true' && (typeof userToken == 'undefined' || !userToken)) {
            return response.route('ssoLogin');
        } else if (this.ssoConfig.enable == 'true' && typeof userToken != 'undefined' && userToken !== '') {
            console.log('previous= ', request.header('Referer'));
            return response.route('listSchedule');
        } else if (this.ssoConfig.enable == 'false') {
            if(typeof(userToken) != 'undefined' && userToken != '' && userToken != null) {
                return response.route('schedule');
            }
            return view.render('welcome');
        } else {
            return response.status(401).send( 'Unauthorized');
        }
    }

    ssoLogin({ response, session, request}) {
        const previousUrl = request.header('Referer');
        const redirectUrl = `${this.ssoConfig.login_url}?continue=${this.ssoConfig.callback_url}`;
        const token = session.get('token');
        if (!token) {
            return response.redirect(redirectUrl);
        } else {
            if (!previousUrl) {
                previousUrl = '/schedule';
            }
            return response.redirect(previousUrl);
        }
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

    async ssoCallback({ request, response, session, auth }) {
        const current = new Date();
        const appId = this.ssoConfig.app_id;
        const ssoAuthUrl = this.ssoConfig.auth_url;
        const token =  request.input('token');
        const userAgent = encodeURIComponent(request.header('user-agent'));
        const ip = request.ip();
        const domain = request.hostname();
        let fullAuthUrl = `${ssoAuthUrl}?token=${token}&app_id=${appId}&ip=${ip}&user_agent=${userAgent}&domain=${domain}`;
            try {
                const result = await axios.get(fullAuthUrl, {
                    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
                });
                const res = result.data;
                if (res.status === 'success') {
                    const user = res.user;
                    const existsUser = await this.checkExistsUser(user.email);
                    if (existsUser) {
                        session.put('token', token);
                        await this.updateUserToken(existsUser.id, token);
                        if (!auth.check()) {
                            await auth.login(existsUser);
                        }
                        return response.route('listSchedule');
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        session.clear();
        if (auth.check()) {
            await auth.logout();
        }
        return response.status(401).send('Callback: Unauthorized');
    }

    async checkExistsUser(userEmail) {
        const user = await User.query().where('email', userEmail).where(
            'status', 'active'
        ).first();
        return user;
    }

    async updateUserToken(userId, token) {
        const user = await User.find(userId);
        user.token = token;
        await user.save();
    }

    async logout({ response, session, auth }) {
        await auth.logout();
        session.clear();
        if (this.ssoConfig.enable == 'true') {
            const ssoLogout = this.ssoConfig.logout_url;
            return response.redirect(ssoLogout);
        }
        return response.route('home');
    }

    async ssoPostBack({request, response}) {
        const body = request.post();
        let res = {
            status: 'fail'
        };
        try {
            const user = {
                name: body.full_name,
                code: body.code,
                email: body.email,
                status: body.active ? 'active' : 'deactive',
            }
            const existsUser = await User.query().where('email', user.email).first();
            if (existsUser) {
                await User.query().where('email', user.email).update(user);
                res.status = 'success';
                res.message = 'User exists. Update user successfully! ';
            } else {
                await User.create(user);
                res.status = 'success';
                res.message = 'Create user successfully!';
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            res.message = error.message
        }
        return response.json(res)
    }

}

module.exports = HomeController
