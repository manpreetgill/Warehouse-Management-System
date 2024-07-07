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
var detailedCapacityModel = require('../../../models/mongodb/locationMaster-detailedCapacity/collection-detailedCapacity.js');
//----------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//-------------------------------------------------------------------------------------------------------------------------------
//Dasboard API
//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------------------------
function pushToAry(name, val) {
    var obj = {};
    obj[name] = val;
    return obj;
}
//---------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/process/read/activity-planner/summary/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            // START
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '500'});
                    } else if (!warehouseRow.autoBackLogTimeHours && !warehouseRow.autoBackLogTimeMinutes) {

                        flowController.emit('ERROR', {message: 'Warehouse day end timing not set!', status: 'error', statusCode: '500'});
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

            // GET PICKLIST STATUS DATA
            flowController.on('1', function (startTime, endTime) {

                (consoleLog) ? console.log('1') : '';

                async.waterfall([

                    function (waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-1') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 1, 'activeStatus': 1}, function (err, UnassignedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {


                                waterfallcallback(null, UnassignedCount);
                            }
                        });
                    },
                    function (UnassignedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-2') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 5, 'activeStatus': 1}, function (err, WithdrawnCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-3') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 11, 'activeStatus': 1}, function (err, ActivatedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-4') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 21, 'activeStatus': 1}, function (err, AssignedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-5') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 25, 'activeStatus': 1}, function (err, InprogressCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-6') : '';

                        pickSubListModel.count({'timeEnded': {$gte: startTime, $lte: endTime}, 'status': 31, 'activeStatus': 1}, function (err, DoneCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-7') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 35, 'activeStatus': 1}, function (err, DoneSkippedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-8') : '';

                        pickSubListModel.count({'timeCreated': {$lte: startTime}, 'status': {$ne: 31}, 'activeStatus': 1}, function (err, BacklogCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount);
                            }
                        });
                    },
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-9') : '';

                        var deviceArr = [];

                        pickListModel.find({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1}).lean().exec(function (err, pickListRow) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (pickListRow.length == 0) {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr);
                            } else {

                                async.eachSeries(pickListRow, function (element, callback) {

                                    async.eachSeries(element.resourceAssigned, function (elementdevice, callbackdevice) {

                                        deviceArr.push(elementdevice.deviceId);

                                        callbackdevice();
                                    }, function (err) {

                                        if (err) {

                                            callback({message: err, status: 'error', statusCode: '500'});
                                        } else {

                                            setImmediate(callback);
                                        }
                                    });
                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr);
                                    }
                                });
                            }
                        });
                    },
                    //Pendingfordrop//27
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-10') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 27, 'activeStatus': 1}, function (err, PendingfordropCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, PendingfordropCount);
                            }
                        });
                    },
                    //Skipped==33
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, PendingfordropCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-11') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 33, 'activeStatus': 1}, function (err, SkippedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, PendingfordropCount, SkippedCount);
                            }
                        });
                    },
                    //DonePartial==37
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, PendingfordropCount, SkippedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-12') : '';

                        pickSubListModel.count({'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 37, 'activeStatus': 1}, function (err, DonePartialCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, PendingfordropCount, SkippedCount, DonePartialCount);
                            }
                        });
                    },
                    //result
                    function (UnassignedCount, WithdrawnCount, ActivatedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, PendingfordropCount, SkippedCount, DonePartialCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-13') : '';

                        data = {
                            Unassigned: UnassignedCount,
                            Withdrawn: WithdrawnCount,
                            Pendingfordrop: PendingfordropCount,
                            Skipped: SkippedCount,
                            DonePartial: DonePartialCount,
                            Activated: ActivatedCount,
                            Assigned: AssignedCount,
                            Inprogress: InprogressCount,
                            Done: DoneCount,
                            DoneSkipped: DoneSkippedCount,
                            Backlog: BacklogCount,
                            deviceArr: deviceArr
                        };

                        waterfallcallback(null, data);
                    }
                ], function (err, pickListData) {

                    (consoleLog) ? console.log('WATERFALL-RESULT') : '';

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('1.1', pickListData, startTime, endTime);
                    }
                });
            });

            //
            flowController.on('1.1', function (pickListData, startTime, endTime) {

                (consoleLog) ? console.log('1.1') : '';

                var userArray = [];

                uniqueArray = pickListData.deviceArr.filter(function (elem, pos) {
                    return pickListData.deviceArr.indexOf(elem) == pos;
                });

                async.eachSeries(uniqueArray, function (element, callback) {

                    devicesTrackingModel.findOne({'deviceId': element, 'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1, "status": "LOGIN"}, function (err, deviceAllcation) {
                        if (err) {

                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (deviceAllcation == null) {

                            setImmediate(callback);
                        } else {

                            userArray.push(deviceAllcation.userId);
                            setImmediate(callback);
                        }
                    });

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {
                        data = {
                            Unassigned: pickListData.Unassigned,
                            Withdrawn: pickListData.Withdrawn,
                            Activated: pickListData.Activated,
                            Pendingfordrop: pickListData.Pendingfordrop,
                            Skipped: pickListData.Skipped,
                            DonePartial: pickListData.DonePartial,
                            Assigned: pickListData.Assigned,
                            Inprogress: pickListData.Inprogress,
                            Done: pickListData.Done,
                            DoneSkipped: pickListData.DoneSkipped,
                            Backlog: pickListData.Backlog,
                            deviceCount: uniqueArray.length,
                            userCount: userArray.length
                        };
                        flowController.emit('2', data, startTime, endTime);
                    }
                });
            });

            // GET PUTLIST STATUS DATA
            flowController.on('2', function (pickListData, startTime, endTime) {

                (consoleLog) ? console.log('2') : '';

                async.waterfall([
                    function (waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-1') : '';

                        putListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 1, 'activeStatus': 1}, function (err, UnassignedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount);
                            }
                        });
                    },
                    function (UnassignedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-2') : '';

                        putListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 21, 'activeStatus': 1}, function (err, AssignedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, AssignedCount);
                            }
                        });
                    },
                    function (UnassignedCount, AssignedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-3') : '';

                        putListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 25, 'activeStatus': 1}, function (err, InprogressCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, AssignedCount, InprogressCount);
                            }
                        });
                    },
                    function (UnassignedCount, AssignedCount, InprogressCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-4') : '';

                        putListModel.count({'warehouseId': warehouseId, 'timeCompleted': {$gte: startTime, $lte: endTime}, 'status': 31, 'activeStatus': 1}, function (err, DoneCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, AssignedCount, InprogressCount, DoneCount);
                            }
                        });
                    },
                    function (UnassignedCount, AssignedCount, InprogressCount, DoneCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-5') : '';

                        putListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 35, 'activeStatus': 1}, function (err, DoneSkippedCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount);
                            }
                        });
                    },
                    function (UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-6') : '';

                        putListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'status': 41, 'activeStatus': 1}, function (err, BacklogCount) {
                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount);
                            }
                        });
                    },
                    function (UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-7') : '';

                        var deviceArr = [];

                        putListModel.find({'warehouseId': warehouseId, 'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1}).lean().exec(function (err, putListRow) {
                            if (err) {

                            } else if (putListRow.length == 0) {

                                waterfallcallback(null, UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr);
                            } else {

                                async.eachSeries(putListRow, function (element, callback) {

                                    async.eachSeries(element.resourceAssigned, function (elementdevice, callbackdevice) {

                                        deviceArr.push(elementdevice.deviceId);

                                        callbackdevice();
                                    }, function (err) {

                                        if (err) {

                                            callback({message: err, status: 'error', statusCode: '500'});
                                        } else {

                                            setImmediate(callback);
                                        }
                                    });
                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr);
                                    }
                                });
                            }
                        });
                    },
                    function (UnassignedCount, AssignedCount, InprogressCount, DoneCount, DoneSkippedCount, BacklogCount, deviceArr, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL2-8') : '';

                        data = {
                            Unassigned: UnassignedCount,
                            Assigned: AssignedCount,
                            Inprogress: InprogressCount,
                            Done: DoneCount,
                            DoneSkipped: DoneSkippedCount,
                            Backlog: BacklogCount,
                            deviceArr: deviceArr
                        };
                        waterfallcallback(null, data);
                    }
                ], function (err, putListData) {

                    (consoleLog) ? console.log('WATERFALL2-RESULT') : '';

                    if (err) {
                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('2.1', pickListData, putListData, startTime, endTime);
                    }
                });
            });

            //
            flowController.on('2.1', function (pickListData, putListData, startTime, endTime) {

                (consoleLog) ? console.log('2.1') : '';

                var userArr = [];

                uniqueArray = putListData.deviceArr.filter(function (elem, pos) {
                    return putListData.deviceArr.indexOf(elem) == pos;
                });

                async.eachSeries(uniqueArray, function (element, callback) {

                    devicesTrackingModel.findOne({'deviceId': element, 'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1, "status": "LOGIN"}, function (err, deviceAllcation) {
                        if (err) {

                            callback(err);
                        } else if (deviceAllcation == null) {

                            setImmediate(callback);
                        } else {

                            userArr.push(deviceAllcation.userId);
                            setImmediate(callback);
                        }
                    });

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {
                        putListData1 = {
                            Unassigned: putListData.Unassigned,
                            Assigned: putListData.Assigned,
                            Inprogress: putListData.Inprogress,
                            Done: putListData.Done,
                            DoneSkipped: putListData.DoneSkipped,
                            Backlog: putListData.Backlog,
                            deviceCount: uniqueArray.length,
                            userCount: userArr.length
                        };
                        flowController.emit('3', pickListData, putListData1, startTime, endTime);
                    }
                });
            });

            // INWARD
            flowController.on('3', function (pickListData, putListData) {

                (consoleLog) ? console.log('3') : '';

                INWARD = {
                    Unassigned: 0,
                    //Withdrawn: 0,
                    //Activated: 0,
                    Assigned: 0,
                    Inprogress: 0,
                    Done: 0,
                    DoneSkipped: 0,
                    Backlog: 0,
                    deviceCount: 0,
                    userCount: 0
                };
                flowController.emit('4', pickListData, putListData, INWARD);
            });

            // STOCKCOUNT
            flowController.on('4', function (pickListData, putListData, INWARD) {

                (consoleLog) ? console.log('4') : '';

                STOCKCOUNT = {
                    Unassigned: 0,
                    // Withdrawn: 0,
                    // Activated: 0,
                    Assigned: 0,
                    Inprogress: 0,
                    Done: 0,
                    DoneSkipped: 0,
                    Backlog: 0,
                    deviceCount: 0,
                    userCount: 0
                };
                flowController.emit('5', pickListData, putListData, INWARD, STOCKCOUNT);
            });

            // CROSSDOCK
            flowController.on('5', function (pickListData, putListData, INWARD, STOCKCOUNT) {

                (consoleLog) ? console.log('5') : '';

                CROSSDOCK = {
                    Unassigned: 0,
                    //Withdrawn: 0,
                    //Activated: 0,
                    Assigned: 0,
                    Inprogress: 0,
                    Done: 0,
                    DoneSkipped: 0,
                    Backlog: 0,
                    deviceCount: 0,
                    userCount: 0
                };
                flowController.emit('6', pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK);
            });

            // PACKING
            flowController.on('6', function (pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK) {

                (consoleLog) ? console.log('6') : '';

                PACKING = {
                    Unassigned: 0,
                    // Withdrawn: 0,
                    //Activated: 0,
                    Assigned: 0,
                    Inprogress: 0,
                    Done: 0,
                    DoneSkipped: 0,
                    Backlog: 0,
                    deviceCount: 0,
                    userCount: 0
                };
                flowController.emit('7', pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK, PACKING);
            });

            //DISPATCH
            flowController.on('7', function (pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK, PACKING) {

                (consoleLog) ? console.log('7') : '';

                DISPATCH = {
                    Unassigned: 0,
                    //Withdrawn: 0,
                    //Activated: 0,
                    Assigned: 0,
                    Inprogress: 0,
                    Done: 0,
                    DoneSkipped: 0,
                    Backlog: 0,
                    deviceCount: 0,
                    userCount: 0
                };
                flowController.emit('8', pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH);
            });

            //LOADING
            flowController.on('8', function (pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH) {

                (consoleLog) ? console.log('8') : '';

                LOADING = {
                    Unassigned: 0,
                    //Withdrawn: 0,
                    //Activated: 0,
                    Assigned: 0,
                    Inprogress: 0,
                    Done: 0,
                    DoneSkipped: 0,
                    Backlog: 0,
                    deviceCount: 0,
                    userCount: 0
                };
                flowController.emit('9', pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);
            });

            // FINAL RESULT CONSOLIDATION
            flowController.on('9', function (pickListData, putListData, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING) {

                (consoleLog) ? console.log('9') : '';

                var finalArray = [];
                data = {
                    INWARD: INWARD,
                    PUTAWAY: putListData,
                    PICK: pickListData,
                    STOCKCOUNT: STOCKCOUNT,
                    CROSSDOCK: CROSSDOCK,
                    PACKING: PACKING,
                    DISPATCH: DISPATCH,
                    LOADING: LOADING
                };
                finalArray.push(data);

                flowController.emit('END', {data: finalArray, message: "Operation Successful.", status: 'success', statusCode: '200'})
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//-------------------------------------------------------------------------------------------------------------------------------
//Dasboard API
//-------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/user/read/detailedCapacity/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            var orderCycleTime = 0;

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

                        flowController.emit('1.1', startTime, endTime);
                    }
                });
            });

            //
            flowController.on('1.1', function (startTime, endTime) {

                (consoleLog) ? console.log('1.1') : '';

                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        var data = {};
                        data.PickLine = {};
                        data.PutLine = {};
                        data.orderCycleTime = {};
                        data.orderCompletion = {};
                        data.inventoryOnHandWeight = {};
                        data.inventoryOnHandPrice = {};
                        data.linesDispatched = {};
                        data.deviceInUse = {};
                        data.backOrders = {};
                        data.orderFillRate = {};

                        flowController.emit('END', data);
                    } else {

                        async.waterfall([
                            // Picklist count
                            function (waterfallcallback) {

                                (consoleLog) ? console.log('W1') : '';

                                pickSubListModel.count({'timeEnded': {'$gte': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {
                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        var pickRate = round10((pickDoneCount / ((timeInInteger - startTime) / 3600)), -2);

                                        var pickLine = {};
                                        pickLine.Actual = pickRate;
                                        pickLine.Target = warehouseRow.targetPickLines;

                                        waterfallcallback(null, startTime, pickLine, pickDoneCount);
                                    }
                                });
                            },
                            // putList count
                            function (startTime, pickLine, pickDoneCount, waterfallcallback) {

                                (consoleLog) ? console.log('W2') : '';

                                putListModel.count({'timeCompleted': {'$gte': startTime}, 'activeStatus': 1}, function (err, putDoneCount) {
                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        putLine = {};
                                        putLine.Actual = round10((putDoneCount / ((timeInInteger - startTime) / 3600)), -2);
                                        putLine.Target = warehouseRow.targetPutLines;
                                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount);
                                    }
                                });
                            },
                            // Total orders
                            function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, waterfallcallback) {

                                (consoleLog) ? console.log('W3') : '';

                                var orderNumberArray = [];

                                pickSubListModel.find({'activeStatus': 1, 'timeEnded': {'$gte': startTime}}).distinct('orderNumber', function (err, pickSubListRow) {
                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (pickSubListRow.length == 0) {

                                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray);
                                    } else {

                                        async.eachSeries(pickSubListRow, function (element, callback) {

                                            orderNumberArray.push(element);
                                            setImmediate(callback);

                                        }, function (err) {
                                            if (err)
                                                waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                            else
                                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray);
                                        });
                                    }
                                });
                            },
                            // 
                            function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, waterfallcallback) {

                                (consoleLog) ? console.log('W4') : '';

                                var orderDataArray = [];

                                async.eachSeries(orderNumberArray, function (element, callback) {

                                    pickSubListModel.find({'orderNumber': element, "status": 31, 'activeStatus': 1}).lean().exec(function (err, subListRow) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else if (subListRow.length == 0) {

                                            setImmediate(callback);
                                        } else {

                                            async.eachSeries(subListRow, function (element1, callback1) {

                                                var data = {};
                                                data.orderNumber = element;
                                                data.timeStarted = (element1.timeStarted) ? (element1.timeStarted) : 0;
                                                data.timeEnded = (element1.timeEnded) ? (element1.timeEnded) : 0;

                                                orderDataArray.push(data);
                                                setImmediate(callback1);

                                            }, function (err) {
                                                if (err)
                                                    callback(err);
                                                else
                                                    setImmediate(callback);
                                            });
                                        }
                                    });
                                }, function (err) {
                                    if (err)
                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderDataArray);
                                });
                            },
                            //
                            function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderDataArray, waterfallcallback) {

                                (consoleLog) ? console.log('W5') : '';

                                async.eachSeries(orderDataArray, function (element, callback) {

                                    orderCycleTime = orderCycleTime + (parseInt(element.timeEnded) - parseInt(element.timeStarted));
                                    setImmediate(callback);

                                }, function (err) {
                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderCycleTime);
                                });
                            },
                            //
                            function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderCycleTime, waterfallcallback) {

                                (consoleLog) ? console.log('W6') : '';

                                var orderCycleTimeInHrs = orderCycleTime / 3600;
                                var orderCycleTimePerHour = (orderNumberArray.length != 0) ? orderCycleTimeInHrs / orderNumberArray.length : 0;

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTimePerHour, orderNumberArray, orderCycleTimeInHrs);
                            },
                            // Order cycle time
                            function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTimePerHour, orderNumberArray, orderCycleTimeInHrs, waterfallcallback) {

                                (consoleLog) ? console.log('W7') : '';

                                var orderCycleTime = {};
                                orderCycleTime.Actual = round10(orderCycleTimePerHour, -2);
                                orderCycleTime.Target = warehouseRow.targetOrderCycleTime;

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime, orderNumberArray, orderCycleTimeInHrs);
                            },
                            // Order completion time
                            function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime, orderNumberArray, orderCycleTimeInHrs, waterfallcallback) {

                                (consoleLog) ? console.log('W8') : '';

                                var orderCompletion = {};
                                orderCompletion.Actual = (orderCycleTimeInHrs != 0) ? round10((orderNumberArray.length / orderCycleTimeInHrs), -2) : 0;
                                orderCompletion.Target = warehouseRow.targetOrderCompletion;

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderCompletion);
                            },
                            // Inventory on hand weight
                            function (startTime, pickLine, putLine, orderCycleTime, orderCompletion, waterfallcallback) {

                                (consoleLog) ? console.log('W9') : '';

                                var P1 = {'$match': {'activeStatus': 1}};
                                var P2 = {'$unwind': {'path': "$randomFields", preserveNullAndEmptyArrays: false}};
                                var P3 = {'$group': {'_id': '$id', 'total': {'$sum': '$randomFields.netWeight'}}};

                                itemStoreModel.aggregate([P1, P2, P3], function (err, result) {
                                    if (err) {

                                        throw err;
                                    } else {

                                        var inventoryOnHandWeight = {};
                                        inventoryOnHandWeight.Actual = (result.length != 0) ? round10((result[0].total / 1000), -2) : 0;
                                        inventoryOnHandWeight.Target = warehouseRow.targetInventoryHandWeight;

                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderCompletion, inventoryOnHandWeight);
                                    }
                                });
                            },
                            // Inventory on hand price
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-10') : '';
                                var totalPrice = 0;
                                var unit = '';

                                var P1 = {'$match': {'activeStatus': 1}};
                                var P2 = {'$unwind': {'path': "$randomFields", preserveNullAndEmptyArrays: false}};
                                var P3 = {'$group': {'_id': '$itemMasterId', 'total': {'$sum': '$randomFields.netWeight'}}};

                                itemStoreModel.aggregate([P1, P2, P3], function (err, result) {
                                    if (err) {
                                        throw err;
                                    } else {
                                        async.eachSeries(result, function (element, callback) {

                                            itemMasterModel.findOne({'_id': element._id, 'activeStatus': 1}, {'priceValue': 1, 'priceCurrency': 1}).exec(function (err, itemMasterRow) {
                                                if (err) {

                                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                } else if (itemMasterRow == null) {

                                                    setImmediate(callback);
                                                } else {
                                                    totalPrice += (itemMasterRow.priceValue) * (element.total);
                                                    unit = itemMasterRow.priceCurrency;
                                                    setImmediate(callback);
                                                }
                                            });
                                        }, function (err) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                var inventoryOnHandPrice = {};
                                                inventoryOnHandPrice.Actual = round10((totalPrice / 10000000), -2);
                                                inventoryOnHandPrice.Target = warehouseRow.targetInventoryHandPrice;
                                                inventoryOnHandPrice.Unit = unit;

                                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice);
                                            }
                                        });
                                    }
                                });
                            },
                            // Line Dispatched
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, waterfallcallback) {

                                (consoleLog) ? console.log('W11') : '';

                                pickSubListModel.count({'timeEnded': {'$gte': startTime, '$lte': endTime}, dropLocationAddress: "DISP", 'status': {$ne: 5}, 'activeStatus': 1}, function (err, pickDoneCount) {
                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount);
                                });
                            },
                            // 
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, waterfallcallback) {

                                (consoleLog) ? console.log('W12') : '';

                                pickSubListModel.count({dropLocationAddress: "DISP", 'status': {$nin: [31, 5]}, 'activeStatus': 1}, function (err, pickPendingCount) {

                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, pickPendingCount);
                                });
                            },
                            // 
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, pickPendingCount, waterfallcallback) {
                                (consoleLog) ? console.log('WATERFALL-11') : '';

                                putSubListModel.count({'timeEnded': {'$gte': startTime, '$lte': endTime}, dropLocationAddress: "DISP", 'status': {$ne: 5}, 'activeStatus': 1}, function (err, putDoneCount) {
                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, pickPendingCount, putDoneCount);
                                });
                            },
                            //
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, pickPendingCount, putDoneCount, waterfallcallback) {

                                (consoleLog) ? console.log('W12') : '';

                                putSubListModel.count({dropLocationAddress: "DISP", 'status': {$nin: [31, 5]}, 'activeStatus': 1}, function (err, putPendingCount) {
                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, pickPendingCount, putDoneCount, putPendingCount);
                                });
                            },
                            // lines dispatched
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, pickDoneCount, pickPendingCount, putDoneCount, putPendingCount, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-13') : '';

                                var linesDispatched = {};
                                linesDispatched.Actual = pickDoneCount + putDoneCount;
                                linesDispatched.Target = pickDoneCount + pickPendingCount + putDoneCount + putPendingCount;

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched);
                            },
                            // Device in use 1
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, waterfallcallback) {

                                (consoleLog) ? console.log('W14') : '';

                                var deviceArr = [];

                                deviceMastersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).lean().exec(function (err, deviceMasterRow) {

                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (deviceMasterRow.length == 0) {

                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceArr, deviceMasterRow);
                                    } else {

                                        async.eachSeries(deviceMasterRow, function (element, callback) {

                                            devicesTrackingModel.findOne({'deviceId': element._id, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceRow) {
                                                if (err) {

                                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                } else if (deviceRow == null) {

                                                    setImmediate(callback);
                                                } else if (deviceRow.status == 'LOGIN' || deviceRow.status == 'ONLINE') {

                                                    deviceArr.push(deviceRow.deviceId);
                                                    setImmediate(callback);
                                                } else {

                                                    setImmediate(callback);
                                                }
                                            });
                                        }, function (err) {
                                            if (err)
                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            else
                                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceArr, deviceMasterRow);
                                        });
                                    }
                                });
                            },
                            // device in use 2
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceArr, deviceMasterRow, waterfallcallback) {

                                (consoleLog) ? console.log('W15') : '';

                                var deviceInUse = {};
                                deviceInUse.Actual = deviceArr.length;
                                deviceInUse.Target = deviceMasterRow.length;

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse);
                            },
                            // Backlogged picklists
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, waterfallcallback) {

                                (consoleLog) ? console.log('W16') : '';

                                pickSubListModel.count({'status': 41, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickBackOrderCount) {
                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, pickBackOrderCount);
                                });
                            },
                            // Backlogged Putlist
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, pickBackOrderCount, waterfallcallback) {

                                (consoleLog) ? console.log('W17') : '';

                                putListModel.count({'status': 41, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putBackOrderCount) {
                                    if (err)
                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, pickBackOrderCount, putBackOrderCount);
                                });
                            },
                            // Total back orders
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, pickBackOrderCount, putBackOrderCount, waterfallcallback) {

                                (consoleLog) ? console.log('W18') : '';

                                var backOrders = {};
                                backOrders.Actual = pickBackOrderCount + putBackOrderCount;
                                backOrders.Target = warehouseRow.targetBackOrder;

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders);
                            },
                            // Order fill rate
                            // Start - get all distinct order number //usersModel
                            function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-19') : '';

                                var orderNumberArray = [];

                                pickSubListModel.find({'activeStatus': 1, 'timeCreated': {'$gte': startTime}}).distinct('orderNumber', function (err, pickSubListRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (pickSubListRow.length == 0) {

                                        waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderNumberArray);
                                    } else {

                                        async.eachSeries(pickSubListRow, function (element, callback) {

                                            var data = {};
                                            data.orderNumber = element;
                                            orderNumberArray.push(data);
                                            setImmediate(callback);

                                        }, function (err) {
                                            if (err)
                                                waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                            else
                                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderNumberArray);
                                        });
                                    }
                                });
                            },
                            // 
                            function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderNumberArray, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-20') : '';

                                var doneListArray = [];

                                async.eachSeries(orderNumberArray, function (element, callback) {

                                    pickSubListModel.count({'orderNumber': element.orderNumber, 'status': 31, 'activeStatus': 1}, function (err, subListDoneCount) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            var data = {};
                                            data.orderNumber = element.orderNumber;
                                            data.totalDoneList = subListDoneCount;
                                            doneListArray.push(data);
                                            setImmediate(callback);
                                        }
                                    });
                                }, function (err) {
                                    if (err)
                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, doneListArray);
                                });
                            },
                            //
                            function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, doneListArray, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-21') : '';

                                var totalListArray = [];

                                async.eachSeries(doneListArray, function (element, callback) {

                                    pickSubListModel.count({'orderNumber': element.orderNumber, 'activeStatus': 1}, function (err, subListCount) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            var data = {};
                                            data.orderNumber = element.orderNumber;
                                            data.totalDoneList = element.totalDoneList;
                                            data.totalList = subListCount;

                                            totalListArray.push(data);
                                            setImmediate(callback);
                                        }
                                    });
                                }, function (err) {
                                    if (err)
                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, totalListArray);
                                });
                            },
                            //
                            function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, totalListArray, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-22') : '';

                                var doneCount = 0;

                                async.eachSeries(totalListArray, function (element, callback) {

                                    (element.totalList === element.totalDoneList) ? doneCount++ : '';
                                    setImmediate(callback);

                                }, function (err) {
                                    if (err)
                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    else
                                        waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, totalListArray, doneCount);
                                });
                            },
                            // 
                            function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, totalListArray, doneCount, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-23') : '';

                                var orderFillRatePercentage = (totalListArray.length != 0) ? (doneCount * 100) / (totalListArray.length) : 0;

                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderFillRatePercentage);
                            },
                            // Order fill rate
                            function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderFillRatePercentage, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-24') : '';

                                var orderFillRate = {};
                                orderFillRate.Actual = round10(orderFillRatePercentage, -2);
                                orderFillRate.Target = warehouseRow.targetOrderFillRate;

                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderFillRate);
                            }
                            // End
                        ], function (err, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, linesDispatched, deviceInUse, backOrders, orderFillRate) {

                            (consoleLog) ? console.log('WATERFALL-RESULT') : '';
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                resultData = {};
                                resultData.PickLine = pickLine;
                                resultData.PutLine = putLine;
                                resultData.orderCycleTime = orderCycleTime;
                                resultData.orderCompletion = orderComplition;
                                resultData.inventoryOnHandWeight = inventoryOnHandWeight;
                                resultData.inventoryOnHandPrice = inventoryOnHandPrice;
                                resultData.linesDispatched = linesDispatched;
                                resultData.deviceInUse = deviceInUse;
                                resultData.backOrders = backOrders;
                                resultData.orderFillRate = orderFillRate;

                                flowController.emit('END', resultData);
                            }
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';

                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//-------------------------------------------------------------------------------------------------------------------------------
