var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var underscore = require('underscore');
//----------------------------------------------------------------------------------------------------------------------------
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var deviceAllocationsModel = require('../../../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var logger = require('../../../logger/logger.js');
//------------------------------------------------------------------------------------------------------------------------
// get user operator for dashboard
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/user/read/operator-specific-dashboard/activity/:warehouseId/:userId/')

        .get(function (req, res) {


            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var userId = req.params.userId.trim();

            var flowController = new EventEmitter();
            //
            //
            flowController.on('START', function () {
                console.log("START");

                usersModel.findOne({_id: userId, warehouseId: warehouseId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {data: [], message: "userMaster data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', userRow);
                    }
                });
            });
            //
            //
            flowController.on('1', function (userRow) {

                var date = moment(new Date()).format('DD/MM/YY');

                var userId = userRow._id;

                async.waterfall([

                    //idleTime
                    function (waterfallcallback) {

                        hoursTrackingModel.find({userId: userId, date: date, "activeStatus": 1}, function (err, hoursTrackingRow) {
                            if (err) {

                                waterfallcallback(err);
                            } else if (hoursTrackingRow.length == 0) {

                                devicesTrackingModel.find({userId: userId, date: date, "activeStatus": 1}).sort({'timeCreated': -1}).exec(function (err, devicesTrackingRow) {
                                    if (err) {

                                        waterfallcallback(err);//flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                    } else if (devicesTrackingRow.length == 0) {

                                        waterfallcallback(null, 0, 0);
                                        //flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "devicesTracking data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {
                                        //timeCreated
                                        var activeTime = timeInInteger - devicesTrackingRow[0].timeCreated;
                                        waterfallcallback(null, 0, activeTime);
                                    }
                                });
                            } else {

                                var idleTime = hoursTrackingRow[0].idleTime ? hoursTrackingRow[0].idleTime : 0;
                                var totalActiveHours = 0;

                                async.eachSeries(hoursTrackingRow, function (element, callbackDone) {

                                    totalActiveHours = totalActiveHours + element.activeTime;
                                    setImmediate(callbackDone);
                                }, function (err) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else {

                                        waterfallcallback(null, idleTime, totalActiveHours);
                                    }
                                });
                            }
                        });
                    },
                    //login Status
                    function (idleTime, totalActiveHours, waterfallcallback) {

                        devicesTrackingModel.find({userId: userId, date: date, "activeStatus": 1}).sort({'timeCreated': -1}).exec(function (err, devicesTrackingRow) {
                            if (err) {

                                waterfallcallback(err);//flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else if (devicesTrackingRow.length == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, "", "");
                                //flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "devicesTracking data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                            } else {

                                var loginStatus = devicesTrackingRow[0].status ? devicesTrackingRow[0].status : "";
                                var deviceId = devicesTrackingRow[0].deviceId;

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId);
                            }
                        });
                    },
                    //lineRate
                    function (idleTime, totalActiveHours, loginStatus, deviceId, waterfallcallback) {

                        var lineCount = 0;
                        var pickActiveTime = 0;
                        var date1 = moment(new Date()).format('YYYY-MM-DD');
                        timestamp1 = moment(date1).unix();

                        if (deviceId) {

                            pickListModel.find({'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'endedBy': userId}}, 'timeCompleted': {$gt: timestamp1}, "warehouseId": warehouseId, status: {$in: [31, 35]}, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, pickListRow) {

                                if (err) {

                                    waterfallcallback(err);
                                } else if (pickListRow.length == 0) {

                                    waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, '0');
                                } else {

                                    async.eachSeries(pickListRow, function (element1, callbackDone1) {

                                        //resourceAssigned
                                        async.eachSeries(element1.resourceAssigned, function (element2, callbackDone2) {

                                            if (deviceId == element2.deviceId) {

                                                lineCount = lineCount + element2.capacityAssigned;
                                                pickActiveTime = pickActiveTime + element2.pickActiveTime;
                                                setImmediate(callbackDone2);
                                            } else {

                                                setImmediate(callbackDone2);
                                            }
                                        }, function (err) {
                                            if (err) {

                                                callbackDone1(err);
                                            } else {

                                                setImmediate(callbackDone1);
                                            }
                                        });
                                    }, function (err) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else {

                                            var lineRate = parseInt(lineCount) / (parseFloat(pickActiveTime) / 3600);

                                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate.toFixed(2));
                                        }
                                    });
                                }
                            });
                        } else {

                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, '0');
                        }
                    },
                    //current status pick 
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, waterfallcallback) {

                        var date1 = moment(new Date()).format('YYYY-MM-DD');
                        timestamp = moment(date1).unix();

                        var pickListArray = [];

                        var currentStatusPick = '';

                        pickSubListModel.find({'resourceAssigned.deviceId': deviceId, 'assignedTo': userId, 'timeStarted': {$gt: timestamp}, "status": {$gt: 21, $lt: 41}, 'activeStatus': 1}).sort({'timeStarted': -1}).exec(function (err, pickListRow) {

                            if (err) {

                                waterfallcallback(err);
                            } else if (pickListRow.length == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusPick);
                            } else {


                                if (pickListRow[0].status == 25)
                                    currentStatusPick = 'In progress';
                                else if (pickListRow[0].status == 27)
                                    currentStatusPick = 'Pending for drop';
                                else if (pickListRow[0].status == 31)
                                    currentStatusPick = 'Done';
                                else if (pickListRow[0].status == 35)
                                    currentStatusPick = 'Done Skipped ';
                                else if (pickListRow[0].status == 33)
                                    currentStatusPick = 'Skipped';
                                else
                                    currentStatusPick = '-';

                                data = {
                                    currentStatus: currentStatusPick,
                                    SubList: "PICK",
                                    timestamp: pickListRow[0].timeStarted
                                };
                                pickListArray.push(data);

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, pickListArray);
                            }
                        });
                    },
                    //current put
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, pickListArray, waterfallcallback) {

                        var date1 = moment(new Date()).format('YYYY-MM-DD');
                        timestamp = moment(date1).unix();

                        var currentStatusPut = '';
                        var putlistArray = [];

                        putSubListModel.find({'startedBy': userId, 'timeStarted': {$gt: timestamp}, "status": {$gt: 21, $lt: 35}, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, putSubListRow) {

                            if (err) {

                                waterfallcallback(err);
                            } else if (putSubListRow.length == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, pickListArray);
                            } else {

                                if (putSubListRow[0].status == 25)
                                    currentStatusPut = 'In progress';
                                else if (putSubListRow[0].status == 31)
                                    currentStatusPut = 'Done';
                                else if (putSubListRow[0].status == 35)
                                    currentStatusPut = 'Done Skipped ';
                                else if (putSubListRow[0].status == 33)
                                    currentStatusPut = 'Skipped';
                                data = {
                                    currentStatus: currentStatusPut,
                                    SubList: "PUT",
                                    timestamp: putSubListRow[0].timeStarted
                                };
                                putlistArray.push(data);

                                var currentStatusArr = underscore.union(pickListArray, putlistArray);

                                currentStatusArr.sort(function (a, b) {
                                    return b.timestamp - a.timestamp;
                                });

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr);
                            }
                        });
                    },
                    //deviceName
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, waterfallcallback) {

                        if (deviceId) {

                            deviceMastersModel.findOne({_id: deviceId, activeStatus: 1}, function (err, deviceRow) {
                                if (err) {

                                    waterfallcallback(err);
                                } else if (deviceRow == null) {

                                    waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, "");
                                } else {

                                    var deviceName = deviceRow.name ? deviceRow.name : "";
                                    waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName);
                                }
                            });
                        } else {

                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, "");
                        }
                    },
                    //MHE allowed
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, waterfallcallback) {

                        var MHEArray = [];

                        if (userRow.materialHandlingUnitId.length == 0) {


                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray);
                        } else {

                            async.eachSeries(userRow.materialHandlingUnitId, function (element, callbackDone) {

                                materialHandlingMasterModel.findOne({_id: element, activeStatus: 1}, function (err, MHERow) {
                                    if (err) {

                                        callbackDone(err);
                                    } else if (MHERow == null) {

                                        setImmediate(callbackDone);
                                    } else {

                                        MHEArray.push(MHERow.name);
                                        setImmediate(callbackDone);
                                    }
                                });

                            }, function (err) {
                                if (err) {

                                    waterfallcallback(err);
                                } else {

                                    waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray);
                                }
                            });
                        }
                    },
                    //DeviceAllowed
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, waterfallcallback) {

                        deviceAllocationsModel.find({"userId": userId, "activeStatus": 1}, function (err, deviceAllocationRow) {
                            if (err) {

                                waterfallcallback(err);
                            } else if (deviceAllocationRow.length == 0) {

                                deviceAllocationRowArr = [];
                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviceAllocationRowArr);
                            } else {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviceAllocationRow);
                            }
                        });
                    },
                    //Device Name
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviceAllocationRow, waterfallcallback) {

                        deviveNameArray = [];

                        if (deviceAllocationRow.length !== 0) {

                            async.eachSeries(deviceAllocationRow, function (element, callbackDone) {

                                deviceMastersModel.findOne({_id: element.deviceId, activeStatus: 1}, function (err, deviceRow) {
                                    if (err) {

                                        callbackDone(err);
                                    } else if (deviceRow == null) {

                                        setImmediate(callbackDone);
                                        // waterfallcallback(null, idleTime, loginStatus, currentLoginDevice, MHEArray, deviceAllocationRow);
                                    } else {

                                        deviveNameArray.push(deviceRow.name);
                                        setImmediate(callbackDone);
                                    }
                                });
                            }, function (err) {
                                if (err) {

                                    waterfallcallback(err);
                                } else {

                                    waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray);
                                }
                            });
                        } else {

                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray);
                        }
                    },
                    //breakTime
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, waterfallcallback) {

                        var loginFirstArray = [];
                        var loginLogoutArray = [];
                        var timeStampCheck;
                        var logoutTime = '';
                        var breakTime = 0;

                        devicesTrackingModel.find({userId: userId, date: date, "activeStatus": 1}).sort({'timeCreated': 1}).exec(function (err, devicesTrackingRow) {
                            if (err) {

                                waterfallcallback(err);//flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else if (devicesTrackingRow.length == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime);
                                //flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "devicesTracking data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                            } else {

                                async.eachSeries(devicesTrackingRow, function (element, callbackDone) {

                                    if (element.status == "LOGIN" || element.status == "LOGOUT") {

                                        if (loginFirstArray.length == 0 && element.status == "LOGIN") {

                                            loginFirstArray.push(element);
                                            timeStampCheck = element.timestamp;
                                            setImmediate(callbackDone);
                                        } else {

                                            if (element.timestamp >= timeStampCheck) {

                                                if (logoutTime) {

                                                    breakTime += element.timestamp - parseInt(logoutTime);
                                                    logoutTime = '';
                                                    setImmediate(callbackDone);
                                                } else {

                                                    logoutTime = element.timestamp;
                                                    setImmediate(callbackDone);
                                                }
                                            } else {

                                                setImmediate(callbackDone);
                                            }
                                        }

                                    } else {
                                        setImmediate(callbackDone);
                                    }
                                }, function (err) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else {

                                        waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime);
                                    }
                                });
                            }
                        });
                    },
                    //pickCount Rate
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, waterfallcallback) {
                        var date1 = moment(new Date()).format('YYYY-MM-DD');
                        timestamp1 = moment(date1).unix();

                        pickSubListModel.count({'resourceAssigned.deviceId': deviceId, 'endedBy': userId, 'timeEnded': {$gt: timestamp1}, "status": {$in: [31, 35]}, 'activeStatus': 1}).exec(function (err, pickSubListCount) {

                            if (err) {

                                waterfallcallback(err);
                            } else if (pickSubListCount == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, pickSubListCount);
                            } else {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, pickSubListCount);
                            }
                        });
                    },
                    //putCount and activity Rate
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, pickSubListCount, waterfallcallback) {

                        var date1 = moment(new Date()).format('YYYY-MM-DD');
                        timestamp1 = moment(date1).unix();

                        putSubListModel.count({'endedBy': userId, 'timeStarted': {$gt: timestamp1}, "status": {$in: [31, 35]}, 'activeStatus': 1}).exec(function (err, putCount) {

                            if (err) {

                                waterfallcallback(err);
                            } else if (putCount == 0) {

                                var activityRate = (parseFloat(pickSubListCount) + parseFloat(putCount)) / (parseFloat(totalActiveHours) / 3600);

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate);
                            } else {


                                var activityRate = (parseFloat(pickSubListCount) + parseFloat(putCount)) / (parseFloat(totalActiveHours) / 3600);

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate);
                            }
                        });
                    },
                    //put Rate
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, waterfallcallback) {

                        var date1 = moment(new Date()).format('YYYY-MM-DD');
                        timestamp1 = moment(date1).unix();
                        var putActiveTime = 0;
                        var putListTime = 0;

                        putSubListModel.find({'endedBy': userId, 'timeEnded': {$gt: timestamp1}, "status": {$in: [31, 35]}, 'activeStatus': 1}).sort({'timeCreated': 1}).exec(function (err, putListRow) {

                            if (err) {

                                waterfallcallback(err);
                            } else if (putListRow.length == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, 0);

                            } else {

                                async.eachSeries(putListRow, function (element, callbackDone) {
                                    //putListCount++;
                                    putListTime = putListTime + element.timeEnded - element.timeStarted;
                                    setImmediate(callbackDone);
                                }, function (err) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else {

                                        var timeHours = (parseFloat(putListTime) / 3600);

                                        if (timeHours == 0) {

                                            var putRate = 0;
                                        } else {

                                            var putRate = parseInt(putListRow.length) / parseFloat(timeHours);
                                        }
                                        waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate);
                                    }
                                });
                                // waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusPick, currentStatusPut, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, pickListRow);
                            }
                        });
                    },
                    //materialHandlingMasterModel
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate, waterfallcallback) {


                        devicesTrackingModel.find({userId: userId, deviceId: deviceId, status: "LOGIN", date: date, "activeStatus": 1}).sort({'timeCreated': -1}).exec(function (err, devicesTrackingRow) {
                            if (err) {

                                waterfallcallback(err);//flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else if (devicesTrackingRow.length == 0) {

                                waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate, "-");
                                //flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "devicesTracking data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                            } else {

                                if (devicesTrackingRow[0].status == "LOGIN") {

                                    var selectedMHE = devicesTrackingRow[0].selectedMHE;

                                    materialHandlingMasterModel.findOne({'_id': selectedMHE, 'activeStatus': 1}).exec(function (err, materialHandlingMasterRow) {

                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (materialHandlingMasterRow == null) {

                                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate, "-");

                                        } else {

                                            nameMHE = materialHandlingMasterRow.name ? materialHandlingMasterRow.name : "";

                                            waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate, nameMHE);
                                        }
                                    });
                                } else {

                                    waterfallcallback(null, idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate, "-");
                                }
                            }
                        });

                    },
                    //result
                    function (idleTime, totalActiveHours, loginStatus, deviceId, lineRate, currentStatusArr, deviceName, MHEArray, deviveNameArray, breakTime, activityRate, putRate, nameMHE, waterfallcallback) {
                        var userLicense = '';

                        if (userRow.allocatedLicenseId) {
                            userLicense = "YES";
                        } else {
                            userLicense = "NO";
                        }
                        object = {

                            fullname: userRow.firstName + " " + userRow.lastName,
                            idleTime: secondsToHms(idleTime),
                            totalActiveHours: secondsToHms(totalActiveHours),
                            loginStatus: loginStatus,
                            lineRate: lineRate,
                            currentStatus: currentStatusArr.length !== 0 ? currentStatusArr[0].SubList : "-",
                            deviceName: deviceName,
                            MHEArray: MHEArray,
                            deviveNameArray: deviveNameArray,
                            userLicense: userLicense,
                            activityRate: activityRate ? activityRate.toFixed(2) : "0",
                            MHESelected: nameMHE,
                            productiveTime: secondsToHms(parseFloat(totalActiveHours) - parseFloat(idleTime)),
                            breakTime: secondsToHms(breakTime),
                            putRate: putRate ? putRate.toFixed(2) : "0",

                        };
                        waterfallcallback(null, object);
                    },
                ], function (err, result) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', result);
                    }
                });
            });
            //
            flowController.on('END', function (result) {
                //res.json(result);
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

//------------------------------------------------------------------------------------------------------------------------
// get user specific for dashboard
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/dashboardMaster/masterData/user/read/user-specific-dashboard/:warehouseId/:userId/:showKey/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var userId = req.params.userId.trim();

            var showKey = req.params.showKey.trim();
            // var limit = parseInt(req.query.limit);
            //var page = parseInt(req.query.page);
            //var startDate = req.params.startDate;

            //var endDate = req.params.endDate;

            var flowController = new EventEmitter();
            //
            flowController.on('START', function () {
                console.log("START");

                usersModel.findOne({_id: userId, warehouseId: warehouseId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {data: [], message: "userMaster data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', userRow);
                    }
                });
            });
            //device
            flowController.on('2', function (userRow) {

                console.log("2");
                deviceArray = [];

                var date = moment(new Date()).format('DD/MM/YY');

                devicesTrackingModel.find({userId: userRow._id, date: date, "activeStatus": 1}).sort({'timeCreated': -1}).exec(function (err, devicesTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (devicesTrackingRow.length == 0) {

                        flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "devicesTracking data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {


                        var deviceId = devicesTrackingRow[0].deviceId;

                        async.eachSeries(devicesTrackingRow, function (element, callbackDone) {

                            deviceMastersModel.findOne({_id: element.deviceId, activeStatus: 1}, function (err, deviceRow) {
                                if (err) {

                                    callbackDone(err);
                                } else if (deviceRow == null) {

                                    var data = {
                                        userId: userRow._id,
                                        deviceId: element.deviceId,
                                        deviceName: "",
                                        status: element.status,
                                        date: element.date,
                                        batteryStatus: element.battery,
                                        username: userRow.username,
                                        firstName: userRow.firstName,
                                        lastName: userRow.lastName,
                                        DateTime: (element.timestamp) ? moment.unix(element.timestamp).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                        //data: ActivityData
                                    };

                                    deviceArray.push(data);
                                    setImmediate(callbackDone);
                                } else {

                                    var data = {
                                        userId: userRow._id,
                                        deviceId: element.deviceId,
                                        deviceName: deviceRow.name,
                                        status: element.status,
                                        date: element.date,
                                        batteryStatus: element.battery,
                                        username: userRow.username,
                                        firstName: userRow.firstName,
                                        lastName: userRow.lastName,
                                        DateTime: (element.timestamp) ? moment.unix(element.timestamp).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                        //data: ActivityData
                                    };

                                    deviceArray.push(data);
                                    setImmediate(callbackDone);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                if (showKey == "PICK") {

                                    flowController.emit('3', userRow, deviceId);
                                } else if (showKey == "PUT") {

                                    flowController.emit('4', userRow, deviceId);
                                } else {

                                    devicesTrackingModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                                        if (err) {

                                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                        } else {

                                            devicesTrackingModel.count({userId: userRow._id, "activeStatus": 1}, function (err, searchCount) {
                                                if (err) {

                                                } else {

                                                    flowController.emit('END', {data: deviceArray, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });
            //
            //pickList
            flowController.on('3', function (userRow, deviceId) {
                console.log("3");

                var userArray = [];

                pickListModel.find({'resourceAssigned': {$elemMatch: {'deviceId': deviceId, startedBy: userRow._id}}, "warehouseId": warehouseId, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, pickListRow) {

                    if (err) {

                        //callbackDone(err);
                    } else if (pickListRow.length == 0) {
                        flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "pick Sub List missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                        //setImmediate(callbackDone);
                    } else {

                        async.eachSeries(pickListRow, function (element1, callbackDone1) {

                            pickSubListModel.find({'pickListId': element1._id, 'activeStatus': 1}, function (err, pickSubListRow) {
                                if (err) {

                                    callbackDone1(err);
                                } else if (pickSubListRow.length == 0) {

                                    setImmediate(callbackDone1);
                                } else {

                                    async.eachSeries(pickSubListRow, function (element2, callbackDone2) {

                                        var status = "";
                                        if (element2.status == 1)
                                            status = 'Unassigned';
                                        else if (element2.status == 5)
                                            status = 'Withdrawn';
                                        else if (element2.status == 11)
                                            status = 'Activated';
                                        else if (element2.status == 21)
                                            status = 'Assigned';
                                        else if (element2.status == 25)
                                            status = 'In progress';
                                        else if (element2.status == 31)
                                            status = 'Done';
                                        else if (element2.status == 35)
                                            status = 'Done Skipped ';
                                        else if (element2.status == 33)
                                            status = 'Skipped';
                                        else if (element2.status == 41)
                                            status = 'Backlog';
                                        data = {
                                            userId: userRow._id,
                                            username: userRow.username,
                                            firstName: userRow.firstName,
                                            lastName: userRow.lastName,
                                            pickListName: element1.name,
                                            pickRate: element1.pickRate,
                                            status: status,
                                            pickLocationAddress: element2.pickLocationAddress,
                                            dropLocationAddress: element2.dropLocationAddress,
                                            itemCode: element2.itemCode ? element2.itemCode : "-",
                                            itemValue: element2.itemValue ? element2.itemValue : "-",
                                            itemType: element2.itemType ? element2.itemType : "-",
                                            timeCreated: (element2.timeCreated) ? moment.unix(element2.timeCreated).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                            timeStarted: (element2.timeStarted) ? moment.unix(element2.timeStarted).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                            timeEnded: (element2.timeEnded) ? moment.unix(element2.timeEnded).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                            // data: ActivityData

                                        };
                                        userArray.push(data);
                                        setImmediate(callbackDone2);
                                    }, function (err) {
                                        if (err) {

                                            callbackDone1(err);
                                        } else {

                                            setImmediate(callbackDone1);
                                        }
                                    });
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('END', {data: userArray, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            //putlist
            flowController.on('4', function (userRow, deviceId) {
                console.log("4");

                var putArray = [];

                var date = moment(new Date()).format('DD/MM/YY');
                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();

                putListModel.find({'resourceAssigned.deviceId': deviceId, timeCompleted: {$gt: timestamp}, "warehouseId": warehouseId, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else if (putListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: 'error.', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(putListRow, function (element1, callbackDone1) {

                            putSubListModel.findOne({"putListId": element1._id, endedBy: userRow._id, "activeStatus": 1}, function (err, putSubList) {
                                if (err) {

                                    callbackDone1(err);
                                } else if (putSubList == null) {

                                    setImmediate(callbackDone1);
                                } else {

                                    var status = '';
                                    if (putSubList.status == 1)
                                        status = 'Unassigned';
                                    else if (putSubList.status == 21)
                                        status = 'Assigned';
                                    else if (putSubList.status == 25)
                                        status = 'In progress';
                                    else if (putSubList.status == 31)
                                        status = 'Done';
                                    else if (putSubList.status == 35)
                                        status = 'Done Skipped ';
                                    else if (putSubList.status == 41)
                                        status = 'Backlog';

                                    data = {
                                        userId: userRow._id,
                                        username: userRow.username,
                                        firstName: userRow.firstName,
                                        lastName: userRow.lastName,
                                        putListName: element1.name,
                                        status: status,
                                        pickRate: element1.pickRate,
                                        pickLocationAddress: putSubList.pickLocationAddress,
                                        dropLocationAddress: putSubList.dropLocationAddress,
                                        itemCode: putSubList.itemCode ? putSubList.itemCode : "-",
                                        palletNumber: putSubList.palletNumber ? putSubList.palletNumber : "-",
                                        palletType: putSubList.palletType ? putSubList.palletType : "-",
                                        timeStarted: (putSubList.timeStarted) ? moment.unix(putSubList.timeStarted).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                        timeEnded: (putSubList.timeEnded) ? moment.unix(putSubList.timeEnded).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                        timeCreated: (putSubList.timeCreated) ? moment.unix(putSubList.timeCreated).format("DD/MMM/YYYY HH:mm:ss") : '-',
                                        //data: ActivityData

                                    };
                                    putArray.push(data);
                                    setImmediate(callbackDone1);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('END', {data: putArray, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                //setImmediate(callbackDone);
                            }
                        });
                    }
                    // });
                });
            });
            //
            //
            flowController.on('END', function (result) {

                res.json(result);
                //res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
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
module.exports = router;