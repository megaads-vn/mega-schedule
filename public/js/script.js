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

system.controller('ScheduleController', function ($scope, $timeout, $http) {

    this.prototype = new BaseController($scope);

    $scope.pageId = 0; $scope.pageSize = 20;
    $scope.schedules = []; $scope.filter = {}; 
    $scope.logs = []; const STAR = '*';
    $scope.runs = []; $scope.hoverRule = 'weeks'; 
    $scope.project = {};
    $scope.projects = []; $scope.projectsForm = [];
    $scope.limits = [10, 20, 50, 70, 100, 200, 250];
    $scope.log = {
        limit: $scope.limits[0]
    };
    $scope.statuses = [
        { code: 'active', name: 'Active' },
        { code: 'pending', name: 'Pending' },
    ];

    var defaultValue = {
        seconds: STAR,
        minutes: STAR,
        hours: STAR,
        days: STAR,
        months: STAR,
        weekday: STAR,
        status: $scope.statuses[0].code
    };
    $scope.schedule = defaultValue; 
    $scope.customBox = false;

    $scope.init = async function () {
        $scope.fetchProject();
        $scope.find();
    }

    $scope.fetchProject = function () {
        $http.get('/service/project/find', {params: {pageSize: -1}}).then(function (response) {
            if (response.data.status == "successful") {
                $scope.projects = angular.copy(response.data.data);
                $scope.projectsForm = angular.copy(response.data.data);
                $scope.projectsForm.push({
                    id: -1,
                    name: 'New Project...'
                });
            } else {
                $scope.projects = [];
                $scope.projectsForm = [];
            }
        });
    }

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
        $http.get('/service/schedule/find?' + $.param($scope.buildFilterData())).then(function (response) {
            if (response.data.status == "successful") {
                $scope.schedules = response.data.data;
                $scope.pagesCount = response.data.pagesCount;
            } else {
                $scope.schedules = [];
                $scope.pagesCount = 0;
            }
            $('.loading').hide();
        }, function (error) {
            $('.loading').hide();
            showMessage('Error', 'An error occurred during data transfer. Please try again...', 'error', 'glyphicon-remove');
        });
    }

    $scope.buildFilterData = function () {
        var retVal = {
            pageId: $scope.pageId,
            pageSize: $scope.pageSize
        };
        var fillable = ['terms', 'status', 'project_id'];
        fillable.forEach(function (field) {
            if ($scope.filter[field] && $scope.filter[field] != '') {
                retVal[field] = $scope.filter[field];
            }
        });
        
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
            $http.delete('/service/schedule/delete/' + item.id).then(function (response) {
                $scope.find();
                $('.loading').hide();
            }, function (error) {
                $('.loading').hide();
                showMessage('Error', 'An error occurred during data transfer. Please try again...', 'error', 'glyphicon-remove');
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
        if (($scope.schedule.seconds == 0 || $scope.schedule.seconds != STAR) && typeof $scope.schedule.seconds != "undefined" &&  $scope.schedule.seconds != null) {
            checkPush++;
            retVal.push($scope.schedule.seconds);
        }
        if (($scope.schedule.minutes == 0 || $scope.schedule.minutes != '') && typeof $scope.schedule.minutes != "undefined" && $scope.schedule.minutes != null) {
            checkPush++;
            retVal.push($scope.schedule.minutes);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if (($scope.schedule.hours == 0 || $scope.schedule.hours != '') && typeof $scope.schedule.hours != "undefined" && $scope.schedule.hours != null) {
            checkPush++;
            retVal.push($scope.schedule.hours);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if ($scope.schedule.days && $scope.schedule.days != '') {
            checkPush++;
            retVal.push($scope.schedule.days);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if ($scope.schedule.months && $scope.schedule.months != '') {
            checkPush++;
            retVal.push($scope.schedule.months);
        } else if (checkPush > 0) {
            retVal.push(STAR);
        }
        if (($scope.schedule.weekday == 0 || $scope.schedule.weekday != '') && typeof $scope.schedule.weekday != "undefined" && $scope.schedule.weekday != null) {
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
            if (data.id && data.id != '') {
                var httpRequest = $http.patch('/service/schedule/update/' + data.id, data);
            } else {
                var httpRequest = $http.post('/service/schedule/create', data);
            }
            httpRequest.then(function (response) {
                if (response.data.status == "successful") {
                    $('#formSchedule').modal('hide');
                    $scope.find();
                } else {
                    $('.btnSave').button('reset');
                    showMessage('Error', 'An error occurred during data transfer. Please try again...', 'error', 'glyphicon-remove');
                }
            }, function (error) {
                $('.btnSave').button('reset');
            });
        }
    }

    $scope.buildData = function () {
        var retVal = {};
        var fillable = ['id', 'url', 'note', 'project_id', 'emails', 'status'];
       
        if (!$scope.schedule.url || $scope.schedule.url == '') {
            showMessage('Error', 'URL or Command required. Please check again...', 'error', 'glyphicon-remove');
            return false;
        }

        if ($scope.schedule.emails && $scope.schedule.emails != '') {
            var emails = $scope.schedule.emails.split(',').map(function (item) { return item.trim() });
            var invalidEmail = false;
            for (var k in emails) {
                if (!$scope.isValidEmail(emails[k])) {
                    invalidEmail = true;
                }
            }
            if (invalidEmail) {
                showMessage('Error', 'Email invalid. Please check again...', 'error', 'glyphicon-remove');
                return false;
            } else {
                $scope.schedule.emails = emails.join(',');
            }
        }

        if ($scope.customBox) {
            if ($scope.schedule.time && $scope.schedule.time != '') {
                var time = $scope.schedule.time.replace(/\s\s+/g, ' ');
                if (time.split(' ').length > 6) {
                    showMessage('Error', 'Custom Time not valid. Please check again...', 'error', 'glyphicon-remove');
                    return false;
                }
                retVal.time = time;
                retVal.customTime = "yes";
            } else {
                showMessage('Error', 'Custom Time required. Please check again...', 'error', 'glyphicon-remove');
                return false;
            }
        } else {
            retVal.time = $scope.buildTime(true);
            retVal.customTime = "no";
        }

        fillable.forEach(function (field) {
            if ($scope.schedule[field] && $scope.schedule[field] != '') {
                retVal[field] = $scope.schedule[field];
            }
        });

        return retVal;
    }

    $scope.viewLog = function (item) {
        $scope.log = angular.copy(item);
        $scope.log.title = item.run_at + ' - ' + item.url;
        $scope.log.limit = $scope.limits[0];
        $scope.findLog();
    }

    $scope.resetLog = function () {
        $scope.log.limit = $scope.limits[0];
        $scope.findLog();
    }

    $scope.findLog = function () {
        $('.loading').show();
        $http.get('/service/schedule/history/' + $scope.log.id, { params: {limit: $scope.log.limit} }).then(function (response) {
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
        $scope.buildScheduleData(item, "Edit Schedule");
    }

    $scope.clone = function (item) {
        var itemClone = angular.copy(item);
        delete itemClone.id;
        $scope.buildScheduleData(itemClone, "Clone Schedule");
    }

    $scope.buildScheduleData = function (item, title) {
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
        $scope.customBox = (item.custom_time === "yes") ? true : false;
        $scope.title = title;
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

    $scope.changeProject = function (projectId) {
        if (projectId == -1) {
            $scope.project = {};
            $timeout(function () {
                $('#formSchedule').modal('hide');
                $('#formProject').modal('show');
            });
        }
    }

    $scope.closeProject = function (isReset) {
        if (!isReset) {
            delete $scope.schedule.project_id;
        }
        $timeout(function () {
            $('#formProject').modal('hide');
            $('#formSchedule').modal('show');
        });
    }

    $scope.saveProject = function () {
        if (!$scope.project.name || $scope.project.name == '') {
            showMessage('Error', 'Project name required. Please check again.', 'error', 'glyphicon-remove');
            return;
        }

        $('.btnSaveProject').button('loading');
        $http.post('/service/project/create', $scope.project).then(function (response) {
            if (response.data.status == "successful") {
                var project = response.data.data;
                var newProject = $scope.projectsForm.pop();
                $scope.projects.push(project);
                $scope.projectsForm.push(project);
                $scope.projectsForm.push(newProject);
                $scope.schedule.project_id = project.id;
                $scope.closeProject(true);
            } else {
                showMessage('Error', response.data.message, 'error', 'glyphicon-remove');
            }
            $('.btnSaveProject').button('reset');
        }, function (error) {
            $('.btnSaveProject').button('reset');
            showMessage('Error', 'An error occurred during data transfer. Please try again...', 'error', 'glyphicon-remove');
        });
    }


    $scope.init();

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


