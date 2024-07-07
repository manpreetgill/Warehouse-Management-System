var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var requestify = require('requestify');
var round10 = require('round10').round10;
//----------------------------------------------------------------------------------------------------------------------------
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
//----------------------------------------------------------------------------------------------------------------------------
function pushToAry(name, val) {
    var obj = {};
    obj[name] = val;
    return obj;
}
//----------------------------------------------------------------------------------------------------------------------------
//DASHBOARD :    
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/pickList/read/pickRate/')

        .patch(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var startDate = req.body.startDate.trim();
            var endDate = req.body.endDate.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                pickListModel.aggregate(
                        [
                            {'$match': {'date': {$gte: startDate, $lte: endDate}}},
                            {'$sort': {'date': 1}},
                            {'$group': {'_id': '$date', sumOfPickRate: {'$sum': '$pickRate'}, totalPickList: {'$sum': 1}}},
                            {'$project': {average: {'$divide': ['$sumOfPickRate', '$totalPickList']}, totalPickList: '$totalPickList', totalPickRate: '$sumOfPickRate'}},
                            {'$sort': {'_id': 1}}
                        ],
                        function (err, result) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('END', {data: result, message: 'Operation Successful.', status: 'success', statusCode: '201'});
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
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
// PUT Away    
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/putList/read/putAway/')

        .patch(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var startDate = req.body.startDate.trim();
            var endDate = req.body.endDate.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                putListModel.aggregate(
                        [
                            {'$match': {'date': {$gte: startDate, $lte: endDate}}},
                            {'$sort': {'date': 1}},
                            {'$group': {'_id': '$date', totalPutList: {'$sum': 1}}},
                            {'$project': {average: {'$divide': ['$totalPutList', 24]}, totalPutList: '$totalPutList'}},
                            //{'$project': {average: round('$average', 2)},totalPutList:'$totalPutList' },
                            {
                                '$sort': {'_id': 1}
                            }
                        ],
                        function (err, result) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('END',{data: result, message: 'Operation Successful.', status: 'success', statusCode: '201'});
                            // Result is an array of documents
                        }
                );
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
//--------------------------------------------------------------------------------------------------------------------------------------------------------------             
//
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/pickSubList/read/itemSkipped/')

        .patch(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var startDate = req.body.startDate.trim();
            var endDate = req.body.endDate.trim();

            var flowController = new EventEmitter();

            // START
            flowController.on('START', function () {

                (consoleLog) ? console.log(req.body) : '';

                var pickListArr = [];

                pickListModel.find({'date': {$gte: startDate, $lte: endDate}, activeStatus: 1}).lean().exec(function (err, pickListrow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (pickListrow.length == 0) {

                        flowController.emit('ERROR', {message: 'No skipped line items available in Pick Process.', status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(pickListrow, function (element, callback) {
                            var data = {
                                pickListId: element._id,
                                date: element.date
                            };
                            pickListArr.push(data);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', pickListArr);
                            }
                        });
                    }
                });
            });

            // 
            flowController.on('1', function (pickListData) {

                (consoleLog) ? console.log(req.body) : '';

                var pickSubListArr = [];
                async.eachSeries(pickListData, function (element, callbackDone) {

                    pickSubListModel.find({'pickListId': element.pickListId, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {
                        if (err) {

                            callbackDone(err);
                        } else if (pickSubListRow.length == 0) {

                            callbackDone();
                        } else {

                            async.eachSeries(pickListData, function (elementpickSub, callback) {
                                var data = {

                                    pickSublistId: elementpickSub._id,
                                    date: element.date
                                };
                                pickSubListArr.push(data);
                                setImmediate(callback);
                            }, function (err) {

                                if (err) {
                                    callbackDone(err);
                                } else {

                                    callbackDone();
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', pickSubListArr);
                    }
                });
            });

            // END
            flowController.on('END', function (pickSubListArr) {

                (consoleLog) ? console.log(req.body) : '';

                async.groupBy(pickSubListArr, function (element, callback) {

                    return callback(null, element.date);
                }, function (err, result) {

                    res.json(result);
                    // result is object containing the userIds grouped by age
                    // e.g. { 30: ['userId1', 'userId3'], 42: ['userId2']};
                });
                //res.json(pickSubListArr);
            });

            // ERROR
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // START
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------
// get detailed-dashboard
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/user/read/detailed-dashboard/')

        .patch(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();

            var startDate = req.body.startDate;

            var endDate = req.body.endDate;

            var flowController = new EventEmitter();

            var startDate_timeStamp = (new Date(startDate).getTime()) / 1000;

            var endDate_timeStamp = ((new Date(endDate).getTime()) / 1000) + 86399;

            console.log(startDate_timeStamp + " " + endDate_timeStamp);

            var arrUser = [];

            var data = {};

            flowController.on('START', function () {

                console.log("START");

                warehouseUtilizationModel.find({'warehouseId': warehouseId, 'timeCreated': {$gte: startDate_timeStamp, $lte: endDate_timeStamp}, 'activeStatus': 1}).sort({'timeCreated': 1}).lean().exec(function (err, utilizationRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (utilizationRow.length == 0) {

                        var arrUser1 = [];

                        var PC = {

                            'OTS': 0,
                            'BPTO': 0,
                            'OFR': 0,
                            'LPPH': 0,
                            'OTRS': 0,
                            'IOHW': 0,
                            'ICA': 0,
                            'PHTH': 0,
                            'PWH': 0
                        };

                        var HR = {

                            'OCT': 0,
                            'DSCT': 0
                        };


                        var LN = {

                            'LPHO': 0,
                            'PAHO': 0,
                            'ISD': 0,
                            'TO': 0
                        };

                        var PHR = {

                            'OSPH': 0
                        }


                        var concat = {

                            PC: PC,
                            HR: HR,
                            LN: LN,
                            PHR: PHR,

                        };

                        var data1 = {

                            date: "",
                            Y: concat

                        };
                        arrUser1.push(data1);
                        flowController.emit('END', arrUser1);

                    } else {

                        console.log(utilizationRow.length);

                        async.eachSeries(utilizationRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    console.log("PC");  //onTimeShipment

                                    var PC = {

                                        'OTS': round10((element.onTimeShipment), -2) ? round10((element.onTimeShipment), -2) : 0, // One Time Shipment
                                        'BPTO': round10((element.totalBackOrders), -2) ? round10((element.totalBackOrders), -2) : 0, //Backorders as a Percent of Total Orders
                                        'OFR': round10((element.percentageOrderFillRate), -2) ? round10((element.percentageOrderFillRate), -2) : 0, //Order Fill Rate
                                        'LPPH': round10((element.linesPickedPerHour), -2) ? round10((element.linesPickedPerHour), -2) : 0, //Lines Picked Per Hour
                                        'OTRS': round10((element.onTimeShipment), -2) ? round10((element.onTimeShipment), -2) : 0, //On-Time ready to ship
                                        'IOHW': round10((element.inventoryOnHandWeight), -2) ? round10((element.inventoryOnHandWeight), -2) : 0, //inventoryOnHandWeight
                                        'ICA': 0, //Inventory Count Accuracy by amount /Units
                                        'PHTH': round10((element.todayProductiveHours), -2) ? round10((element.todayProductiveHours), -2) : 0, //Productive Hours to Total Hours
                                        'PWH': round10((element.productiveHoursPerOperator), -2) ? round10((element.todayProductiveHours), -2) : 0//Productive working Hours / Day /operator
                                    }
                                    waterfallcallback(null, PC);
                                },
                                function (PC, waterfallcallback) {

                                    console.log("HR");

                                    var HR = {

                                        'OCT': round10((element.orderCycleTimePerHour), -2) ? round10((element.orderCycleTimePerHour), -2) : 0, //Order cycle Time
                                        'DSCT': 0 //Dock-to-stock cycle time,in hour
                                    }

                                    waterfallcallback(null, PC, HR);
                                },

                                function (PC, HR, waterfallcallback) {

                                    console.log("LN");

                                    var LN = {

                                        'LPHO': round10((element.linesPickedPerHourPerOperator), -2) ? round10((element.linesPickedPerHourPerOperator), -2) : 0, //Lines Picked /hour/operator
                                        'PAHO': round10((element.putAwayPerHourPerOperator), -2) ? round10((element.putAwayPerHourPerOperator), -2) : 0, //Put-away /hour/operator
                                        'ISD': round10((element.itemSkipped), -2) ? round10((element.putAwayPerHourPerOperator), -2) : 0, //Items skipped / day
                                        'TO': round10((element.totalOrderNumber), -2) ? round10((element.totalOrderNumber), -2) : 0   //Total Orders
                                    };
                                    waterfallcallback(null, PC, HR, LN);
                                },

                                function (PC, HR, LN, waterfallcallback) {

                                    console.log("PHR");

                                    var PHR = {

                                        'OSPH': round10((element.orderShippedPerHour), -2) ? round10((element.orderShippedPerHour), -2) : 0  //Orders Shipped Per Hour
                                    };

                                    waterfallcallback(null, PC, HR, LN, PHR);
                                },
                                function (PC, HR, LN, PHR, waterfallcallback) {

                                    console.log("CONCAT");

                                    var concat = {

                                        PC: PC,
                                        HR: HR,
                                        LN: LN,
                                        PHR: PHR,

                                    };

                                    waterfallcallback(null, concat);


                                }], function (err, concat) {

                                console.log("waterfallcallback-LAST");

                                if (err) {

                                    callback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                                } else {

                                    data = {

                                        date: element.date,
                                        Y: concat

                                    };
                                    arrUser.push(data);
                                    setImmediate(callback);
                                }
                            });

                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});

                            } else {

                                console.log("callback-LAST");
                                flowController.emit('END', arrUser);
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
function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " " : " ") : "0";
    var mDisplay = m > 0 ? m + (m == 1 ? " " : " ") : "0";
    var sDisplay = s > 0 ? s + (s == 1 ? " " : " ") : "0";
    var hh = (hDisplay > 9) ? hDisplay : '0' + hDisplay;
    var mm = mDisplay > 9 ? mDisplay : '0' + mDisplay;
    var ss = sDisplay > 9 ? sDisplay : '0' + sDisplay;

    return hh + ":" + mm + ":" + ss;
}
;
//
//
module.exports = router;