//Dasboard API
//-------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/device/read/deviceData/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            var date = moment(new Date()).format('DD/MM/YY');

            var arrUser = [];

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

                        flowController.emit('1', startTime, endTime);
                    }
                });
            });

            //
            flowController.on('1', function (startTime, endTime) {

                (consoleLog) ? console.log('1') : '';

                deviceMastersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).lean().exec(function (err, deviceMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (deviceMasterRow.length == 0) {

                        data = {
                            userName: "",
                            userId:"",
                            PICK: {},
                            PUT: {},
                            INWARD: {},
                            STOCKCOUNT: {},
                            CROSSDOCK: {},
                            PACKING: {},
                            DISPATCH: {},
                            LOADING: {},
                            SPARE: {}
                        };

                        var DeviceName = "";
                        var objectToPush = pushToAry(DeviceName, data);
                        arrUser.push(objectToPush);

                        flowController.emit('END', arrUser);

                    } else {

                        async.eachSeries(deviceMasterRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    pickSubListModel.count({'resourceAssigned.deviceId': element._id, 'timeAssigned': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickCount) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else {

                                            waterfallcallback(null, pickCount);
                                        }
                                    });
                                },
                                function (pickCount, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    pickSubListModel.count({'resourceAssigned.deviceId': element._id, 'status': 31, 'timeEnded': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else {

                                            var pickArray = {

                                                Count: pickCount,
                                                Done: pickDoneCount,
                                                Percentage: (((pickDoneCount) * 100) / pickCount) == "NaN" || "undefined" || "null" ? 0 : (((pickDoneCount) * 100) / pickCount)
                                            };

                                            waterfallcallback(null, pickArray, pickCount);
                                        }
                                    });
                                },
                                function (pickArray, pickCount, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    putListModel.count({'resourceAssigned.deviceId': element._id, 'timeAssigned': {'$gt': startTime}, 'activeStatus': 1}, function (err, putCount) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else {

                                            waterfallcallback(null, pickArray, pickCount, putCount);
                                        }
                                    });
                                },
                                function (pickArray, pickCount, putCount, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    putListModel.count({'resourceAssigned.deviceId': element._id, 'status': 31, 'timeCompleted': {'$gt': startTime}, 'activeStatus': 1}, function (err, putDoneCount) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else {

                                            var putArray = {

                                                Count: putCount,
                                                Done: putDoneCount,
                                                Percentage: (((putDoneCount) * 100) / putCount) == "NaN" || "undefined" || "null" ? 0 : (((putDoneCount) * 100) / putCount)
                                            };

                                            waterfallcallback(null, pickArray, putArray, pickCount, putCount);
                                        }
                                    });
                                },
                                function (pickArray, putArray, pickCount, putCount, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var INWARD = {

                                        Count: 0,
                                        Done: 0,
                                        Percentage: 0,
                                    };

                                    waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD);

                                },

                                function (pickArray, putArray, pickCount, putCount, INWARD, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var STOCKCOUNT = {

                                        Count: 0,
                                        Done: 0,
                                        Percentage: 0
                                    };

                                    waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT);

                                },

                                function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var CROSSDOCK = {

                                        Count: 0,
                                        Done: 0,
                                        Percentage: 0
                                    };

                                    waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK);

                                },

                                function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var PACKING = {

                                        Count: 0,
                                        Done: 0,
                                        Percentage: 0
                                    };

                                    waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING);

                                },

                                function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var DISPATCH = {

                                        Count: 0,
                                        Done: 0,
                                        Percentage: 0
                                    };

                                    waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH);

                                },

                                function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var LOADING = {

                                        Count: 0,
                                        Done: 0,
                                        Percentage: 0
                                    };

                                    waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);
                                },

                                function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    var targetCapacity = (element.targetCapacity) ? (element.targetCapacity) : 0;
                                    var spareCapacity = (targetCapacity - (putCount + pickCount));

                                    if (targetCapacity == 0) {

                                        var spareArray = {

                                            targetCapacity: targetCapacity,
                                            Number: spareCapacity ? spareCapacity : 0,
                                            Percentage: "ERROR"
                                        };

                                        waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);

                                    } else {

                                        var spareArray = {

                                            targetCapacity: targetCapacity,
                                            Number: spareCapacity ? spareCapacity : 0,
                                            Percentage: (((spareCapacity * 100) / targetCapacity).toFixed(2)) == "NaN" ? 0 : (((spareCapacity * 100) / targetCapacity).toFixed(2))
                                        };

                                        waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);
                                    }
                                },

                                function (pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    devicesTrackingModel.findOne({'deviceId': element._id, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceRow) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else if (deviceRow == null) {

                                           waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, "");
                                      
                                        } else if(deviceRow.status == 'LOGIN' || deviceRow.status == 'ONLINE') {

                                            var userData = {

                                                userId: deviceRow.userId
                                            };

                                            waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, userData);
                                        
                                        }else{
                                            deviceRow.userId = "";
                                            var userData = {

                                                userId: deviceRow.userId
                                            }
                                             waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, userData);
                                        }
                                    });

                                },

                                function (pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, userData, waterfallcallback) {

                                    (consoleLog) ? console.log('START') : '';

                                    usersModel.findOne({'_id': userData.userId, 'activeStatus': 1}, function (err, userRow) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else if (userRow == null) {

                                            waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, "","");

                                        } else {

                                            var firstName = (userRow.firstName).charAt(0).toUpperCase() + (userRow.firstName).slice(1);
                                            var lastName = (userRow.lastName).charAt(0).toUpperCase() + (userRow.lastName).slice(1);
                                            var userName = firstName + ' ' + lastName;
                                            var userId = userRow._id;


                                            waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, userName,userId);
                                        }
                                    });
                                }
                            ], function (err, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, userName,userId) {

                                (consoleLog) ? console.log('START') : '';

                                if (err) {

                                    setImmediate(callback);

                                } else {

                                    data = {
                                        userName: userName ? userName : "",
                                        userId:userId,
                                        PICK: pickArray,
                                        PUT: putArray,
                                        INWARD: INWARD,
                                        STOCKCOUNT: STOCKCOUNT,
                                        CROSSDOCK: CROSSDOCK,
                                        PACKING: PACKING,
                                        DISPATCH: DISPATCH,
                                        LOADING: LOADING,
                                        SPARE: spareArray
                                    };

                                    var DeviceName = (element.name) ? element.name : "";
                                    var objectToPush = pushToAry(DeviceName, data);
                                    arrUser.push(objectToPush);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', arrUser);
                            }
                        });
                    }
                });
            });

            //
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            //
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            //
            flowController.emit('START');
        });
