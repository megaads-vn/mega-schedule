var cronstrue = window.cronstrue;

$(document).ready(function () {
    $(document).on('click', '.panel-heading span.clickable', function (e) {
        var $this = $(this);
        if (!$this.hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideUp();
            $this.addClass('panel-collapsed');
            $this.find('i').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
        } else {
            $this.parents('.panel').find('.panel-body').slideDown();
            $this.removeClass('panel-collapsed');
            $this.find('i').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
        }
    });
});

angular.module('MegaSchedule', ['ngSanitize'], function ($interpolateProvider) {
    $interpolateProvider.startSymbol('[{');
    $interpolateProvider.endSymbol('}]');
}).controller('ScheduleController', function ($scope, $timeout, $http) {

    $scope.pageId = 0; $scope.pageSize = 20; $scope.title = "New Schedule"; $scope.titleLog = null;
    $scope.schedules = []; $scope.filter = {}; $scope.logs = []; const STAR = '*';
    $scope.runs = []; $scope.hoverRule = 'weeks';
    var defaultValue = {
        seconds: STAR,
        minutes: STAR,
        hours: STAR,
        days: STAR,
        months: STAR,
        weekday: STAR
    };
    $scope.schedule = defaultValue; $scope.customBox = false;

    $scope.showForm = function () {
        $scope.title = "New Schedule";
        $scope.schedule = {};
        $scope.schedule = angular.copy(defaultValue);
        $scope.schedule.url = null;
        $scope.schedule.time = null;
        $scope.customBox = false;
        $scope.buildTime();
        $timeout(function () {
            $('.btnSave').button('reset');
            $('#formSchedule').modal('show');
        });
    }

    $scope.find = function () {
        $('.loading').show();
        $http.get('/service/schedule/find?' + $.param($scope.buildFilterData())).then(function successResult(response) {
            if (response.data.status == "successful") {
                $scope.schedules = response.data.data;
                $scope.pagesCount = response.data.pagesCount;
            } else {
                $scope.schedules = [];
                $scope.pagesCount = 0;
            }
            $('.loading').hide();
        }, function errorResult() {
            alert('An error occurred during data transfer. Please try again...');
            $('.loading').hide();
        });
    }

    $scope.buildFilterData = function () {
        var retVal = {
            pageId: $scope.pageId,
            pageSize: $scope.pageSize
        };
        if(typeof($scope.filter.note) != 'undefined' && $scope.filter.note != '' && $scope.filter.note != null) {
            retVal.note = $scope.filter.note;
        }
        if(typeof($scope.filter.link) != 'undefined' && $scope.filter.link != '' && $scope.filter.link != null) {
            retVal.link = $scope.filter.link;
        }

        return retVal;
    }

    $scope.summarizeDateTime = function (dateTime, withYear) {
        if (dateTime != null) {
            var outputFormat = "$3/$2";
            if (withYear) {
                outputFormat += "/$1";
            }
            outputFormat += " $4:$5";
            return dateTime.replace(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):.*/, outputFormat);
        }
    }

    $scope.delete = function (item) {
        var check = confirm('Do you want delete this schedule ?');
        if (check) {
            $('.loading').show();
            $http.delete('/service/schedule/delete/' + item.id).then(function successResult(response) {
                $scope.find();
                $('.loading').hide();
            }, function errorResult() {
                alert('An error occurred during data transfer. Please try again...');
                $('.loading').hide();
            });
        }
    }

    $scope.search = function () {
        $scope.pageId = 0;
        $scope.find();
    }

    $scope.reset = function () {
        $scope.pageId = 0;
        $scope.filter = {};
        $scope.find();
    }

    $scope.myEnter = function (event) {
        if (event.keyCode == 13 || event.which == 13) {
            $scope.search();
        }
    }

    $scope.buildTime = function (isReturn) {
        var retVal = []; var checkPush = 0;
        if (typeof ($scope.schedule.seconds) != 'undefined' && $scope.schedule.seconds != '' && $scope.schedule.seconds != null && $scope.schedule.seconds != STAR) {
            checkPush++;
            retVal.push($scope.schedule.seconds);
        }

        if (typeof ($scope.schedule.minutes) != 'undefined' && $scope.schedule.minutes != '' && $scope.schedule.minutes != null) {
            checkPush++;
            retVal.push($scope.schedule.minutes);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if (typeof ($scope.schedule.hours) != 'undefined' && $scope.schedule.hours != '' && $scope.schedule.hours != null) {
            checkPush++;
            retVal.push($scope.schedule.hours);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if (typeof ($scope.schedule.days) != 'undefined' && $scope.schedule.days != '' && $scope.schedule.days != null) {
            checkPush++;
            retVal.push($scope.schedule.days);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if (typeof ($scope.schedule.months) != 'undefined' && $scope.schedule.months != '' && $scope.schedule.months != null) {
            checkPush++;
            retVal.push($scope.schedule.months);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if (typeof ($scope.schedule.weekday) != 'undefined' && $scope.schedule.weekday != '' && $scope.schedule.weekday != null) {
            checkPush++;
            retVal.push($scope.schedule.weekday);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        
        if (isReturn) {
            return retVal.join(' ');
        } else {
            var stringTime = retVal.join(' ');
            $scope.schedule.time = stringTime;
            $scope.showDescriptions(stringTime);
        }
    }

    $scope.save = function () {
        var data = $scope.buildData();
        if(data) {
            $('.btnSave').button('loading');
            if (typeof (data.id) != 'undefined' && data.id != '' && data.id != null) {
                var httpRequest = $http.patch('/service/schedule/update/' + data.id, data);
            } else {
                var httpRequest = $http.post('/service/schedule/create', data);
            }
            httpRequest.then(function successResult(response) {
                if (response.data.status == "successful") {
                    $('#formSchedule').modal('hide');
                    $scope.find();
                } else {
                    $('.btnSave').button('reset');
                    alert('An error occurred during data transfer. Please try again...');
                }
            }, function errorResult() {
                $('.btnSave').button('reset');
                alert('An error occurred during data transfer. Please try again...');
            });
        }
    }

    $scope.buildData = function () {
        var retVal = {};
        if(typeof($scope.schedule.id) != 'undefined' && $scope.schedule.id != '' && $scope.schedule.id != null) {
            retVal.id = $scope.schedule.id;
        }
        if(typeof($scope.schedule.url) != 'undefined' && $scope.schedule.url != '' && $scope.schedule.url != null) {
            retVal.url = $scope.schedule.url;
        } else {
            alert('URL or Command required. Please check again...');
            return false;
        }
        if($scope.customBox) {
            if (typeof ($scope.schedule.time) != 'undefined' && $scope.schedule.time != '' && $scope.schedule.time != null) {
                var time = $scope.schedule.time.replace(/\s\s+/g, ' ');
                if (time.split(' ').length > 6) {
                    alert('Custom Time not valid. Please check again...');
                    return false;
                }
                retVal.time = time;
                retVal.customTime = "yes";
            } else {
                alert('Custom Time required. Please check again...');
                return false;
            }
        } else {
            retVal.time = $scope.buildTime(true);
            retVal.customTime = "no";
        }
        if(typeof($scope.schedule.note) != 'undefined' && $scope.schedule.note != '' && $scope.schedule.note != null) {
            retVal.note = $scope.schedule.note;
        }
        return retVal;
    }

    $scope.log = function (item) {
        $('.loading').show();
        $scope.titleLog = item.run_at + ' - ' + item.url;
        $http.get('/service/schedule/history/' + item.id).then(function successResult(response) {
            if (response.data.status == "successful") {
                $scope.logs = response.data.data;
            } else {
                $scope.logs = [];
            }
            $('.loading').hide();
            $('#formLog').modal('show');
        }, function errorResult() {
            $('.loading').hide();
            $scope.logs = [];
            $('#formLog').modal('show');
        });
    }

    $scope.edit = function (item) {
        $scope.schedule = {};
        $scope.schedule = angular.copy(item);
        var runTime = item.run_at.trim().replace(/\s\s+/g, ' ');
        $scope.schedule.time = runTime;
        var times = runTime.split(' ');
        angular.forEach(times, function (item, index) {
            if (!isNaN(item)) {
                times[index] = parseInt(item);
            }
        });
        /** default value */
        $scope.schedule.weekday = STAR;
        $scope.schedule.months = STAR;
        $scope.schedule.days = STAR;
        $scope.schedule.hours = STAR;
        $scope.schedule.minutes = STAR;
        $scope.schedule.seconds = STAR;

        if (times.length != 0) {
            $scope.schedule.weekday = times.pop();
        }
        if (times.length != 0) {
            $scope.schedule.months = times.pop();
        }
        if (times.length != 0) {
            $scope.schedule.days = times.pop();
        }
        if (times.length != 0) {
            $scope.schedule.hours = times.pop();
        }
        if (times.length != 0) {
            $scope.schedule.minutes = times.pop();
        }
        if (times.length != 0) {
            $scope.schedule.seconds = times.pop();
        }
        (item.custom_time === "yes") ? $scope.customBox = true : $scope.customBox = false;
        $scope.title = "Edit Schedule";
        $scope.showDescriptions($scope.schedule.time);
        $timeout(function () {
            $('#weekday').val($scope.schedule.weekday);
            $('#months').val($scope.schedule.months);
            $('#days').val($scope.schedule.days);
            $('#hours').val($scope.schedule.hours);
            $('#minutes').val($scope.schedule.minutes);
            $('#seconds').val($scope.schedule.seconds);
            $('.btnSave').button('reset');
            $('#formSchedule').modal('show');
        });
    }

    $scope.changeScheduleTime = function (textRule) {
        textRule = textRule.replace(/ +(?= )/g, '');
        var splitSpace = textRule.split(' ');
        if ((splitSpace.length <= 4 || splitSpace.length > 6) && !$('#validate-time').hasClass('has-error')) {
            $('#validate-time').addClass('has-error');
        } else {
            $('#validate-time').removeClass('has-error');
        }
        switch (splitSpace.length) {
            case 1: $scope.hoverRule = 'weeks'; break;
            case 2: $scope.hoverRule = 'months'; break;
            case 3: $scope.hoverRule = 'days'; break;
            case 4: $scope.hoverRule = 'hours'; break;
            case 5: $scope.hoverRule = 'minutes'; break;
            case 6: $scope.hoverRule = 'seconds'; break;
            default: $scope.hoverRule = 'weeks'; break;
        }
        $scope.showDescriptions(textRule);
    }

    $scope.showDescriptions = function (textRule) {
        if (textRule.split(' ').length >= 5) {
            $scope.descriptions = cronstrue.toString(textRule, { use24HourTimeFormat: true });
        } else {
            $scope.descriptions = null;
        }
    }

    $scope.find();

    /* ------------------------- WEB SOCKET ---------------------- */
    var ws = adonis.Ws().connect();

    ws.on('open', () => {
        const activity = ws.subscribe('activitySchedule');

        activity.on('socketId', (id) => {
            console.log('Subscribe Activity Schedule Event as SocketId:', id);
        });

        activity.on('error', (error) => {
            console.log("Activity Error", error);
        });

        activity.on('close', () => {
            console.log('Unsubscribe Activity Schedule Event...');
        });

        activity.on('scheduleRun', (data) => {
            $scope.runs = angular.copy(data);
            $scope.$apply();
        });
    })

    ws.on('error', () => {
        console.log('Error Connect Web Socket!');
    });

    ws.on('close', () => {
        console.log('Disconnect Web Socket!');
    });

});


