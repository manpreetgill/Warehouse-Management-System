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
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
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
//-------function-----------------------------------------------------------------------------------
function activityOverdueAlertTime(clientRow, warehouseRow) {
    var consoleLog = 1;

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    flowController.on('START', function () {

        (consoleLog) ? console.log('START-function') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                var endTime;
                var startTime;

                var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                var currentTime = moment(startTimeIn, 'h:mm');
                var dayEndTime = moment(endTimeIn, 'h:mm');

                if (currentTime.isBefore(dayEndTime)) {
                    var date1 = moment(new Date()).format('YYYY-MM-DD');
                    timestamp = moment(date1).unix();
                    endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                    startTime = parseInt(endTime) - 86400;
                } else {
                    var date1 = moment(new Date()).format('YYYY-MM-DD');
                    timestamp = moment(date1).unix();
                    startTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                    endTime = parseInt(startTime) + 86400;
                }

                flowController.emit('1', startTime, endTime, warehouseRow);
            }
        });
    });

    flowController.on('1', function (startTime, endTime, warehouseRow) {
        (consoleLog) ? console.log('function-1') : '';
        pickSubListModel.count({'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickCount) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else {

                flowController.emit('2', startTime, endTime, warehouseRow, pickCount);
            }
        });
    });

    flowController.on('2', function (startTime, endTime, warehouseRow, pickCount) {
        (consoleLog) ? console.log('function-2') : '';
        putListModel.count({'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putCount) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else {

                flowController.emit('3', startTime, endTime, warehouseRow, pickCount, putCount);
            }
        });
    });

    flowController.on('3', function (startTime, endTime, warehouseRow, pickCount, putCount) {
        (consoleLog) ? console.log('function-3') : '';
        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseUtilizationRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (warehouseUtilizationRow == null) {
                flowController.emit('ERROR', {message: "Todays target details not set, need target details to proceed further with processing.", status: 'error', statusCode: '404'});

            } else {
                var pickTargetPerHour = warehouseUtilizationRow.targetPickLines;
                var putTargetPerHour = warehouseUtilizationRow.targetPutLines;

                flowController.emit('4', startTime, endTime, warehouseRow, pickCount, putCount, pickTargetPerHour, putTargetPerHour);
            }
        });
    });

    flowController.on('4', function (startTime, endTime, warehouseRow, pickCount, putCount, pickTargetPerHour, putTargetPerHour) {
        (consoleLog) ? console.log('function-4') : '';

        var doneTimeHour = ((1 / pickTargetPerHour) * pickCount) + ((1 / putTargetPerHour) * putCount);

        var bufferTime = doneTimeHour * ((warehouseRow.activityOverdue_alert_buffer) / 100);

        var alertTimeHour = doneTimeHour + bufferTime;

        var activityOverdue_alert_time = timeInInteger + (alertTimeHour * 60 * 60);

        flowController.emit('update', alertTimeHour, activityOverdue_alert_time);
    });

    flowController.on('update', function (alertTimeHour, activityOverdue_alert_time) {
        (consoleLog) ? console.log('function-5') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id}, function (err, warehouseMasterRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseMasterRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                warehouseMasterRow.activityOverdue_alert_interval = alertTimeHour;
                warehouseMasterRow.activityOverdue_alert_time = activityOverdue_alert_time;

                warehouseMasterRow.save(function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'System updated with time interval for activity overdue alerts!', status: 'success', statusCode: '200'});
                    }
                });
            }
        });
    });

    flowController.on('END', function (result) {
        console.log(result);
    });

    flowController.on('ERROR', function (error) {
        console.log(error);
    });

    flowController.emit('START');
}
//---------------------------------------CRON-JOB------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
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

                flowController.emit('ERROR', {message: 'warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('2', clientRow, warehouseRow);
            }
        });
    });

    flowController.on('2', function (clientRow, warehouseRow) {

        (consoleLog) ? console.log('2-afterFunction') : '';

        var currentTime = timeInInteger;
        var alertTime = warehouseRow.activityOverdue_alert_time;

        console.log(currentTime + " " + alertTime);

        if (currentTime >= alertTime) {

            var newTime = currentTime + ((warehouseRow.activityOverdue_alert_interval) * 60 * 60);
            var query = {'_id': warehouseRow._id};
            var update = {'$set': {'activityOverdue_alert_time': newTime}};
            warehouseMasterModel.update(query, update, function (err) {
                if (err) {

                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else {
                    activityOverdue_alert(clientRow, warehouseRow);
                }
            });
        } else {

            flowController.emit('END', {message: 'Activity overdue - time not arrived!', status: 'success', statusCode: '200'});
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

function activityOverdue_alert(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log("activityOverdue_alert") : '';

    var warehouseId = warehouseRow._id;

    var flowController = new EventEmitter();

    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                var endTime;
                var startTime;

                var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                var currentTime = moment(startTimeIn, 'h:mm');
                var dayEndTime = moment(endTimeIn, 'h:mm');

                if (currentTime.isBefore(dayEndTime)) {
                    var date1 = moment(new Date()).format('YYYY-MM-DD');
                    timestamp = moment(date1).unix();
                    endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                    startTime = parseInt(endTime) - 86400;
                } else {
                    var date1 = moment(new Date()).format('YYYY-MM-DD');
                    timestamp = moment(date1).unix();
                    startTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                    endTime = parseInt(startTime) + 86400;
                }

                flowController.emit('1', startTime, endTime);
            }
        });
    });

    flowController.on('1', function (startTime, endTime) {  //qty: { $ne: 20 }

        (consoleLog) ? console.log('1') : '';

        pickListModel.find({'status': {$ne: 31}, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickListRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (pickListRow.length == 0) {

                flowController.emit('2', startTime, endTime);
            } else {
                async.eachSeries(pickListRow, function (element, callback) {
                    var dataObject = {
                        warehouseId: warehouseId,
                        textName: "PickList Overdue",
                        module: "PICKLIST",
                        name: element.name,
                        id: element._id
                    };
                    alertService.createAlert(dataObject);
                    setImmediate(callback);
                }, function (err) {

                    if (err) {
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', startTime, endTime);
                    }
                });
            }
        });
    });

    flowController.on('2', function (startTime, endTime) {

        (consoleLog) ? console.log('2') : '';

        putListModel.find({'status': {$ne: 31}, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (putListRow.length == 0) {

                flowController.emit('END');
            } else {
                async.eachSeries(putListRow, function (element, callback) {
                    var dataObject = {
                        warehouseId: warehouseId,
                        textName: "PutList Overdue",
                        module: "PUTLIST",
                        name: element.name,
                        id: element._id
                    };
                    alertService.createAlert(dataObject);
                    setImmediate(callback);
                }, function (err) {

                    if (err) {
                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END');
                    }

                });

            }
        });
    });

    flowController.on('END', function (result) {
        (consoleLog) ? console.log('END.') : '';
        activityOverdueAlertTime(clientRow, warehouseRow);
        console.log("Your activity overdue alert generated...Please check your notification");
    });

    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';
        (consoleLog) ? console.log(error) : '';

    });

    flowController.emit('START');
}
;
task.start();
//task.stop();

module.exports = router;