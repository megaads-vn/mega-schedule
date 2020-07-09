'use strict'
const Config = use('Config');

class Token {
  async handle ({ response, session }, next) {
    var sessionToken = session.get('token');
    var sso = Config.get('sso')
    if (sso.active) {
        var userSession = session.get('user')
        if (!userSession) {
            const redirectUrl = `${sso.login_url}?continue=${sso.callback_url}`
            return response.redirect(redirectUrl);
        } else {
            await next();
        }
    } else if(typeof(sessionToken) != 'undefined' && sessionToken != '' && sessionToken != null) {
      await next();
    } else {
      response.route('home');
    }
  }
}

module.exports = Token
