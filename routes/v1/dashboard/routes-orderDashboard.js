var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var requestify = require('requestify');
var round10 = require('round10').round10;
//-------------------------------------------------------------------------------------------------------------------------------
var warehouseUtilizationModel = require('../../../models/mongodb/locationMaster-warehouseUtilization/collection-warehouseUtilization');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var userTypesModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var alertService = require('../../../service-factory/alertService');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var deviceAllocationsModel = require('../../../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var logger = require('../../../logger/logger.js');
//-------------------------------------------------------------------------------------------------------------------------------
//Dasboard API
//-------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/user/read/orderData/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim(); //INWARD,'PUTAWAY', 'PICK', 'STOCKCOUNT', 'CROSSDOCK', 'PACKING/QA', 'DISPATCH', 'LOADING'

            var flowController = new EventEmitter();

            var date = moment(new Date()).format('DD/MM/YY');

            var arrUser = [];

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

                        flowController.emit('1.1', startTime, endTime);
                    }
                });
            });

            flowController.on('1.1', function (startTime, endTime) {

                console.log("startTime" + startTime);

                (consoleLog) ? console.log('1.1') : '';

                pickSubListModel.find({'timeCreated': {'$gte': startTime}, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {


                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (pickSubListRow.length == 0) {

                        data = {
                            orderNumber: "",
                            itemDescription: "",
                            pickList: "",
                            mergedPickLists: [],
                            //deviceName: deviceName,
                            //userName: userName,
                            picker: "",
                            assigned: "",
                            status: ""
                        };

                        // var orderNumber = (element.orderNumber);
                        // var objectToPush = pushToAry(orderNumber,data);
                        arrUser.push(data);
                        flowController.emit('END', arrUser);

                    } else {
                        console.log("timeCreated" + pickSubListRow.timeCreated);
                        async.eachSeries(pickSubListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    (consoleLog) ? console.log('WATERFALL-1') : '';

                                    var deviceName = "";
                                    var deviceId = "";

                                    if ((element.resourceAssigned).length != 0) {

                                        deviceMastersModel.findOne({'_id': element.resourceAssigned[0].deviceId, 'activeStatus': 1}, function (err, deviceRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                            } else if (deviceRow == null) {

                                                waterfallcallback(null, deviceName, deviceId);

                                            } else {

                                                deviceName = deviceRow.name;
                                                deviceId = deviceRow._id;

                                                waterfallcallback(null, deviceName, deviceId);
                                            }
                                        });

                                    } else {

                                        waterfallcallback(null, deviceName, deviceId);

                                    }
                                },

                                function (deviceName, deviceId, waterfallcallback) {

                                    (consoleLog) ? console.log('WATERFALL-2') : '';

                                    var userId = '';

                                    console.log(deviceId);

                                    if (deviceId == '') {

                                        waterfallcallback(null, deviceName, userId);

                                    } else {

                                        devicesTrackingModel.findOne({'deviceId': deviceId, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                            } else if (deviceRow == null) {

                                                waterfallcallback(null, deviceName, userId);

                                            } else {

                                                if (deviceRow.status == "LOGOUT") {
                                                    //userId = "";
                                                    waterfallcallback(null, deviceName, userId);

                                                } else {

                                                    userId = deviceRow.userId;
                                                    waterfallcallback(null, deviceName, userId);
                                                }
                                            }
                                        });
                                    }
                                },

                                function (deviceName, userId, waterfallcallback) {

                                    (consoleLog) ? console.log('WATERFALL-3') : '';

                                    if (userId == "") {

                                        waterfallcallback(null, deviceName, userId, "");

                                    } else {

                                        usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                            } else if (userRow == null) {

                                                waterfallcallback(null, deviceName, userId, "");

                                            } else {

                                                var firstName = (userRow.firstName).charAt(0).toUpperCase() + (userRow.firstName).slice(1);
                                                var lastName = (userRow.lastName).charAt(0).toUpperCase() + (userRow.lastName).slice(1);
                                                var userName = firstName + ' ' + lastName;

                                                waterfallcallback(null, deviceName, userId, userName);
                                            }
                                        });
                                    }

                                },
                                function (deviceName, userId, userName, waterfallcallback) {

                                    (consoleLog) ? console.log('WATERFALL-4') : '';

                                    if (element.timeAssigned == undefined) {

                                        waterfallcallback(null, deviceName, userId, userName, '');

                                    } else {

                                        var timeAssigned = element.timeAssigned;

                                        console.log(timeAssigned);

                                        var assignedTime = moment(timeAssigned).format("DD-MM-YY HH:mm");

                                        waterfallcallback(null, deviceName, userId, userName, assignedTime);

                                    }

                                },
                                function (deviceName, userId, userName, assignedTime, waterfallcallback) {

                                    (consoleLog) ? console.log('WATERFALL-5') : '';

                                    var pickListId = String(element.pickListId);

                                    pickListModel.find({'timeCreated': {'$gt': startTime}, 'mergedPickLists': pickListId, 'activeStatus': 1}).lean().exec(function (err, thisPickListRow) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else if (thisPickListRow.length == 0) {

                                            waterfallcallback(null, deviceName, userId, userName, assignedTime, []);

                                        } else {

                                            var mergedPickListArray = [];

                                            async.eachSeries(thisPickListRow, function (element2, callback2) {

                                                mergedPickListArray.push(element2.name);
                                                callback2();

                                            }, function (err) {

                                                waterfallcallback(null, deviceName, userId, userName, assignedTime, mergedPickListArray);
                                            });

                                        }
                                    });
                                },

                                function (deviceName, userId, userName, assignedTime, mergedPickListArray, waterfallcallback) {

                                    (consoleLog) ? console.log('WATERFALL-6') : '';

                                    pickListModel.findOne({'_id': element.pickListId, 'activeStatus': 1}, function (err, pickRow) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else if (pickRow == null) {

                                            waterfallcallback(null, deviceName, userId, userName, assignedTime, mergedPickListArray, "");

                                        } else {

                                            var pickListName = pickRow.name;


                                            waterfallcallback(null, deviceName, userId, userName, assignedTime, mergedPickListArray, pickListName);
                                        }
                                    });

                                }
                            ], function (err, deviceName, userId, userName, assignedTime, mergedPickListArray, pickListName) {

                                (consoleLog) ? console.log('WATERFALL-7') : '';

                                if (err) {

                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    if (element.orderNumber) {

                                        data = {
                                            orderNumber: element.orderNumber,
                                            itemDescription: element.itemDescription,
                                            pickList: pickListName,
                                            mergedPickLists: mergedPickListArray,
                                            picker: deviceName + "/" + userName,
                                            assigned: assignedTime,
                                            status: element.status
                                        };
                                        arrUser.push(data);
                                        setImmediate(callback);
                                    } else {

                                        setImmediate(callback);

                                    }

                                }
                            });

                        }, function (err) {

                            (consoleLog) ? console.log('WATERFALL-RESULT') : '';

                            if (err) {
                                console.log(err);
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {
                                if (arrUser.length <= 0) {
                                    data = {
                                        orderNumber: "",
                                        itemDescription: "",
                                        pickList: "",
                                        mergedPickLists: [],
                                        //deviceName: deviceName,
                                        //userName: userName,
                                        picker: "",
                                        assigned: "",
                                        status: ""
                                    };
                                    arrUser.push(data);
                                }
                                console.log(arrUser);
                                flowController.emit('END', arrUser);
                            }

                        });
                    }
                });
            });

            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
module.exports = router;
