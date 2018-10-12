'use strict'

class Token {
  async handle ({ response, session }, next) {
    var sessionToken = session.get('token');
    if(typeof(sessionToken) != 'undefined' && sessionToken != '' && sessionToken != null) {
      await next();
    } else {
      response.route('home');
    }
  }
}

module.exports = Token