//
//                
//-------------------------------------------------------------------------------------------------------------------------------
//Dasboard API
//-------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/user/read/userData/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim(); //INWARD,'PUTAWAY', 'PICK', 'STOCKCOUNT', 'CROSSDOCK', 'PACKING/QA', 'DISPATCH', 'LOADING'

            var flowController = new EventEmitter();

            var date = moment(new Date()).format('DD/MM/YY');

            var arrUser = [];

            //
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system!!', status: 'error', statusCode: '404'});
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

            //
            flowController.on('1.1', function (startTime, endTime) {

                (consoleLog) ? console.log('1.1') : '';

                userTypesModel.findOne({'warehouseId': warehouseId, 'name': 'OPERATOR', 'activeStatus': 1}, function (err, userTypeRow) {

                    var userTypeId = userTypeRow._id;
                    flowController.emit('1.2', startTime, endTime, userTypeId)
                });
            });

            //
            flowController.on('1.2', function (startTime, endTime, userTypeId) {

                (consoleLog) ? console.log('1.2') : '';

                var userArray = [];

                usersModel.find({'warehouseId': warehouseId, 'userTypeId': userTypeId, 'activeStatus': 1}).lean().exec(function (err, userRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (userRow.length == 0) {
                        var data = {
                            deviceName: "",
                            userName: "",
                            id: "",
                            PICK: {},
                            PUT: {},
                            INWARD: {},
                            STOCKCOUNT: {},
                            CROSSDOCK: {},
                            PACKING: {},
                            DISPATCH: {},
                            LOADING: {},
                            SPARE: {}
                        };
                        var name = "";
                        var objectToPush = pushToAry(name, data);
                        arrUser.push(objectToPush);

                        flowController.emit('END', arrUser);

                    } else {

                        async.eachSeries(userRow, function (element, callback) {

                            devicesTrackingModel.findOne({'userId': element._id, 'timeCreated': {'$gte': startTime}, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (deviceTrackingRow == null) {
                                    setImmediate(callback);
                                } else if (deviceTrackingRow != null) {
                                    userArray.push(element);
                                    setImmediate(callback);
                                }
                            });

                        }, function (err) {
                            if (err) {
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                if (userArray.length == 0) {
                                    var data = {
                                        deviceName: "",
                                        userName: "",
                                        id: "",
                                        PICK: {},
                                        PUT: {},
                                        INWARD: {},
                                        STOCKCOUNT: {},
                                        CROSSDOCK: {},
                                        PACKING: {},
                                        DISPATCH: {},
                                        LOADING: {},
                                        SPARE: {}
                                    };
                                    var name = "";
                                    var objectToPush = pushToAry(name, data);
                                    arrUser.push(objectToPush);

                                    flowController.emit('END', arrUser);

                                } else {
                                    async.eachSeries(userArray, function (element, callback) {

                                        async.waterfall([

                                            function (waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-1') : '';

                                                pickSubListModel.count({'assignedTo': element._id, 'timeAssigned': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickCount) {

                                                    if (err) {

                                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                    } else {

                                                        waterfallcallback(null, pickCount);
                                                    }
                                                });
                                            },
                                            function (pickCount, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-2') : '';

                                                pickSubListModel.count({'assignedTo': element._id, 'endedBy': element._id, 'timeEnded': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

                                                    if (err) {

                                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
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

                                                putListModel.count({'assignedTo': element._id, 'timeAssigned': {'$gt': startTime}, 'activeStatus': 1}, function (err, putCount) {

                                                    if (err) {

                                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                    } else {

                                                        waterfallcallback(null, pickArray, pickCount, putCount);
                                                    }
                                                });
                                            },
                                            function (pickArray, pickCount, putCount, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-4') : '';

                                                putListModel.count({'assignedTo': element._id, 'completedBy': element._id, 'timeCompleted': {'$gt': startTime}, 'activeStatus': 1}, function (err, putDoneCount) {

                                                    if (err) {

                                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                    } else {

                                                        var putArray = {

                                                            Count: putCount,
                                                            Done: putDoneCount,
                                                            Percentage: (((putDoneCount) * 100) / putCount) ? (((putDoneCount) * 100) / putCount) : 0,
                                                        };

                                                        waterfallcallback(null, pickArray, putArray, pickCount, putCount);
                                                    }
                                                });
                                            },
                                            function (pickArray, putArray, pickCount, putCount, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-5') : '';

                                                var INWARD = {

                                                    Count: 0,
                                                    Done: 0,
                                                    Percentage: 0,
                                                };

                                                waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD);

                                            },

                                            function (pickArray, putArray, pickCount, putCount, INWARD, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-6') : '';

                                                var STOCKCOUNT = {

                                                    Count: 0,
                                                    Done: 0,
                                                    Percentage: 0,
                                                };

                                                waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT);

                                            },

                                            function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-7') : '';

                                                var CROSSDOCK = {

                                                    Count: 0,
                                                    Done: 0,
                                                    Percentage: 0,
                                                };

                                                waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK);

                                            },

                                            function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-8') : '';

                                                var PACKING = {

                                                    Count: 0,
                                                    Done: 0,
                                                    Percentage: 0,
                                                };

                                                waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING);

                                            },

                                            function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-9') : '';

                                                var DISPATCH = {

                                                    Count: 0,
                                                    Done: 0,
                                                    Percentage: 0,
                                                };

                                                waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH);

                                            },

                                            function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-10') : '';

                                                var LOADING = {

                                                    Count: 0,
                                                    Done: 0,
                                                    Percentage: 0,
                                                };

                                                waterfallcallback(null, pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);

                                            },

                                            function (pickArray, putArray, pickCount, putCount, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING, waterfallcallback) {

                                                (consoleLog) ? console.log('WATERFALL-11') : '';

                                                var targetCapacity = (element.targetCapacity) ? (element.targetCapacity) : 0;
                                                var spareCapacity = (targetCapacity - (putCount + pickCount)) ? (targetCapacity - (putCount + pickCount)) : 0;

                                                if (targetCapacity == 0) {
                                                    var spareArray = {

                                                        targetCapacity: targetCapacity,
                                                        Number: spareCapacity ? spareCapacity : 0,
                                                        Percentage: "ERROR"
                                                    };

                                                    waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);

                                                } else {
                                                    var spareArray = {

                                                        targetCapacity: targetCapacity,
                                                        Number: spareCapacity ? spareCapacity : 0,
                                                        Percentage: (((spareCapacity * 100) / targetCapacity).toFixed(2)) == "NaN" ? 0 : (((spareCapacity * 100) / targetCapacity).toFixed(2))
                                                    };

                                                    waterfallcallback(null, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING);
                                                }
                                            }
                                        ], function (err, pickArray, putArray, spareArray, INWARD, STOCKCOUNT, CROSSDOCK, PACKING, DISPATCH, LOADING) {

                                            (consoleLog) ? console.log('WATERFALL-12') : '';

                                            if (err) {

                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                            } else {

                                                devicesTrackingModel.findOne({'userId': element._id, 'timeCreated': {'$gte': startTime}, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {

                                                    if (err) {

                                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                    } else if (deviceTrackingRow.status == 'LOGIN' || deviceTrackingRow.status == 'ONLINE') {

                                                        deviceMastersModel.findOne({'_id': deviceTrackingRow.deviceId, 'activeStatus': 1}).lean().exec(function (err, deviceMasterRow) {

                                                            if (err) {

                                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                            } else if (deviceMasterRow != null) {

                                                                data = {
                                                                    deviceName: deviceMasterRow.name,
                                                                    userName: element.userName,
                                                                    id: element._id,
                                                                    PICK: pickArray,
                                                                    PUT: putArray,
                                                                    INWARD: INWARD,
                                                                    STOCKCOUNT: STOCKCOUNT,
                                                                    CROSSDOCK: CROSSDOCK,
                                                                    PACKING: PACKING,
                                                                    DISPATCH: DISPATCH,
                                                                    LOADING: LOADING,
                                                                    SPARE: spareArray
                                                                };

                                                                var firstName = (element.firstName).charAt(0).toUpperCase() + (element.firstName).slice(1);
                                                                var lastName = (element.lastName).charAt(0).toUpperCase() + (element.lastName).slice(1);
                                                                var name = firstName + ' ' + lastName;
                                                                var objectToPush = pushToAry(name, data);
                                                                arrUser.push(objectToPush);
                                                                setImmediate(callback);
                                                            }
                                                        });
                                                    } else {
                                                        data = {
                                                            deviceName: "",
                                                            userName: element.userName,
                                                            id: element._id,
                                                            PICK: pickArray,
                                                            PUT: putArray,
                                                            INWARD: INWARD,
                                                            STOCKCOUNT: STOCKCOUNT,
                                                            CROSSDOCK: CROSSDOCK,
                                                            PACKING: PACKING,
                                                            DISPATCH: DISPATCH,
                                                            LOADING: LOADING,
                                                            SPARE: spareArray
                                                        };

                                                        var firstName = (element.firstName).charAt(0).toUpperCase() + (element.firstName).slice(1);
                                                        var lastName = (element.lastName).charAt(0).toUpperCase() + (element.lastName).slice(1);
                                                        var name = firstName + ' ' + lastName;
                                                        var objectToPush = pushToAry(name, data);
                                                        arrUser.push(objectToPush);
                                                        setImmediate(callback);
                                                    }
                                                });


                                            }
                                        });
                                    }, function (err) {

                                        (consoleLog) ? console.log('WATERFALL-RESULT') : '';

                                        if (err) {

                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('END', arrUser);
                                        }

                                    });
                                }
                            }
                        });
                    }
                });
            });

            //
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('START') : '';

                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            //
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('START') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // START
            flowController.emit('START');
        });
        
