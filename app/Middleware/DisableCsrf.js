'use strict'

class DisableCsrf {
  async handle ({ request, response, session, auth }, next) {
    // Bỏ qua kiểm tra CSRF
    console.log('request.url== ', request.url());
    request.csrfToken = () => null;
    await next();
  }
}

module.exports = DisableCsrf;