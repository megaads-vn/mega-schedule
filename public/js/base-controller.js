var system = angular.module('MegaSchedule', [], function ($interpolateProvider) {
    $interpolateProvider.startSymbol('[{');
    $interpolateProvider.endSymbol('}]');
});

function showMessage(title, text, type, icon) {
	var notice = new PNotify({
		title: title,
		text: text,
		type: type,
		icon: 'glyphicon ' + icon,
		addclass: 'snotify',
		closer: true,
		delay: 2000
	});
}

function BaseController($scope) {
    $scope.isJsonString = function (str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    $scope.htmlDecodeEntities = function (input){
        var e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes[0].nodeValue;
    }

    $scope.isValidLink = function (link) {
        var regex = /(^|\s)((https?:\/\/)[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
        return regex.test(link);
    }

    $scope.getByCode = function (list, code) {
        var retVal = null;
        list.forEach(function (item) {
            if (item.code == code) {
                retVal = item;
            }
        });
        return retVal;
    };

    $scope.getByField = function (list, fieldName, value) {
        var retVal = null;
        list.forEach(function (item) {
            if (item[fieldName] == value) {
                retVal = item;
            }
        });
        return retVal;
    };

    $scope.summarizeDateTime = function (dateTime, withYear) {
        if (dateTime != null) {
            var outputFormat = "$3/$2";
            if (withYear) {
                outputFormat += "/$1";
            }
            outputFormat += " $4:$5";
            return dateTime.replace(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):.*/, outputFormat);
        }
    };

    $scope.isValidEmail = function (email) {
        var regex = /^[\w\.-]+@[\w\.-]+\.\w{2,5}$/;
        var retVal = email != null && email.match(regex) != null;
        return retVal;
    };

    $scope.randomString = function (length) {
        var retval = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        if (length == null) {
            length = 6;
        }
        for (var i = 0; i < length; i++) {
            retval += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return retval;
    };
}