
'use strict'

const User = use('App/Models/User')
const Logging = use('App/Models/Logging')

class Common {

    async findUserByToken(token) {
        let retVal = null;
        try {
            const user = await User.query()
                                .where('token', token)
                                .where('status', 'active')
                                .first();
            if (user) {
                retVal = user;
            }
        } catch (err) {
            throw err;
        }
        return retVal;
    }

    async saveUserActionLog(data) {
        try {
            Logging.create(data);
        } catch (err) {
            console.error("SAVE_USER_ACTION_ERROR: ", err.message);
        }
    }
}

module.exports = new Common