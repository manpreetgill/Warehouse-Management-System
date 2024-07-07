var express = require('express');
var router = express.Router();
var requestify = require('requestify');
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var warehouseUtilizationModel = require('../../../models/mongodb/locationMaster-warehouseUtilization/collection-warehouseUtilization');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var logger = require('../../../logger/logger.js');
//------------------------------------------------------------------------------------------------------------------------
// BACKLOG SETTING - Configuration
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/day-end/configuration/create/backlog-activation/')

        .patch(function (req, res) {

            console.log(req.body);
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();

            var manualBacklog = req.body.manualBacklog.trim(); //YES/NO

            var autoBacklog = req.body.autoBacklog.trim(); //YES/NO

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        warehouseMasterRow.manualBacklog = manualBacklog;
                        warehouseMasterRow.autoBacklog = autoBacklog;
                        warehouseMasterRow.modifiedBy = modifiedBy;
                        warehouseMasterRow.timeModified = timeInInteger;

                        warehouseMasterRow.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'Warehouse backlog settings updated!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//                
//------------------------------------------------------------------------------------------------------------------------
//create/auto-backlog-timer
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/day-end/configuration/create/auto-backlog-timer/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var autoBackLogTime = req.body.autoBackLogTime.trim(); //YES/NO

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        var autoBackLog = autoBackLogTime.toString().split(":");

                        warehouseMasterRow.autoBackLogTimeHours = autoBackLog[0];
                        warehouseMasterRow.autoBackLogTimeMinutes = autoBackLog[1];
                        warehouseMasterRow.modifiedBy = modifiedBy;
                        warehouseMasterRow.timeModified = timeInInteger;

                        warehouseMasterRow.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'Warehouse details updated!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//                                                
//------------------------------------------------------------------------------------------------------------------------
// BACKLOG - Get details
//-------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/day-end/configuration/get/backlog-activation/:warehouseId/')

        .get(function (req, res) {

            warehouseId = req.params.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseAuto = [];
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        data = {
                            autoBackLogTime: warehouseMasterRow.autoBackLogTimeHours + ':' + warehouseMasterRow.autoBackLogTimeMinutes,
                            manualBacklog: warehouseMasterRow.manualBacklog,
                            autoBacklog: warehouseMasterRow.autoBacklog,
                            cronActivated: warehouseMasterRow.cronActivated
                        };
                        warehouseAuto.push(data);
                        flowController.emit('END', {message: "Operation Successful.", data: warehouseAuto, status: 'success', statusCode: '200'});
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------
// CRON JOB - Day End 
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/day-end/configuration/update-status/pending-backlog/')

        .patch(function (req, res) {

            showConsole = 1;

            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();

            var backloggedBy = req.body.backloggedBy.trim();

            var baseUrl = req.body.baseUrl;

            var flowController = new EventEmitter();

            //pickList BackLog 
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickList/action/update-status/pending-backlog/';

                requestify.post(requestifyUrl, {warehouseId: warehouseId, backloggedBy: backloggedBy}).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {

                        console.log('success');

                        flowController.emit('end');
                    }

                    if (result.status === 'error') {

                        flowController.emit('error', result);
                    }
                });
            });

            //error
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            //end
            flowController.on('end', function () {

                res.json({message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//------------------------------------------------------------------------------------------------------------------------
// BACKLOG SETTING - Cron Activated
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/day-end/configuration/cronUpdate/backlog-activation/')

        .patch(function (req, res) {

            console.log(req.body);

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var cronActivated = req.body.cronActivated.trim(); //YES/NO

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        warehouseMasterRow.cronActivated = cronActivated;
                        warehouseMasterRow.modifiedBy = modifiedBy;
                        warehouseMasterRow.timeModified = timeInInteger;

                        warehouseMasterRow.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'Warehouse details updated!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });

//------------------------------------------------------------------------------------------------------------------------
//create/alert-timer
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/configuration/create/alert-interval/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var modifiedBy = req.body.modifiedBy.trim();

            var warehouseKPI_alert_interval = req.body.warehouseKPI_alert_interval;
            var userTarget_alert_interval = req.body.userTarget_alert_interval;
            var activityOverdue_alert_buffer = req.body.activityOverdue_alert_buffer;
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR',{message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR',{message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {
                        warehouseMasterRow.warehouseKPI_alert_time = (parseInt(warehouseMasterRow.warehouseKPI_alert_interval) === parseInt(warehouseKPI_alert_interval)) ? (warehouseMasterRow.warehouseKPI_alert_time) : (timeInInteger + (warehouseKPI_alert_interval * 60 * 60));
                        warehouseMasterRow.userTarget_alert_time = (parseInt(warehouseMasterRow.userTarget_alert_interval) === parseInt(userTarget_alert_interval)) ? (warehouseMasterRow.userTarget_alert_time) : (timeInInteger + (userTarget_alert_interval * 60 * 60));
                        warehouseMasterRow.warehouseKPI_alert_interval = warehouseKPI_alert_interval;
                        warehouseMasterRow.userTarget_alert_interval = userTarget_alert_interval;
                        warehouseMasterRow.activityOverdue_alert_buffer = activityOverdue_alert_buffer;
                        warehouseMasterRow.modifiedBy = modifiedBy;
                        warehouseMasterRow.timeModified = timeInInteger;


                        warehouseMasterRow.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR',{message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END',{message: 'Alert time interval updated!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });


//------------------------------------------------------------------------------------------------------------------------
// CREATE ALERT - Get details
//-------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/configuration/get/alert-interval/:warehouseId/')

        .get(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            warehouseId = req.params.warehouseId.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR',{message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR',{message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        data = {
                            warehouseKPI_alert_interval: warehouseMasterRow.warehouseKPI_alert_interval,
                            userTarget_alert_interval: warehouseMasterRow.userTarget_alert_interval,
                            activityOverdue_alert_buffer: warehouseMasterRow.activityOverdue_alert_buffer
                        };
                        flowController.emit('END',{message: "Operation Successful.", data: data, status: 'success', statusCode: '200'});
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });

//------------------------------------------------------------------------------------------------------------------------
// CREATE ACTIVITY-OVERDUE ALERT TIME
//-------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/configuration/create/activity-overdue/alert-interval-time/')

        .patch(function (req, res) {

            var consoleLog = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (consoleLog) ? console.log(req.params) : '';

            var warehouseId = req.body.warehouseId;

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

                pickSubListModel.count({'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickCount) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('2', startTime, endTime, warehouseRow, pickCount);
                    }
                });
            });

            flowController.on('2', function (startTime, endTime, warehouseRow, pickCount) {

                putListModel.count({'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putCount) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('3', startTime, endTime, warehouseRow, pickCount, putCount);
                    }
                });
            });

            flowController.on('3', function (startTime, endTime, warehouseRow, pickCount, putCount) {

                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseUtilizationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (warehouseUtilizationRow == null) {
                        flowController.emit('ERROR', {message: "Todays target not configured yet!", status: 'error', statusCode: '404'});

                    } else {
                        var pickTargetPerHour = warehouseUtilizationRow.targetPickLines;
                        var putTargetPerHour = warehouseUtilizationRow.targetPutLines;

                        flowController.emit('4', startTime, endTime, warehouseRow, pickCount, putCount, pickTargetPerHour, putTargetPerHour);
                    }
                });
            });

            flowController.on('4', function (startTime, endTime, warehouseRow, pickCount, putCount, pickTargetPerHour, putTargetPerHour) {

                console.log(pickCount);
                console.log(pickTargetPerHour);

                var doneTimeHour = ((1 / pickTargetPerHour) * pickCount) + ((1 / putTargetPerHour) * putCount);

                console.log(doneTimeHour);

                var bufferTime = doneTimeHour * ((warehouseRow.activityOverdue_alert_buffer) / 100);
                console.log(bufferTime);
                var alertTimeHour = doneTimeHour + bufferTime;

                var activityOverdue_alert_time = timeInInteger + (alertTimeHour * 60 * 60);

                flowController.emit('update', alertTimeHour, activityOverdue_alert_time);
            });

            flowController.on('update', function (alertTimeHour, activityOverdue_alert_time) {
                console.log(alertTimeHour + " . " + activityOverdue_alert_time);
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        res.json({message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        warehouseMasterRow.activityOverdue_alert_interval = alertTimeHour;
                        warehouseMasterRow.activityOverdue_alert_time = activityOverdue_alert_time;

                        warehouseMasterRow.save(function (err) {
                            if (err) {

                                res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                res.json({message: 'Activity-Overdue alert time interval updated!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            flowController.on('END', function (result) {

                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
module.exports = router;