//
//
//--------------------------------------------------------------------------------------------------------------------------
// Update detailed dashboard data
//--------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/action/inventory/activity-update/')

        .post(function (req, res) {

            var consoleLog = 1;

            console.log(req.body);

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var flowController = new EventEmitter();

            // get start and end time
            flowController.on('START', function () {

                (consoleLog) ? console.log('START-invetory-capacity') : '';

                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse data remove from system!!1', status: 'error', statusCode: '404'});
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

            //
            flowController.on('1.1', function (startTime, endTime) {

                (consoleLog) ? console.log('1.1') : '';

                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});

                    } else if (warehouseRow == null) {

                        var data = {
                            inventoryOnHandWeight: {},
                            inventoryOnHandPrice: {},
                            warehouseUtilization: {}
                        };

                        flowController.emit('2', data);

                    } else {

                        async.waterfall([
                            //// Inventory on hand weight
                            function (waterfallcallback) {

                                (consoleLog) ? console.log('waterfallcallback=1') : '';

                                itemStoreModel.aggregate([
                                    {'$match': {'activeStatus': 1}},
                                    {'$unwind': {'path': "$randomFields", preserveNullAndEmptyArrays: false}},
                                    {'$group': {'_id': '$id', 'total': {'$sum': '$randomFields.netWeight'}}}
                                ], function (err, result) {
                                    if (err) {
                                        throw err;
                                    } else {
                                        var inventoryOnHandWeight = {
                                            Actual: (result.length != 0) ? round10((result[0].total / 1000), -2) : 0,
                                            Target: warehouseRow.targetInventoryHandWeight
                                        };
                                        waterfallcallback(null, inventoryOnHandWeight);
                                    }
                                });
                            },
                            // Inventory on hand price
                            function (inventoryOnHandWeight, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-2') : '';
                                var totalPrice = 0;
                                var unit = '';
                                itemStoreModel.aggregate([
                                    {'$match': {'activeStatus': 1}},
                                    {'$unwind': {'path': "$randomFields", preserveNullAndEmptyArrays: false}},
                                    {'$group': {'_id': '$itemMasterId', 'total': {'$sum': '$randomFields.netWeight'}}}
                                ], function (err, result) {
                                    if (err) {
                                        throw err;
                                    } else {
                                        async.eachSeries(result, function (element, callback) {

                                            itemMasterModel.findOne({'_id': element._id, 'activeStatus': 1}).lean().exec(function (err, itemMasterRow) {

                                                if (err) {

                                                    waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});

                                                } else if (itemMasterRow == null) {

                                                    callback();
                                                } else {
                                                    totalPrice += (itemMasterRow.priceValue) * (element.total);
                                                    unit = itemMasterRow.priceCurrency;
                                                    callback();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else {
                                                console.log("result " + totalPrice);
                                                var inventoryOnHandPrice = {
                                                    Actual: round10((totalPrice / 10000000), -2),
                                                    Target: warehouseRow.targetInventoryHandPrice,
                                                    Unit: unit
                                                };

                                                waterfallcallback(null, inventoryOnHandWeight, inventoryOnHandPrice);
                                            }
                                        });
                                    }
                                });
                            },

                            // Warehouse utilization
                            function (inventoryOnHandWeight, inventoryOnHandPrice, waterfallcallback) {
                                (consoleLog) ? console.log('WATERFALL-3') : '';

                                var locationArray = [];

                                locationStoreModel.find({'warehouseId': warehouseRow._id, 'activeStatus': 1}).lean().exec(function (err, locationRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                    } else if (locationRow.length == 0) {

                                        waterfallcallback(null, inventoryOnHandWeight, inventoryOnHandPrice, locationArray);
                                    } else {

                                        async.eachSeries(locationRow, function (element, callback) {

                                            var userDefined = parseInt((element.locationProperties[0].userDefinedCapacity) ? element.locationProperties[0].userDefinedCapacity : '0');

                                            var utilized = (userDefined) - (element.availableCapacity);

                                            var data = {
                                                systemAddress: element.systemAddress,
                                                customerAddress: (element.customerAddress) ? element.customerAddress : '',
                                                userDefinedCapacity: userDefined,
                                                availableCapacity: element.availableCapacity,
                                                utilizedCapacity: utilized,
                                                weightedUtilization: (userDefined != 0) ? utilized / userDefined : 0,
                                                percentageUtilization: (userDefined != 0) ? (utilized * 100) / userDefined : 0
                                            };

                                            locationArray.push(data);
                                            setImmediate(callback);

                                        }, function (err) {

                                            if (err) {

                                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                waterfallcallback(null, inventoryOnHandWeight, inventoryOnHandPrice, locationArray);
                                            }
                                        });
                                    }
                                });
                            },

                            function (inventoryOnHandWeight, inventoryOnHandPrice, locationArray, waterfallcallback) {
                                (consoleLog) ? console.log('WATERFALL-4') : '';

                                var totalLocations = 0;
                                var totalWeightedUtilization = 0;
                                var totalPercentageUtilization = 0;

                                async.eachSeries(locationArray, function (element, callback) {

                                    totalLocations = totalLocations + 1;
                                    totalWeightedUtilization = totalWeightedUtilization + element.weightedUtilization;
                                    totalPercentageUtilization = totalPercentageUtilization + element.percentageUtilization;
                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        var weightedUtilization = totalWeightedUtilization / totalLocations;
                                        var percentageUtilization = totalPercentageUtilization / totalLocations;

                                        waterfallcallback(null, inventoryOnHandWeight, inventoryOnHandPrice, percentageUtilization);
                                    }
                                });
                            },
                            // Warehouse utilization
                            function (inventoryOnHandWeight, inventoryOnHandPrice, percentageUtilization, waterfallcallback) {

                                (consoleLog) ? console.log('WATERFALL-5') : '';

                                var warehouseUtilization = {

                                    Actual: round10(percentageUtilization, -2),
                                    Target: warehouseRow.targetWarehouseUtilization

                                };

                                waterfallcallback(null, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization);
                            }
                            // End waterfall
                        ], function (err, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization) {

                            (consoleLog) ? console.log('WATERFALL-RESULT') : '';

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                data = {
                                    inventoryOnHandWeight: inventoryOnHandWeight,
                                    inventoryOnHandPrice: inventoryOnHandPrice,
                                    warehouseUtilization: warehouseUtilization
                                };

                                flowController.emit('2', data);
                            }
                        });
                    }
                });
            });

            // Insert data
            flowController.on('2', function (data) {

                (consoleLog) ? console.log('DATA-INSERT') : '';

                detailedCapacityModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, dataRow) {

                    if (err) {

                        waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});

                    } else if (dataRow.length == 0) {

                        var newDetailedCapacityModel = new detailedCapacityModel();

                        newDetailedCapacityModel.warehouseId = warehouseId;
                        newDetailedCapacityModel.date = moment(new Date()).format('DD/MM/YY');
                        newDetailedCapacityModel.inventoryOnHandPrice = data.inventoryOnHandPrice;
                        newDetailedCapacityModel.inventoryOnHandWeight = data.inventoryOnHandWeight;
                        newDetailedCapacityModel.warehouseUtilization = data.warehouseUtilization;
                        newDetailedCapacityModel.timestamp = timeInInteger;
                        newDetailedCapacityModel.timeCreated = timeInInteger;

                        newDetailedCapacityModel.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'operation successful', status: 'success', statusCode: '200'});
                            }
                        });
                    } else {

                        var query = {'warehouseId': warehouseId};
                        var update = {'$set': {
                                'warehouseId': warehouseId,
                                'inventoryOnHandPrice': data.inventoryOnHandPrice,
                                'inventoryOnHandWeight': data.inventoryOnHandWeight,
                                'warehouseUtilization': data.warehouseUtilization,
                                'timestamp': timeInInteger,
                                'timeCreated': timeInInteger
                            }};

                        detailedCapacityModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'operation successful', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });


            });
            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;