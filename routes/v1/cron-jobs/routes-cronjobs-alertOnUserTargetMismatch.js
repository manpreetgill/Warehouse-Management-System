var express = require('express'); // MVC Framework
var router = express.Router();
var events = require('events');
var EventEmitter = events.EventEmitter;
var moment = require('moment'); //timestamp
var momenttimezone = require('moment-timezone');//timestamp zone
var cron = require('node-cron');
var async = require('async');
//------------------------------------------------------------------------------------------------------------------------
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var alertService = require('../../../service-factory/alertService');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var userTypesModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var warehouseUtilizationModel = require('../../../models/mongodb/locationMaster-warehouseUtilization/collection-warehouseUtilization');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
//-----------------------------------------------------------------------------------------------------------------------
// # ┌────────────── second (optional)
// # │ ┌──────────── minute
// # │ │ ┌────────── hour
// # │ │ │ ┌──────── day of month
// # │ │ │ │ ┌────── month
// # │ │ │ │ │ ┌──── day of week
// # │ │ │ │ │ │
// # │ │ │ │ │ │
// # *  *  *  * *  *
//----------------------------------------------------------------------------------------------------------------------------
// Running task every minutes
//----------------------------------------------------------------------------------------------------------------------------
var task = cron.schedule('* * * * *', function () {

    var consoleLog = 1;

    var flowController = new EventEmitter();

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        clientsModel.findOne({'activeStatus': 1}, function (err, clientRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (clientRow == null) {

                flowController.emit('ERROR', {message: 'Client details not available in system!', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('1', clientRow);
            }
        });
    });
    // Get warehouse details
    flowController.on('1', function (clientRow) {

        (consoleLog) ? console.log('1') : '';

        warehouseMasterModel.findOne({'clientId': clientRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('2', clientRow, warehouseRow);

            }
        });
    });

    // Check if current time exceeds end time of day 
    // Call all functions to execute for operations from here
    flowController.on('2', function (clientRow, warehouseRow) {

        (consoleLog) ? console.log('2') : '';

        var currentTime = timeInInteger;
        var alertTime = warehouseRow.userTarget_alert_time;

        console.log(currentTime + " " + alertTime);

        if (currentTime >= alertTime) {

            var newTime = currentTime + ((warehouseRow.userTarget_alert_interval) * 60 * 60);
            var query = {'_id': warehouseRow._id};
            var update = {'$set': {'userTarget_alert_time': newTime}};

            warehouseMasterModel.update(query, update, function (err) {
                if (err) {

                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else {

                    userTarget_alert(clientRow, warehouseRow);
                }
            });

        } else {

            flowController.emit('END', {message: 'Not a alert time for user target mismatch!', status: 'success', statusCode: '200'});
        }
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // START
    flowController.emit('START');
});

function userTarget_alert(clientRow, warehouseRow) {

    var consoleLog = 1;

    var warehouseId = warehouseRow._id;

    var flowController = new EventEmitter();

    //
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                var endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                var startTime = parseInt(endTime) - 86400;

                flowController.emit('1.1', startTime, endTime);
            }
        });
    });

    //
    flowController.on('1.1', function (startTime, endTime) {

        (consoleLog) ? console.log('1.1') : '';

        userTypesModel.findOne({'warehouseId': warehouseId, 'name': 'OPERATOR', 'activeStatus': 1}, function (err, userTypeRow) {

            var userTypeId = userTypeRow._id;
            flowController.emit('1.2', startTime, endTime, userTypeId);
        });
    });

    //
    flowController.on('1.2', function (startTime, endTime, userTypeId) {

        (consoleLog) ? console.log('1.2') : '';

        usersModel.find({'warehouseId': warehouseId, 'userTypeId': userTypeId, 'activeStatus': 1}, function (err, userRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (userRow.length == 0) {

                flowController.emit('END');

            } else {
                async.eachSeries(userRow, function (element, callback) {

                    async.waterfall([

                        function (waterfallcallback) {

                            (consoleLog) ? console.log('WATERFALL-1') : '';

                            pickSubListModel.count({'assignedTo': element.userId, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickCount) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    waterfallcallback(null, pickCount);
                                }
                            });
                        },

                        function (pickCount, waterfallcallback) {

                            (consoleLog) ? console.log('WATERFALL-2') : '';

                            pickSubListModel.count({'assignedTo': element.userId, 'endedBy': element.userId, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    var pickArray = {

                                        Count: pickCount,
                                        Done: pickDoneCount,
                                        Percentage: (((pickDoneCount) * 100) / pickCount) ? (((pickDoneCount) * 100) / pickCount) : 0,
                                    };

                                    waterfallcallback(null, pickArray, pickCount);
                                }
                            });
                        },

                        function (pickArray, pickCount, waterfallcallback) {

                            (consoleLog) ? console.log('WATERFALL-3') : '';

                            putListModel.count({'assignedTo': element.userId, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putCount) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    waterfallcallback(null, pickArray, pickCount, putCount);
                                }
                            });
                        },

                        function (pickArray, pickCount, putCount, waterfallcallback) {

                            (consoleLog) ? console.log('WATERFALL-4') : '';

                            putListModel.count({'assignedTo': element.userId, 'completedBy': element.userId, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putDoneCount) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    var putArray = {

                                        Count: putCount,
                                        Done: putDoneCount,
                                        Percentage: (((putDoneCount) * 100) / putCount) ? (((putDoneCount) * 100) / putCount) : 0,
                                    };

                                    waterfallcallback(null, pickArray, putArray);
                                }
                            });
                        }

                    ], function (err, pickArray, putArray) {

                        (consoleLog) ? console.log('WATERFALL-12') : '';

                        if (err) {

                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                        } else {
                            (consoleLog) ? console.log('WATERFALL-alert-start') : '';
                            var firstName = (element.firstName).charAt(0).toUpperCase() + (element.firstName).slice(1);
                            var lastName = (element.lastName).charAt(0).toUpperCase() + (element.lastName).slice(1);
                            var name = firstName + ' ' + lastName;

                            var targetCapacity = (element.targetCapacity) ? (element.targetCapacity) : 0;
                            var totalWorkingHours = (element.totalWorkingHours) ? (element.totalWorkingHours) : 0;

                            if (totalWorkingHours == 0) {
                                '';
                                setImmediate(callback);
                            } else {

                                var targetPerHour = Math.round(targetCapacity / totalWorkingHours);

                                console.log(pickArray.Done + " . " + putArray.Done);

                                var totalWorkDone = (pickArray.Done) + (putArray.Done);

                                if (warehouseRow.userTarget_alert_interval != 0) {

                                    var actualPerHour = (totalWorkDone) / (warehouseRow.userTarget_alert_interval);

                                    if (actualPerHour < targetPerHour) {
                                        (consoleLog) ? console.log('WATERFALL-alert-call') : '';
                                        var dataObject = {
                                            warehouseId: warehouseId,
                                            textName: "User current rate below the target rate",
                                            module: "USER",
                                            name: name,
                                            id: element._id
                                        };
                                        alertService.createAlert(dataObject);
                                    }
                                } else {

                                    setImmediate(callback);
                                }
                                setImmediate(callback);
                            }
                        }
                    });
                }, function (err) {
                    if (err) {

                        callback({message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END');
                    }
                });
            }
        });
    });

    //
    flowController.on('END', function (result) {

        (consoleLog) ? console.log('END') : '';
        console.log("Your userTarget alert generated...Please check your notification");

    });

    //
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

    });

    // START
    flowController.emit('START');
}
;
task.start();
//task.stop();

module.exports = router;

