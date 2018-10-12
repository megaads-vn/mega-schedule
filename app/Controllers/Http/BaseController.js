'use strict'

const STATUS_SUCCESS = "successful";
const STATUS_FAIL = "fail";

class BaseController {

    getDefaultStatus() {
        return {
            status: STATUS_FAIL,
            message: STATUS_FAIL
        };
    }

    getSuccessStatus() {
        return {
            status: STATUS_SUCCESS,
            message: STATUS_SUCCESS
        };
    }

    recordsCountToPagesCount(recordsCount, pageSize) {
        var retVal = parseInt(recordsCount / pageSize);
        if (recordsCount % pageSize > 0) {
            retVal++;
        }
        return retVal;
    }
}

module.exports = BaseController
