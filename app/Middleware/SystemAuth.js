'use strict'

const Config = use('Config')
class SystemAuth {
  async handle ({ request, response, session }, next) {
    const userToken = session.get('token');
    const ssoConfig = Config.get('app.sso');
    if (!userToken && ssoConfig.enable == 'true') {
      return response.route('ssoLogin');
    } else if (typeof(userToken) == 'undefined' || userToken == '' || userToken == null) {
      return response.route('home');
    }
    await next();
  }
}

module.exports = SystemAuth
