var express = require('express');
var router = express.Router();
var moment = require('moment'); //timestamp
var momenttimezone = require('moment-timezone'); //timestamp zone
var requestify = require('requestify');
var events = require('events');
var EventEmitter = events.EventEmitter;
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var round10 = require('round10').round10;
//------------------------------------------------------------------------------------------------------------------------
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------
// Get Putlist data
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/get/footer/:userId/:warehouseId/')

        .get(function (req, res) {

            var consoleVar = 0;

            (consoleVar) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var userId = req.params.userId;

            var warehouseId = req.params.warehouseId;

            var flowController = new EventEmitter();

            // Get warehouse day end time details
            flowController.on('START', function () {

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

                        flowController.emit('1', startTime);
                    }
                });
            });

            // Get Put Line items Done count
            flowController.on('1', function (startTime) {

                (consoleVar) ? console.log('1') : '';

                putSubListModel.count({'endedBy': userId, 'timeCreated': {'$gte': startTime}, 'status': {'$in': [31, 33]}, 'activeStatus': 1}, function (err, putSubListCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', putSubListCount, startTime);
                    }
                });
            });

            // Get User details with target capacity
            flowController.on('2', function (putSubListDoneCount, startTime) {

                (consoleVar) ? console.log('2') : '';

                userModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: "User with userId " + userId + " not available in system.", status: 'error', statusCode: '500'});
                    } else {

                        var pickListData = {
                            targetCapacity: (userRow.targetCapacity) ? userRow.targetCapacity : 0,
                            totalWorkingHours: (userRow.totalWorkingHours) ? userRow.totalWorkingHours : 0,
                            putSubListDoneCount: (putSubListDoneCount) ? putSubListDoneCount : 0
                        };

                        flowController.emit('3', pickListData, startTime);
                    }
                });
            });

            // Get details of active time and working hours
            flowController.on('3', function (pickListData, startTime) {

                (consoleVar) ? console.log('3') : '';

                hoursTrackingModel.findOne({'userId': userId, 'timeCreated': startTime, 'activeStatus': 1}, function (err, hoursTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        pickListData.activeTime = (hoursTrackingRow != null) ? (hoursTrackingRow.activeTime) ? hoursTrackingRow.activeTime : 0 : 0

                        flowController.emit('END', pickListData);
                    }
                });
            });

            // End
            flowController.on('END', function (pickListData) {

                (consoleVar) ? console.log('END') : '';

                res.json({putSubListDoneCount: pickListData.putSubListDoneCount, targetCapacity: pickListData.targetCapacity, activeTime: pickListData.activeTime, totalWorkingHours: pickListData.totalWorkingHours, message: 'Operation Successful', status: 'success', statusCode: '200'});

            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                (consoleVar) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//        
//        
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get picklist footer data
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/pickList/action/get/footer/:userId/:warehouseId/')

        .get(function (req, res) {

            var consoleVar = 0;

            (consoleVar) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId;

            var userId = req.params.userId;

            var flowController = new EventEmitter();

            // Get warehouse day end time details
            flowController.on('START', function () {

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

                        flowController.emit('1', startTime);
                    }
                });
            });

            // Get picklist done/done skipped count
            flowController.on('1', function (startTime) {

                (consoleVar) ? console.log('1') : '';

                pickSubListModel.count({'endedBy': userId, 'status': {'$in': [31, 33]}, 'activeStatus': 1}, function (err, pickSubListDoneCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', pickSubListDoneCount, startTime);
                    }
                });
            });

            // Get User details with target capacity
            flowController.on('2', function (pickSubListDoneCount, startTime) {

                (consoleVar) ? console.log('2') : '';

                userModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: "User with userId " + userId + " not available in system.", status: 'error', statusCode: '500'});
                    } else {

                        var pickListData = {
                            targetCapacity: (userRow.targetCapacity) ? userRow.targetCapacity : 0,
                            totalWorkingHours: (userRow.totalWorkingHours) ? userRow.totalWorkingHours : 0,
                            pickSubListDoneCount: (pickSubListDoneCount) ? pickSubListDoneCount : 0
                        };

                        flowController.emit('3', pickListData, startTime);
                    }
                });
            });

            // Get details of active time and working hours
            flowController.on('3', function (pickListData, startTime) {

                (consoleVar) ? console.log('3') : '';

                hoursTrackingModel.findOne({'userId': userId, 'timeCreated': {'$gte': startTime}, 'activeStatus': 1}, function (err, hoursTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        pickListData.activeTime = (hoursTrackingRow != null) ? (hoursTrackingRow.activeTime) ? hoursTrackingRow.activeTime : 0 : 0

                        flowController.emit('END', pickListData);
                    }
                });
            });

            // End
            flowController.on('END', function (pickListData) {

                (consoleVar) ? console.log('END') : '';

                res.json({pickSubListDoneCount: pickListData.pickSubListDoneCount, targetCapacity: pickListData.targetCapacity, activeTime: pickListData.activeTime, totalWorkingHours: pickListData.totalWorkingHours, message: 'Operation Successful', status: 'success', statusCode: '200'});
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                (consoleVar) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------------------------------------
// Get putlist & picklist footer 
//---------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList-pickList/action/get/footer/')

        .post(function (req, res) {

            var consoleVar = 0;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (consoleVar) ? console.log(req.params) : '';

            var userId = req.body.userId.trim();

            var warehouseId = req.body.warehouseId.trim();

            var baseUrl = req.body.baseUrl.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.waterfall([
                    // Putlist footer details
                    function (waterfallcallback) {

                        (consoleVar) ? console.log('WATERFALL-1') : '';

                        var requestifyUrl = baseUrl + '/v1/processMaster/mobile/putList/action/get/footer/' + userId + '/' + warehouseId + '/';

                        requestify.get(requestifyUrl).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {

                                waterfallcallback(null, result);
                            }

                            if (result.status === 'error') {

                                waterfallcallback(null, result);
                            }
                        });
                    },
                    // Picklist footer details
                    function (putlistData, waterfallcallback) {

                        (consoleVar) ? console.log('WATERFALL-2') : '';

                        var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickList/action/get/footer/' + userId + '/' + warehouseId + '/';

                        requestify.get(requestifyUrl).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {

                                waterfallcallback(null, putlistData, result);
                            }

                            if (result.status === 'error') {

                                waterfallcallback(null, putlistData, result);
                            }
                        });
                    },
                    // 
                    function (putlistData, picklistData, waterfallcallback) {

                        warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (warehouseRow == null) {

                                waterfallcallback({message: 'Warehouse details not available in system!', status: 'error', statusCode: '500'});
                            } else if (!warehouseRow.autoBackLogTimeHours && !warehouseRow.autoBackLogTimeMinutes) {

                                waterfallcallback({message: 'Warehouse day end timing not set!', status: 'error', statusCode: '500'});
                            } else {
                                var date1 = moment(new Date()).format('YYYY-MM-DD');
                                timestamp = moment(date1).unix();
                                var endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                                var startTime = parseInt(endTime) - 86400;

                                waterfallcallback(null, putlistData, picklistData, startTime, endTime);
                            }
                        });
                    },
                    //
                    function (putlistData, picklistData, startTime, endTime, waterfallcallback) {

                        (consoleVar) ? console.log('WATERFALL-3') : '';

                        devicesTrackingModel.findOne({'userId': userId, 'status': 'LOGIN', 'timeCreated': {$gte: startTime}, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, devicesTrackingRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (devicesTrackingRow == null) {

                                waterfallcallback({message: "No tracking records for userId " + userId + " available in system!", status: 'error', statusCode: '500'});
                            } else {

                                var loggedInTimeArray = devicesTrackingRow.timestamp;

                                var activeTime = ((timeInInteger - loggedInTimeArray) + picklistData.activeTime) / 3600;

                                resultDataArray = [];

                                totalDoneListCount = (putlistData.putSubListDoneCount) + (picklistData.pickSubListDoneCount);

                                targetCapacity = picklistData.targetCapacity;
                                totalWorkingHours = picklistData.totalWorkingHours;

                                var targetActivityRate = round10((targetCapacity / totalWorkingHours), -2);

                                var currentActivityRate = (activeTime != 0) ? round10((totalDoneListCount / activeTime), -2) : 0;

                                var resultDataObject = {
                                    targetActivityRate: (targetActivityRate) ? targetActivityRate : 0,
                                    currentActivityRate: currentActivityRate ? currentActivityRate : 0
                                };

                                resultDataArray.push(resultDataObject);

                                waterfallcallback(null, resultDataArray);
                            }
                        });
                    }

                    // FInal
                ], function (err, result) {

                    if (err) {

                        flowController.emit('ERROR',{message: err, status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('END',{result: result, message: 'Operation Successful', status: 'success', statusCode: 200});
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
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific SYNC - Update sync status of sublist to create-and-send
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putSubList/action/get/footer/')

        .patch(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();

            var flowController = new EventEmitter();

            // Get putlist data
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                putSubListModel.count({'putListId': putListId, 'activeStatus': 1}, function (err, putSubListCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', putSubListCount);
                    }
                });
            });

            // Get timecount
            flowController.on('1', function (putSubListCount) {

                (showConsole) ? console.log('1') : '';

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: "Putlist details not available in system!", status: 'error', statusCode: '500'});

                    } else {

                        var putListData = {

                            pickActiveTime: (putListRow.resourceAssigned[0].pickActiveTime) ? (putListRow.resourceAssigned[0].pickActiveTime) : 0,
                            putSubListCount: putSubListCount ? putSubListCount : 0
                        };

                        flowController.emit('2', putListData);
                    }
                });
            });

            // Calculate 
            flowController.on('2', function (putListData) {

                (showConsole) ? console.log('2') : '';

                //console.log(putListData);

                var pickRate = round10((((putListData.putSubListCount) * 3600) / putListData.pickActiveTime), -2);

                //console.log(pickRate);

                flowController.emit('3', pickRate);
            });

            // Save details to putlist
            flowController.on('3', function (pickRate) {

                (showConsole) ? console.log('3') : '';

                var pickrate = pickRate ? pickRate : 0;

                var query = {'_id': putListId};
                var update = {'$set': {'pickRate': pickrate}};

                putListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', pickRate);
                    }
                });
            });

            // End
            flowController.on('END', function (pickRate) {

                (showConsole) ? console.log('END') : '';

                res.json({pickRate: pickRate, message: 'Operation Successful', status: 'success', statusCode: 304});
            });

            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // nitialize
            flowController.emit('START');
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------------
// Get pick line item footer data
//--------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/pickSubList/action/get/footer/')

        .patch(function (req, res) {

            var consoleVar = 0;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var pickListId = req.body.pickListId.trim();

            var lot = parseInt(req.body.lot);

            var deviceId = req.body.deviceId.trim();

            var flowController = new EventEmitter();

            // Get pickSubList Count
            flowController.on('START', function () { //results: { $elemMatch: { $gte: 80, $lt: 85 } }

                (consoleVar) ? console.log('START') : '';

                pickSubListModel.count({'pickListId': pickListId, 'status': 31, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}, 'activeStatus': 1}, function (err, pickSubListCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', pickSubListCount);
                    }
                });
            });

            // Get pick sublist time count
            flowController.on('1', function (pickSubListCount) {

                (consoleVar) ? console.log('1') : '';

                pickListModel.findOne({'_id': pickListId, 'resourceAssigned.deviceId': deviceId, 'activeStatus': 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (pickSubListRow == null) {

                        flowController.emit('ERROR', {message: "Picklist details not available in system.", status: 'error', statusCode: '500'});

                    } else {
                        //(consoleVar) ? console.log(pickSubListRow) : '';
                        //var resAssigned = pickSubListRow.resourceAssigned;
                        var pickActiveTime = 0;

                        async.eachSeries(pickSubListRow.resourceAssigned, function (element, callback) {

                            if (element.lot == lot && element.deviceId == deviceId) {

                                pickActiveTime = element.pickActiveTime;
                                //console.log(pickActiveTime);
                            }
                            setImmediate(callback);
                        }, function (err, result) {

                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '404'});
                            } else {

                                //console.log(pickActiveTime);
                                var pickSubListData = {

                                    pickActiveTime: (pickActiveTime) ? pickActiveTime : 0,
                                    pickSubListCount: (pickSubListCount) ? pickSubListCount : 0
                                };

                                flowController.emit('2', pickSubListData);
                            }
                        });
                    }
                });
            });

            // Get pickrate
            flowController.on('2', function (pickSubListData) {

                (consoleVar) ? console.log('2') : '';
                //(consoleVar) ? console.log(pickSubListData) : '';
                if (pickSubListData.pickActiveTime == 0) {

                    var pickRate = 0;
                    flowController.emit('3', pickRate);

                } else {
                    var pickRate = round10((((pickSubListData.pickSubListCount) * 3600) / pickSubListData.pickActiveTime), -2);

                    flowController.emit('3', pickRate);
                }
            });

            // Update pickrate to database
            flowController.on('3', function (pickRate) {

                (consoleVar) ? console.log('3') : '';

                var pickrate = pickRate ? pickRate : 0;

                var query = {'_id': pickListId};
                var update = {'$set': {'pickRate': pickrate}};

                pickListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', pickRate);
                    }
                });
            });

            // End
            flowController.on('END', function (pickRate) {

                (consoleVar) ? console.log('END') : '';

                res.json({pickRate: pickRate, message: 'Operation Successful', status: 'success', statusCode: 304});
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;