var express = require('express');
var mongoose = require('mongoose');
var router = express.Router(); //underscore
var underscore = require('underscore');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var fs = require('fs');
//---------------------------------------------------------------------------------------------------------------------------
var pathReports = './logs/dailyLog/reportsLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var userTypesModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var userCategorysModel = require('../../../models/mongodb/userMaster-userCategory/collection-userCategory.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var areaMasterModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMasterModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMasterModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var userLicenseManagersModel = require('../../../models/mongodb/userMaster-licenseManager/collection-licenseManager.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var dispatchRulesModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var inwardRulesModel = require('../../../models/mongodb/itemMaster-inwardRules/collection-inwardRules.js');
var holdingTypesModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var measurementUnitsModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var warehouseMastersModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var sideMasterModel = require('../../../models/mongodb/locationMaster-sideMaster/collection-sideMaster.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts.js');
var logger = require('../../../logger/logger.js');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------
// Get All user information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/userMaster/action/read/all-users/:warehouseId/:userId/')

        .post(function (req, res) {
            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var arrUserMaster = [];
            var headerKey = '';
            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'createdBy' || selectedColumnFilter == 'username' || selectedColumnFilter == 'firstName' || selectedColumnFilter == 'lastName') {

                    columnCheck = selectedColumnFilter;
                } else if (selectedColumnFilter == "activeStatus") {
                    ObjQuery[selectedColumnFilter] = searchValue;
                } else {

                    if (selectedColumnFilter) {

                        var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                        ObjQuery[selectedColumnFilter] = itemCode;
                    }
                }
            }
            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();
            //START1 search query
            flowController.on('START1', function () {
                (showConsole) ? console.log('START1') : '';

                if (columnCheck) {

                    if (searchValue)
                        var search = searchValue.toUpperCase();

                    if (columnCheck == 'createdBy') {

                        usersModel.findOne({$or: [{username: search}, {firstName: search}, {lastName: search}]}).exec(function (err, userMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userMasterRow == null) {

                                flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "No search results available in system.", status: 'error', statusCode: '404'});
                            } else {

                                ObjQuery.createdBy = String(userMasterRow._id);
                                flowController.emit('START');
                            }
                        });
                    } else {

                        var searchname = new RegExp(search, "i");
                        usersModel.findOne({$or: [{username: searchname}, {firstName: searchname}, {lastName: searchname}]}).exec(function (err, userMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userMasterRow == null) {

                                flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "No search results available in system.", status: 'error', statusCode: '404'});
                            } else {

                                ObjQuery._id = String(userMasterRow._id);
                                flowController.emit('START');
                            }
                        });
                    }
                } else {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                }
            });
            //
            //
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                console.log(ObjQuery);
                usersModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {data: [], message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "No results matching search paramaters available in system.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(userMasterRow, function (element, callback) {

                            if (element.username !== 'AVANCER') {

                                async.waterfall([
                                    function (waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback1') : '';

                                        if (element.allocatedLicenseId) {

                                            userLicenseManagersModel.findOne({'_id': element.allocatedLicenseId, 'activeStatus': 1}, function (err, licenseRow) {
                                                if (err) {

                                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else {

                                                    var allocatedLicenseName = licenseRow.name;
                                                    waterfallcallback(null, allocatedLicenseName);
                                                }
                                            });
                                        } else {
                                            waterfallcallback(null, '');
                                        }
                                    },
                                    function (allocatedLicenseName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback2') : '';

                                        if (element.createdBy == 'AVANCER' || element.modifiedBy == 'AVANCER') {

                                            var createdBy = 'AVANCER';
                                            var modifiedBy = 'AVANCER';
                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy);
                                        } else {

                                            usersModel.findOne({$and: [{$or: [{'_id': element.createdBy}, {'_id': element.modifiedBy}]}]}, function (err, userMasterRowData) {
                                                if (err) {

                                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (userMasterRowData == null) {

                                                    waterfallcallback(null, allocatedLicenseName, "", "");
                                                    // waterfallcallback({message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                                                } else {

                                                    var createdBy = (userMasterRowData.username) ? userMasterRowData.username : '';
                                                    var modifiedBy = (userMasterRowData.username) ? userMasterRowData.username : '';

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy);
                                                }
                                            });
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback3') : '';

                                        var materialHandlingUnit = [];

                                        if (element.materialHandlingUnitId.length == 0) {

                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit);
                                        } else {

                                            async.eachSeries(element.materialHandlingUnitId, function (elementMHU, callbackMHU) {

                                                materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                    if (err) {

                                                        callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else if (MHURow == null) {

                                                        callbackMHU();
                                                    } else {

                                                        var data = (MHURow.name) ? MHURow.name : '';
                                                        materialHandlingUnit.push(data);
                                                        callbackMHU();
                                                    }
                                                });
                                            }, function (err) {

                                                if (err) {

                                                    waterfallcallback(err);
                                                } else {

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit);
                                                }
                                            });
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback4') : '';

                                        warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (warehouseRow == null) {

                                                waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, '');
                                            } else {

                                                var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';

                                                waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName);
                                            }
                                        });
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback5') : '';
                                        if (element.userCategoryId) {

                                            userCategorysModel.findOne({'_id': element.userCategoryId}, function (err, userCategoryRow) {
                                                if (err) {

                                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (userCategoryRow == null) {

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                                } else {

                                                    var userCategoryName = (userCategoryRow.name) ? userCategoryRow.name : '';
                                                    //console.log(typeof userCategoryName);
                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName);
                                                }
                                            });
                                        } else {

                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback6') : '';

                                        if (element.userTypeId) {
                                            userTypesModel.findOne({'_id': element.userTypeId}, function (err, userTypeRow) {
                                                if (err) {

                                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (userTypeRow == null) {

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                                } else {

                                                    var userTypeName = (userTypeRow.name) ? userTypeRow.name : '';
                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName, userTypeName);
                                                }
                                            });
                                        } else {

                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName, userTypeName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallbackData') : '';

                                        var data = {
                                            WarehouseName: warehouseName,
                                            Username: element.username,
                                            FirstName: element.firstName,
                                            LastName: element.lastName,
                                            EmployeeId: element.employeeId ? element.employeeId : '-',
                                            UserCategoryName: userCategoryName,
                                            UserTypeName: userTypeName,
                                            TargetCapacity: (element.targetCapacity) ? element.targetCapacity : '-',
                                            PendingCapacity: element.pendingCapacity ? element.pendingCapacity : '-',
                                            AllocatedCapacity: element.allocatedCapacity ? element.allocatedCapacity : '-',
                                            ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                            MaterialHandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit : '-',
                                            ModifiedByName: modifiedBy ? modifiedBy : '-',
                                            CreatedByName: createdBy,
                                            AllocatedLicenseName: allocatedLicenseName ? allocatedLicenseName : '-',
                                            DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                            TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                            DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                            TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                        };
                                        waterfallcallback(null, data);
                                    }
                                ], function (err, result) {
                                    // result now equals 'done'
                                    if (err) {
                                        setImmediate(callback);
                                    } else {

                                        arrUserMaster.push(result);
                                        if (arrUserMaster.length == 1) {
                                            headerKey = underscore.keys(result);
                                        }
                                        setTimeout(function () {
                                            setImmediate(callback);
                                        }, 100);
                                    }
                                });
                            } else {
                                setImmediate(callback);
                            }
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                usersModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "No details of users available in system..", status: 'error', statusCode: '404'});
                                    } else {

                                        usersModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: arrUserMaster, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "No user details available in system..", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'USERMASTER' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: itemMasterArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (reason) {

                (showConsole) ? console.log('ERROR') : '';
                res.json(reason);
            });
            //
            //
            flowController.on('END', function (error) {

                (showConsole) ? console.log('END') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//                
//----------------------------------------------------------------------------------------------------------
//locationMaster-report
//----------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/locationMaster/action/read/all-locations/:warehouseId/:userId/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var showConsole = 1;

            var locationArr = [];

            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();

            var headerKey = '';
            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;


            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'area' || selectedColumnFilter == 'zone' || selectedColumnFilter == 'line' || selectedColumnFilter == 'level' || selectedColumnFilter == 'holdingType')//
                    columnCheck = selectedColumnFilter;
                else {

                    if (selectedColumnFilter == "activeStatus") {

                        ObjQuery[selectedColumnFilter] = searchValue;
                    } else {
                        var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                        ObjQuery[selectedColumnFilter] = itemCode;
                    }
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeModified = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeModified = {$gte: startDate};
                else
                    ObjQuery.timeModified = {$gte: startDate};
            }

            var flowController = new EventEmitter();

            //START1 search query
            flowController.on('START1', function () {

                if (columnCheck == 'area') {

                    search = searchValue.toUpperCase();

                    areaMasterModel.findOne({area: search, activeStatus: 1}, function (err, areaMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (areaMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "No area details available in system.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.areaId = String(areaMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                } else if (columnCheck == 'zone') {

                    search = searchValue.toUpperCase();

                    zoneMasterModel.findOne({zone: search, activeStatus: 1}, function (err, zoneMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (zoneMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from zoneMaster.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.zoneId = String(zoneMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                } else if (columnCheck == 'line') {
                    search = searchValue.toUpperCase();

                    lineMasterModel.findOne({line: search, activeStatus: 1}, function (err, lineMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (lineMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from lineMaster.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.lineId = String(lineMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                } else if (columnCheck == 'level') {
                    search = searchValue.toUpperCase();

                    levelMasterModel.findOne({level: search, activeStatus: 1}, function (err, levelMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (levelMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from levelMaster.", status: 'error', statusCode: '404'});
                        } else {
                            //levelId
                            ObjQuery.levelId = String(levelMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                } else if (columnCheck == 'holdingType') {

                    search = searchValue.toUpperCase();

                    holdingTypesModel.findOne({name: search, activeStatus: 1}, function (err, holdingTypeRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from HoldingType.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.holdingType = String(holdingTypeRow._id);
                            flowController.emit('START');
                        }
                    });
                } else {

                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                }
            });
            //location all
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                locationStoreModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, locationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (locationRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from locationMaster.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback1') : '';

                                    if (element.modifiedBy) {
                                        usersModel.findOne({'_id': element.modifiedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, modifiedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, '');
                                    }
                                },
                                function (modifiedByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback2') : '';

                                    warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, modifiedByName, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';

                                            waterfallcallback(null, modifiedByName, warehouseName);
                                        }
                                    });

                                },
                                function (modifiedByName, warehouseName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback3') : '';

                                    var materialHandlingUnit = [];

                                    if (element.materialHandlingUnitId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.materialHandlingUnitId, function (elementMHU, callbackMHU) {

                                            materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                if (err) {

                                                    callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (MHURow == null) {

                                                    callbackMHU();
                                                } else {

                                                    var data = (MHURow.name) ? MHURow.name : '';
                                                    materialHandlingUnit.push(data);

                                                    callbackMHU();

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }

                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback4') : '';

                                    var subCategory = [];

                                    if (element.reservedSubCategoryId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory);
                                    } else {

                                        async.eachSeries(element.reservedSubCategoryId, function (elementSubCategory, callbackSubCategory) {

                                            itemSubCategorysModel.findOne({'_id': elementSubCategory}, function (err, subCategoryRow) {
                                                if (err) {

                                                    callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (subCategoryRow == null) {

                                                    callbackSubCategory();
                                                } else {

                                                    var data = (subCategoryRow.name) ? subCategoryRow.name : '';
                                                    subCategory.push(data);

                                                    callbackSubCategory();

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory);
                                            }
                                        });
                                    }

                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';
                                    if (element.reservedCategoryId) {
                                        itemCategorysModel.findOne({'_id': element.reservedCategoryId}, function (err, categoryRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                            } else if (categoryRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, '');
                                            } else {

                                                var Category = (categoryRow.name) ? categoryRow.name : '';
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category);

                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    if (element.holdingType) {
                                        holdingTypesModel.findOne({'_id': element.holdingType}, function (err, holdingRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                            } else if (holdingRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, '');
                                            } else {

                                                var holdingName = (holdingRow.name) ? holdingRow.name : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName);

                                            }
                                        }); //
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.function) {
                                        functionAreaModel.findOne({'_id': element.function}, function (err, functionRow) {

                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                            } else if (functionRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, '');
                                            } else {

                                                var functionName = (functionRow.name) ? functionRow.name : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName);

                                            }
                                        }); //dispatchRulesModel
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, '');
                                    }

                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback8') : '';
                                    if (element.createdBy) {
                                        usersModel.findOne({'_id': element.createdBy}, function (err, userCreatedRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userCreatedRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, '');

                                            } else {

                                                var createdByName = (userCreatedRow.username) ? userCreatedRow.username : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback9') : '';
                                    if (element.areaId) {

                                        areaMasterModel.findOne({'_id': element.areaId}, function (err, areaRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (areaRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, '');

                                            } else {

                                                var areaName = (areaRow.area) ? areaRow.area : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback10') : '';
                                    if (element.zoneId) {

                                        zoneMasterModel.findOne({'_id': element.zoneId}, function (err, zoneRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (zoneRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, '');

                                            } else {

                                                var zoneName = (zoneRow.zone) ? zoneRow.zone : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback11') : '';
                                    if (element.lineId) {

                                        lineMasterModel.findOne({'_id': element.lineId}, function (err, lineRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (lineRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, '');

                                            } else {

                                                var lineName = (lineRow.line) ? lineRow.line : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback12') : '';
                                    if (element.levelId) {
                                        levelMasterModel.findOne({'_id': element.levelId}, function (err, levelRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (levelRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, '');

                                            } else {

                                                var levelName = (levelRow.level) ? levelRow.level : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback13') : '';
                                    if (element.sideId) {
                                        sideMasterModel.findOne({'_id': element.sideId}, function (err, sideRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (sideRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, '');

                                            } else {

                                                var sideName = (sideRow.line) ? sideRow.line : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback14') : '';
                                    var assignedItemStoreIdArr = [];
                                    var assignedItemStoreIdUnique = [];
                                    var itemCodeArr = [];

                                    if (element.assignedItemStoreId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, assignedItemStoreIdArr, assignedItemStoreIdUnique, itemCodeArr);

                                    } else {

                                        async.eachSeries(element.assignedItemStoreId, function (elementStoreId, callbackStoreId) {

                                            itemStoreModel.findOne({'_id': elementStoreId}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackStoreId({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                } else if (itemStoreRow == null) {

                                                    callbackStoreId();
                                                } else {

                                                    var itemMasterId = itemStoreRow.itemMasterId;

                                                    itemMasterModel.findOne({'_id': itemMasterId}, function (err, itemMasterRow) {
                                                        if (err) {

                                                            callbackStoreId({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                        } else if (itemMasterRow == null) {

                                                            callbackStoreId();
                                                        } else {

                                                            var itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                                            itemCodeArr.push(itemCode);

                                                            assignedItemStoreIdArr.push(itemMasterId);

                                                            if (assignedItemStoreIdUnique.indexOf(itemMasterId) > -1) {

                                                                assignedItemStoreIdUnique.push(itemMasterId);
                                                            }

                                                            callbackStoreId();
                                                        }
                                                    });

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, assignedItemStoreIdArr, assignedItemStoreIdUnique, itemCodeArr);
                                            }
                                        });
                                    }


                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, assignedItemStoreIdArr, assignedItemStoreIdUnique, itemCodeArr, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallbackDATA') : '';

                                    var data = {

                                        WarehouseName: warehouseName,
                                        Area: areaName,
                                        Zone: zoneName,
                                        Line: lineName,
                                        Level: levelName,
                                        MaterialHandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit : '-',
                                        LocationAddress: element.customerAddress ? element.customerAddress : '-',
                                        SequenceId: element.sequenceId,
                                        HoldingType: holdingName ? holdingName : '-',
                                        Availability: (element.availability == 'A') ? 'Available' : '' || (element.availability == 'B') ? 'Block' : '-',
                                        //Comments: element.comments,
                                        // Function: functionName,
                                        ReservedCategoryId: Category ? Category : '-',
                                        ReservedSubCategoryId: subCategory.length !== 0 ? subCategory : '-',
                                        ReservedBy: element.reservedBy ? element.reservedBy : '-',
                                        TimeReserved: (element.timeReserved) ? moment.unix(element.timeReserved).format("DD/MMM/YYYY") : '-',
                                        AssignedItemStoreId: itemCodeArr.length !== 0 ? itemCodeArr : '-',
                                        AvailableCapacity: element.availableCapacity,
                                        //  TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '',
                                        CreatedBy: createdByName ? createdByName : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        ModifiedBy: modifiedByName ? modifiedByName : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive'
                                    };
                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {
                                    callback(err);
                                } else {

                                    locationArr.push(result);
                                    headerKey = underscore.keys(result);
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    });
                                }
                            });

                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                locationStoreModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        locationStoreModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: locationArr, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'LOCATIONMASTER' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: itemMasterArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
// 
//             
//---------------------------------------------------------------------------------------------------------------
//item Master
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/itemMaster/action/read/all-items/:warehouseId/:userId/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var headerKey = '';
            var showConsole = 1;
            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

//            var sortBy = req.query.sortBy;
//            var sortType = (req.query.sortType == "asc") ? 1 : -1;
//            var sortQuery = {};
//            if (sortBy == 'holdingType' || sortBy == 'category')
//                sortQuery.name = sortType;
//            else
//                sortQuery[sortBy] = sortType;

            var ObjQuery = {};

            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'holdingType' || selectedColumnFilter == 'category')
                    columnCheck = selectedColumnFilter;
                else {
                    if (selectedColumnFilter == "activeStatus") {

                        ObjQuery[selectedColumnFilter] = searchValue;
                    } else {
                        var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                        ObjQuery[selectedColumnFilter] = itemCode;
                    }
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();

            flowController.on('START1', function () {

                (showConsole) ? console.log('START1') : '';

                if (columnCheck == 'holdingType') {

                    var search = searchValue;
                    holdingTypesModel.findOne({name: search, activeStatus: 1}, function (err, holdingTypeRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow == null) {

                            flowController.emit('ERROR', {message: "HoldingType " + searchValue + "  Not Found in System!", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                        } else {

                            ObjQuery.holdingType = String(holdingTypeRow._id);
                            flowController.emit('START');
                        }
                    });
                } else {

                    var search = searchValue;
                    itemCategorysModel.findOne({name: search, activeStatus: 1}, function (err, itemCategoryRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemCategoryRow == null) {

                            flowController.emit('ERROR', {message: "Category Name  " + searchValue + "  Not Found in System!", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                        } else {

                            ObjQuery.category = String(itemCategoryRow._id);
                            flowController.emit('START');
                        }
                    });
                }
            });
            //
            //
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                var itemMasterArray = [];
                // Find all the active rows in the item category collection 
                itemMasterModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, itemMasterRow) {

                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No item master configured yet.", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(itemMasterRow, function (element, callback) {

                            async.waterfall([

                                //category
                                function (waterFallcallback) {

                                    if (element.category) {

                                        itemCategorysModel.findOne({'_id': element.category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (itemCategoryRow == null) {

                                                waterFallcallback(null, '');
                                            } else {
                                                var categoryName = (itemCategoryRow.name) ? itemCategoryRow.name : '';
                                                waterFallcallback(null, categoryName);
                                            }
                                        });
                                    } else {
                                        waterFallcallback(null, '');
                                    }

                                },
                                //holdingType
                                function (categoryName, waterFallcallback) {

                                    if (element.holdingType) {

                                        holdingTypesModel.findOne({'_id': element.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (holdingTypeRow == null) {

                                                waterFallcallback(null, categoryName, '');
                                            } else {

                                                holdingType = (holdingTypeRow.name) ? holdingTypeRow.name : '';
                                                waterFallcallback(null, categoryName, holdingType);
                                            }
                                        });
                                    } else {
                                        waterFallcallback(null, categoryName, '');
                                    }
                                },
                                //warehouseName
                                function (categoryName, holdingType, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';

                                    warehouseMastersModel.findOne({'_id': mongoose.Types.ObjectId(warehouseId), 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, categoryName, holdingType, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, categoryName, holdingType, warehouseName);
                                        }
                                    });
                                },
                                //MHU
                                function (categoryName, holdingType, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var materialHandlingUnit = [];

                                    if (element.handlingUnit.length == 0) {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.handlingUnit, function (elementMHU, callbackMHU) {

                                            materialHandlingMasterModel.findOne({'_id': mongoose.Types.ObjectId(elementMHU)}, function (err, MHURow) {
                                                if (err) {

                                                    callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (MHURow == null) {

                                                    callbackMHU();
                                                } else {

                                                    var data = (MHURow.name) ? MHURow.name : '';
                                                    materialHandlingUnit.push(data);
                                                    callbackMHU();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }
                                },
                                //subCategory
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    var subCategory = [];
                                    if (element.subCategory.length == 0) {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory);
                                    } else {

                                        async.eachSeries(element.subCategory, function (elementSubCategory, callbackSubCategory) {

                                            itemSubCategorysModel.findOne({'_id': mongoose.Types.ObjectId(elementSubCategory)}, function (err, subCategoryRow) {
                                                if (err) {

                                                    callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (subCategoryRow == null) {

                                                    callbackSubCategory();
                                                } else {

                                                    var data = (subCategoryRow.name) ? subCategoryRow.name : '';
                                                    subCategory.push(data);
                                                    callbackSubCategory();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory);
                                            }
                                        });
                                    }
                                },
                                //measurementUnit
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.measurementUnit) {

                                        measurementUnitsModel.findOne({'_id': mongoose.Types.ObjectId(element.measurementUnit)}, function (err, measurementRow) {

                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (measurementRow == null) {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, '');
                                            } else {

                                                var measurementUnitName = (measurementRow.name) ? measurementRow.name : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, '');
                                    }
                                },
                                //createdBy
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback8') : '';
                                    if (element.createdBy) {

                                        usersModel.findOne({'_id': mongoose.Types.ObjectId(element.createdBy)}, function (err, userCreatedRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userCreatedRow == null) {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, '');
                                            } else {

                                                var createdByName = (userCreatedRow.username) ? userCreatedRow.username : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, '');
                                    }
                                },

                                ///dispatchRule
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback9') : '';
                                    if (element.dispatchRule) {

                                        dispatchRulesModel.findOne({'_id': mongoose.Types.ObjectId(element.dispatchRule)}, function (err, dispatchRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (dispatchRow == null) {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, '');
                                            } else {

                                                var dispatchRule = (dispatchRow.name) ? dispatchRow.username : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, '');
                                    }
                                },
                                //inwardRule
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback10') : '';
                                    var inwardRuleArr = [];

                                    if (element.inwardRule.length == 0) {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr);
                                    } else {

                                        async.eachSeries(element.inwardRule, function (elementInward, callbackInward) {

                                            var data = (elementInward.name) ? elementInward.name : '-';

                                            inwardRuleArr.push(data);
                                            callbackInward();

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr);
                                            }
                                        });
                                    }
                                },
                                //modifiedBy
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, waterfallcallback) {
//
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    if (element.modifiedBy) {
                                        usersModel.findOne({'_id': mongoose.Types.ObjectId(element.modifiedBy)}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, modifiedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, '');
                                    }
                                },
                                //
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, modifiedByName, waterFallcallback) {

                                    var itemMaster = {
                                        WarehouseName: warehouseName,
                                        ItemCode: element.itemCode,
                                        Category: categoryName,
                                        SubCategory: subCategory.length !== 0 ? subCategory : '-',
                                        CategoryCombinations: element.categoryCombinations.length !== 0 ? element.categoryCombinations : '-',
                                        MeasurementUnit: measurementUnitName ? measurementUnitName : '-',
                                        OverflowAutoAssign: element.overflowAutoAssign,
                                        ExclusiveStorage: element.exclusiveStorage,
                                        HoldingType: holdingType,
                                        ItemSpecification: element.itemSpecification ? element.itemSpecification : '-',
                                        MinInventoryAlert: element.itemSystemSpecification[0].minInventoryAlert ? element.itemSystemSpecification[0].minInventoryAlert : '-',
                                        MaxInventoryAlert: element.itemSystemSpecification[0].maxInventoryAlert ? element.itemSystemSpecification[0].maxInventoryAlert : '-',
                                        AutoStockCount: element.itemSystemSpecification[0].autoStockCount ? element.itemSystemSpecification[0].autoStockCount : '-',
                                        StockCountQuantity: element.itemSystemSpecification[0].stockCountQuantity ? element.itemSystemSpecification[0].stockCountQuantity : '-',
                                        stockCountFrequency: element.itemSystemSpecification[0].stockCountFrequency ? element.itemSystemSpecification[0].stockCountFrequency : '-',
                                        ItemStatus: element.itemSystemSpecification[0].itemStatus ? element.itemSystemSpecification[0].itemStatus : '-',
                                        InwardRule: inwardRuleArr.length !== 0 ? inwardRuleArr : '-',
                                        DispatchRule: dispatchRule ? dispatchRule : '-',
                                        ItemSerialNumber: element.itemSerialNumber ? element.itemSerialNumber : '-',
                                        Barcode: element.barcode ? element.barcode : '-',
                                        ItemDescription: element.itemDescription,
                                        PriceValue: element.priceValue,
                                        PriceCurrency: element.priceCurrency,
                                        ManufacturingDate: element.manufacturingDate ? element.manufacturingDate : '-',
                                        ExpiryDate: element.expiryDate,
                                        AlertDate: element.alertDate,
                                        AlertDays: element.alertDays,
                                        From: element.from,
                                        HandlingUnit: materialHandlingUnit,
                                        PickAlert: element.pickAlert ? element.pickAlert : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        CreatedBy: createdByName,
                                        ModifiedBy: modifiedByName ? modifiedByName : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        Width: (element.itemSystemSpecification[0].Width) ? element.itemSystemSpecification[0].Width : '-',
                                        Length: (element.itemSystemSpecification[0].length) ? element.itemSystemSpecification[0].length : '-',
                                        Height: (element.itemSystemSpecification[0].height) ? element.itemSystemSpecification[0].height : '-',
                                        Weight: (element.itemSystemSpecification[0].weight) ? element.itemSystemSpecification[0].weight : '-',
                                        Volume: (element.itemSystemSpecification[0].volume) ? element.itemSystemSpecification[0].volume : '-',
                                        Diameter: (element.itemSystemSpecification[0].diameter) ? element.itemSystemSpecification[0].diameter : '-'

                                    };

                                    waterFallcallback(null, itemMaster);
                                }
                            ], function (err, result) {
                                // result now equals 'done'
                                if (err) {

                                    callback(err);
                                } else {

                                    itemMasterArray.push(result);
                                    headerKey = underscore.keys(result);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                itemMasterModel.count({'warehouseId': warehouseId, activeStatus: 1}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: headerKey, "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        itemMasterModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {


                                                console.log(headerKey);
                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: itemMasterArray, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: 200});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        res.json({message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'ITEMMASTER' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: itemMasterArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//                
//---------------------------------------------------------------------------------------------------------------
//device Master
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/deviceMaster/action/read/all-devices/:warehouseId/:userId/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceArr = [];
            var headerKey = '';
            var showConsole = 1;
            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();


            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'modifiedBy') {

                    columnCheck = selectedColumnFilter;
                } else if (selectedColumnFilter == "activeStatus" || selectedColumnFilter == "availableCapacity" || selectedColumnFilter == "targetCapacity") {

                    ObjQuery[selectedColumnFilter] = searchValue;
                } else {

                    var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery[selectedColumnFilter] = itemCode;
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }
            var flowController = new EventEmitter();

            //START1 search query
            flowController.on('START1', function () {
                (showConsole) ? console.log('START1') : '';

                if (columnCheck) {

                    var search = searchValue.toUpperCase();
                    var searchname = new RegExp(search, "i");
                    usersModel.findOne({$or: [{username: searchname}, {firstName: searchname}, {lastName: searchname}]}).exec(function (err, userMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from areaMaster.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.modifiedBy = String(userMasterRow._id);
                            flowController.emit('START');
                        }
                    });

                } else {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                }
            });
            //
            //
            //START1 search query
            flowController.on('START', function () {


                deviceMastersModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, deviceRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from deviceMaster.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(deviceRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    if (element.modifiedBy) {

                                        usersModel.findOne({'_id': element.modifiedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, modifiedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, '');
                                    }
                                },
                                function (modifiedByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, modifiedByName, warehouseName);
                                        }
                                    });
                                },
                                function (modifiedByName, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var materialHandlingUnit = [];
                                    if (element.materialHandlingUnitId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.materialHandlingUnitId, function (elementMHU, callbackMHU) {

                                            materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                if (err) {

                                                    callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (MHURow == null) {

                                                    callbackMHU();
                                                } else {

                                                    var data = (MHURow.name) ? MHURow.name : '';
                                                    materialHandlingUnit.push(data);
                                                    callbackMHU();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var data = {
                                        WarehouseName: warehouseName,
                                        Name: (element.name) ? element.name : '-',
                                        SyncInterval: element.syncInterval,
                                        Os_Version: element.osversion,
                                        Platform: element.platform,
                                        UUID: element.uuid,
                                        Manufacturer: element.manufacturer,
                                        Model: element.model,
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        MaterialHandlingUnit: materialHandlingUnit,
                                        ModifiedByName: modifiedByName,
                                        AvailableCapacity: element.availableCapacity,
                                        TargetCapacity: element.targetCapacity,
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {
                                    callback(err);
                                } else {

                                    deviceArr.push(result);
                                    if (deviceArr.length == 1) {
                                        headerKey = underscore.keys(result);
                                    }
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 100);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                deviceMastersModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        deviceMastersModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: deviceArr, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                                //flowController.emit('END', {data: deviceArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'DEVICEMASTER' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: itemMasterArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//                
//---------------------------------------------------------------------------------------------------------------
//pickList
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/all-pickLists/:warehouseId/:userId/')

        .post(function (req, res) {

            console.log(req.params);
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();
            var pickListArr = [];
            var headerKey = '';
            var showConsole = 1;

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = req.query.searchValue
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'modifiedBy' || selectedColumnFilter == "deviceName") {

                    columnCheck = selectedColumnFilter;
                } else if (selectedColumnFilter == "activeStatus" || selectedColumnFilter == "status") {

                    ObjQuery[selectedColumnFilter] = searchValue;
                } else {

                    var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery[selectedColumnFilter] = itemCode;
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }
            var flowController = new EventEmitter();

            //START1 search query
            flowController.on('START1', function () {
                (showConsole) ? console.log('START1') : '';

                if (columnCheck) {

                    if (columnCheck == 'modifiedBy') {

                        var search = searchValue.toUpperCase();
                        var searchname = new RegExp(search, "i");
                        usersModel.findOne({$or: [{username: searchname}, {firstName: searchname}, {lastName: searchname}]}).exec(function (err, userMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userMasterRow == null) {

                                flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from areaMaster.", status: 'error', statusCode: '404'});
                            } else {

                                ObjQuery.modifiedBy = String(userMasterRow._id);
                                flowController.emit('START');
                            }
                        });
                    } else {

                        var search = searchValue;
                        var searchname = new RegExp(search, "i");

                        console.log(searchname);
                        deviceMastersModel.findOne({name: searchname}, function (err, deviceRow) {
                            if (err) {
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (deviceRow == null) {

                                flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from areaMaster.", status: 'error', statusCode: '404'});
                            } else {

                                console.log(deviceRow._id);
                                var deviceId = String(deviceRow._id);
                                flowController.emit('START', deviceId);
                            }
                        });
                    }
                } else {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                }
            });
            //
            //
            flowController.on('START', function (deviceId) {
                (showConsole) ? console.log('START') : '';

                if (deviceId)
                    var Query = {'resourceAssigned': {$elemMatch: {'deviceId': deviceId}}};
                else
                    var Query = ObjQuery;


                pickListModel.find(Query).lean().skip(limit * page).limit(limit).lean().sort({'timeCreated': 1}).exec(function (err, pickListRow) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from pickList.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(pickListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    usersModel.findOne({$and: [{$or: [{'_id': element.createdBy}, {'_id': element.modifiedBy}]}]}, function (err, userRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (userRow == null) {

                                            waterfallcallback(null, '');
                                        } else {

                                            var modifiedByName = (userRow.username) ? userRow.username : '';
                                            waterfallcallback(null, modifiedByName);
                                        }
                                    });
                                },
                                //
                                function (modifiedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, modifiedByName, warehouseName);
                                        }
                                    });
                                },
                                //
                                //
                                function (modifiedByName, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';

                                    var materialHandlingUnit = [];

                                    if (element.materialHandlingUnit.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                    } else {


                                        async.eachSeries(element.materialHandlingUnit, function (elementMHU, callbackMHU) {

                                            if (elementMHU) {

                                                console.log("MHU" + elementMHU);

                                                materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                    if (err) {

                                                        callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else if (MHURow == null) {

                                                        setImmediate(callbackMHU);
                                                    } else {

                                                        var data = (MHURow.name) ? MHURow.name : '';
                                                        materialHandlingUnit.push(data);
                                                        setImmediate(callbackMHU);
                                                    }
                                                });
                                            } else {
                                                var data = '';
                                                materialHandlingUnit.push(data);
                                                setImmediate(callbackMHU);
                                            }
                                        }, function (err) {

                                            if (err) {

                                                console.log("error" + err);
                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }
                                },
                                //pickSubLists
                                function (modifiedByName, warehouseName, materialHandlingUnit, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    var deviceArray = [];
                                    if (element.resourceAssigned.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray);
                                    } else {
                                        var deviceIdArr = [];

                                        element.resourceAssigned.forEach(function (result) {
                                            deviceIdArr.push(result.deviceId);
                                        });

                                        deviceArr = underscore.uniq(deviceIdArr);
                                        async.eachSeries(deviceArr, function (elementpickSubList, callbackDevice) {

                                            deviceMastersModel.findOne({'_id': elementpickSubList}, function (err, diviceRow) {
                                                if (err) {

                                                    callbackDevice({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (diviceRow == null) {

                                                    setImmediate(callbackDevice);
                                                } else {

                                                    if (searchValue) {

                                                        if (searchValue == diviceRow.name || searchValue.toUpperCase() == diviceRow.name) {
                                                            var data = (diviceRow.name) ? diviceRow.name : '';
                                                            deviceArray.push(data);
                                                            setImmediate(callbackDevice);
                                                        } else {

                                                            setImmediate(callbackDevice);
                                                        }
                                                    } else {

                                                        var data = (diviceRow.name) ? diviceRow.name : '';
                                                        deviceArray.push(data);
                                                        setImmediate(callbackDevice);
                                                    }

                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray);
                                            }
                                        });
                                    }
                                },
                                //
                                //
                                function (modifiedByName, warehouseName, materialHandlingUnit, deviceArray, waterfallcallback) {

                                    pickSubListModel.find({'pickListId': element._id}, 'timeEnded').lean().sort({'timeEnded': -1}).exec(function (err, pickSubListRow) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (pickSubListRow.length == 0) {

                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, '0');
                                        } else {

                                            var endTime = pickSubListRow[0];
                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, endTime);
                                        }
                                    });
                                },
                                //
                                function (modifiedByName, warehouseName, materialHandlingUnit, deviceArray, endTime, waterfallcallback) {

                                    pickSubListModel.find({'pickListId': element._id}, 'timeStarted').lean().sort({'timeStarted': 1}).exec(function (err, pickSubListRow) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (pickSubListRow.length == 0) {

                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, '0');
                                        } else {

                                            var startTime = pickSubListRow[0];
                                            var workTime = endTime.timeEnded - startTime.timeStarted;

                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, workTime);
                                        }
                                    });
                                },
                                //
                                //
                                function (modifiedByName, warehouseName, materialHandlingUnit, deviceArray, workTime, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = '';
                                    if (element.status == 1)
                                        status = 'Unassigned';
                                    else if (element.status == 5)
                                        status = 'Withdrawn';
                                    else if (element.status == 11)
                                        status = 'Activated';
                                    else if (element.status == 21)
                                        status = 'Assigned';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 35)
                                        status = 'Done Skipped ';
                                    else if (element.status == 41)
                                        'Backlog';
                                    var data = {
                                        WarehouseName: warehouseName,
                                        OrderNumber: element.orderNumber.length !== 0 ? element.orderNumber : '-',
                                        Sr_No: element.sequence,
                                        Name: (element.name) ? element.name : '-',
                                        SyncStatus: (element.syncStatus) ? element.syncStatus : '-',
                                        Status: status,
                                        DeviceName: deviceArray.length !== 0 ? deviceArray : '-',
                                        Time_Worked: workTime ? secondsToHms(workTime) : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : '-' || (element.activeStatus == 2) ? 'Inactive' : '-' || (element.activeStatus == 3) ? 'BackLog' : '-',
                                        MaterialHandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit : '-',
                                        CreatedByName: modifiedByName ? modifiedByName : '-',
                                        ListType: element.listType,
                                        PickRate: element.pickRate ? element.pickRate : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    pickListArr.push(result);
                                    if (pickListArr.length == 1) {
                                        headerKey = underscore.keys(result);
                                    }
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                pickListModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        pickListModel.count(Query, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: pickListArr, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                                // res.json({data: pickListArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'PICKLIST' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: itemMasterArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------
//putList
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/all-putLists/:warehouseId/:userId/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();

            putListArr = [];
            headerKey = '';
            var showConsole = 1;

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'startedByName' || selectedColumnFilter == "assignedToName" || selectedColumnFilter == "completedByName") {

                    columnCheck = selectedColumnFilter;
                } else if (selectedColumnFilter == "activeStatus" || selectedColumnFilter == "status" || selectedColumnFilter == "orderNumber") {
                    ObjQuery[selectedColumnFilter] = searchValue;
                } else {

                    var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery[selectedColumnFilter] = itemCode;
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();

            //START1 search query
            flowController.on('START1', function () {
                (showConsole) ? console.log('START1') : '';

                if (columnCheck) {

                    var search = searchValue.toUpperCase();
                    var searchname = new RegExp(search, "i");
                    usersModel.findOne({$or: [{username: searchname}, {firstName: searchname}, {lastName: searchname}]}).exec(function (err, userMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from areaMaster.", status: 'error', statusCode: '404'});
                        } else {

                            if (columnCheck == 'startedByName') {
                                //startedBy
                                ObjQuery.startedBy = String(userMasterRow._id);
                                flowController.emit('START');
                            } else if (columnCheck == "assignedToName") {
                                //assignedTo
                                ObjQuery.assignedTo = String(userMasterRow._id);
                                flowController.emit('START');
                            } else {
                                //completedBy
                                ObjQuery.completedBy = String(userMasterRow._id);
                                flowController.emit('START');
                            }
                        }
                    });

                } else {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                }
            });
            //
            flowController.on('START', function () {

                putListModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from putList.", status: 'error', statusCode: '404'});
                    } else {
                        async.eachSeries(putListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    if (element.createdBy == 'INTERFACE' || element.createdBy == 'MANUAL') {

                                        if (element.createdBy == 'INTERFACE')
                                            waterfallcallback(null, 'INTERFACE');
                                        else
                                            waterfallcallback(null, 'MANUAL');
                                    } else {
                                        usersModel.findOne({'_id': element.createdBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, '');
                                            } else {

                                                var createdByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName);
                                            }
                                        });
                                    }
                                },
                                function (createdByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    warehouseMastersModel.findOne({'_id': element.warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, createdByName, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, createdByName, warehouseName);
                                        }
                                    });
                                },
                                function (createdByName, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    if (element.assignedTo) {
                                        usersModel.findOne({'_id': element.assignedTo}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, createdByName, warehouseName, '');
                                            } else {

                                                var assignedToName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, createdByName, warehouseName, '');
                                    }
                                },
                                function (createdByName, warehouseName, assignedToName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    if (element.startedBy) {

                                        usersModel.findOne({'_id': element.startedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, '');
                                            } else {

                                                startedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, createdByName, warehouseName, assignedToName, '');
                                    }
                                },
                                function (createdByName, warehouseName, assignedToName, startedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';
                                    if (element.completedBy) {
                                        usersModel.findOne({'_id': element.completedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, '');
                                            } else {

                                                var completedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, '');
                                    }
                                },
                                //deviceId
                                function (createdByName, warehouseName, assignedToName, startedByName, completedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    var deviceArray = [];
                                    if (element.resourceAssigned.length == 0) {

                                        waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray);
                                    } else {
                                        var deviceIdArr = [];
                                        element.resourceAssigned.forEach(function (result) {
                                            deviceIdArr.push(result.deviceId);
                                        });
                                        async.eachSeries(deviceIdArr, function (elementpickSubList, callbackDevice) {

                                            deviceMastersModel.findOne({'_id': elementpickSubList}, function (err, diviceRow) {
                                                if (err) {

                                                    callbackDevice({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (diviceRow == null) {

                                                    callbackDevice();
                                                } else {

                                                    var data = (diviceRow.name) ? diviceRow.name : '';
                                                    deviceArray.push(data);
                                                    callbackDevice();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray);
                                            }
                                        });
                                    }
                                },

                                function (createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, waterfallcallback) {

                                    putSubListModel.findOne({'putListId': element._id, "activeStatus": 1}).lean().sort({'timeStarted': 1}).exec(function (err, putSubListRow) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (putSubListRow == null) {

                                            waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, '0');
                                        } else {


                                            var workTime = putSubListRow.timeEnded - putSubListRow.timeStarted;

                                            waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, workTime);
                                        }
                                    });
                                },
                                function (createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, workTime, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = '';
                                    if (element.status == 1)
                                        status = 'Unassigned';
                                    else if (element.status == 21)
                                        status = 'Assigned';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 35)
                                        status = 'Done Skipped ';
                                    else if (element.status == 41)
                                        status = 'Backlog';
                                    var data = {
                                        WarehouseName: warehouseName,
                                        OrderNumber: element.orderNumber.length !== 0 ? element.orderNumber : '-',
                                        Sr_No: element.sequence,
                                        Name: (element.name) ? element.name : '-',
                                        //SyncStatus: element.syncStatus,
                                        Status: status,
                                        DeviceName: deviceArray.legnth !== 0 ? deviceArray : '-',
                                        Time_Worked: workTime ? secondsToHms(workTime) : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        StartedByName: startedByName ? startedByName : '-',
                                        CreatedByName: createdByName,
                                        AssignedToName: assignedToName ? assignedToName : '-',
                                        CompletedByName: completedByName ? completedByName : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                    };
                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    putListArr.push(result);
                                    if (putListArr.length == 1) {
                                        headerKey = underscore.keys(result);
                                    }
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                putListModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        putListModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: putListArr, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                                // res.json({data: putListArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});

                            }
                        });
                    }
                });
            });
            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'PUTLIST' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: itemMasterArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------
//pickSubListId
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/all-pickSubLists/:pickListId/:userId/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var pickListId = req.params.pickListId.trim();
            var userId = req.params.userId.trim();
            var pickSubListArr = [];
            var headerKey = '';
            var showConsole = 1;

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var ObjQuery = {};
            ObjQuery.pickListId = pickListId;

            var columnCheck = '';
            
            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'assignedTo')//
                    columnCheck = selectedColumnFilter;
                else {

                    if (selectedColumnFilter == 'requiredQuantity' || selectedColumnFilter == 'pickedQuantity' || selectedColumnFilter == 'status') {

                        ObjQuery[selectedColumnFilter] = searchValue;
                    } else {
                        var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                        ObjQuery[selectedColumnFilter] = itemCode;
                    }
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();
            //START1 search query
            flowController.on('START1', function () {

                if (columnCheck == 'assignedTo') {

                    search = searchValue.toUpperCase();
                    var searchname = new RegExp(search, "i");
                    
                    usersModel.findOne({username: searchname, activeStatus: 1}, function (err, userMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.assignedTo = String(userMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                } else {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                }
            });
            //
            flowController.on('START', function () {

                console.log("START");

                console.log(ObjQuery);
                pickSubListModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from pickSubList.", status: 'error', statusCode: '404'});
                    } else {


                        async.eachSeries(pickSubListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    pickListModel.findOne({_id: element.pickListId}, function (err, picklistRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (picklistRow == null) {

                                            waterfallcallback(null, '');
                                        } else {
                                            pickListName = (picklistRow.name) ? picklistRow.name : '';

                                            waterfallcallback(null, pickListName);
                                        }
                                    });
                                },
                                //deviceNname
                                function (pickListName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    var deviceArray = [];

                                    if (element.resourceAssigned.length == 0) {

                                        waterfallcallback(null, pickListName, deviceArray);
                                    } else {
                                        var deviceIdArr = [];
                                        element.resourceAssigned.forEach(function (result) {
                                            deviceIdArr.push(result.deviceId);
                                        });
                                        async.eachSeries(deviceIdArr, function (elementpickSubList, callbackDevice) {

                                            deviceMastersModel.findOne({'_id': elementpickSubList}, function (err, diviceRow) {
                                                if (err) {

                                                    callbackDevice({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (diviceRow == null) {

                                                    callbackDevice();
                                                } else {

                                                    var data = (diviceRow.name) ? diviceRow.name : '';
                                                    deviceArray.push(data);
                                                    callbackDevice();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, pickListName, deviceArray);
                                            }
                                        });
                                    }
                                },
                                //itemStoreId
                                function (pickListName, deviceArray, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var itemStoreName = [];

                                    if (element.itemStoreId.length == 0) {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName);
                                    } else {

                                        async.eachSeries(element.itemStoreId, function (elementitemStore, callbackitemStore) {

                                            itemStoreModel.findOne({_id: elementitemStore}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackitemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    setImmediate(callbackitemStore);
                                                } else {

                                                    if (itemStoreName.indexOf(itemStoreRow.palletNumber) > -1) {
                                                        itemStoreName.push(itemStoreRow.palletNumber);
                                                        setImmediate(callbackitemStore);
                                                    } else {

                                                        setImmediate(callbackitemStore);
                                                    }

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName);
                                            }
                                        });
                                    }
                                },
                                //pickedItemStoreId
                                function (pickListName, deviceArray, itemStoreName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    var pickeditemStoreName = [];

                                    if (element.pickedItemStoreId.length == 0) {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName);
                                    } else {

                                        async.eachSeries(element.pickedItemStoreId, function (elementitemStore, callbackitemStore) {

                                            itemStoreModel.findOne({_id: elementitemStore}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackitemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    callbackitemStore();
                                                } else {

                                                    itemStoreName.push(itemStoreRow.palletNumber);
                                                    callbackitemStore();
                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName);
                                            }
                                        });
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';

                                    if (element.createdBy) {

                                        usersModel.findOne({_id: element.createdBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, '');
                                            } else {

                                                var createdByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    if (element.modifiedBy) {
                                        usersModel.findOne({_id: element.modifiedBy}, function (err, userRow) {

                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.assignedTo) {
                                        usersModel.findOne({_id: element.assignedTo}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, '');
                                            } else {

                                                var assignedToName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback8') : '';
                                    if (element.startedBy) {
                                        usersModel.findOne({_id: element.startedBy}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, '');
                                            } else {

                                                var startedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback9') : '';
                                    if (element.endedBy) {
                                        usersModel.findOne({_id: element.endedBy}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, '');
                                            } else {

                                                var endedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback10') : '';
                                    if (element.backloggedBy) {

                                        usersModel.findOne({_id: element.backloggedBy}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, '');
                                            } else {

                                                var backloggedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, backloggedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, backloggedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = "";
                                    if (element.status == 1)
                                        status = 'Unassigned';
                                    else if (element.status == 5)
                                        status = 'Withdrawn';
                                    else if (element.status == 11)
                                        status = 'Activated';
                                    else if (element.status == 21)
                                        status = 'Assigned';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 35)
                                        status = 'Done Skipped ';
                                    else if (element.status == 33)
                                        status = 'Skipped';
                                    else if (element.status == 41)
                                        status = 'Backlog';
                                    var data = {

                                        PickListName: pickListName,
                                        ItemStoreId: itemStoreName.length !== 0 ? itemStoreName : '-', //pending
                                        PickedItemStoreId: pickeditemStoreName.length !== 0 ? pickeditemStoreName : '-', //pending
                                        ItemCode: element.itemCode ? element.itemCode : '-',
                                        OrderNumber: element.orderNumber ? element.orderNumber : '-',
                                        ItemType: element.itemType,
                                        ItemValue: element.itemValue,
                                        ItemDescription: element.itemDescription,
                                        HopperSequence: element.hopperSequence ? element.hopperSequence : '-',
                                        HopperPriority: (element.hopperPriority == 1) ? 'HIGH' : 'NORMAL',
                                        SerialNumberArray: element.serialNumberArray.length !== 0 ? element.serialNumberArray : '-',
                                        RequiredQuantity: element.requiredQuantity,
                                        PickedQuantity: element.pickedQuantity,
                                        PickLocationAddress: element.pickLocationAddress,
                                        DropLocationAddress: element.dropLocationAddress,
                                        Sr_No: element.sequence,
                                        DeviceName: deviceArray.length !== 0 ? deviceArray : "-",
                                        Status: status,
                                        SkipReason: element.skipReason ? element.skipReason : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        CreatedByName: createdByName,
                                        ModifiedByName: modifiedByName ? modifiedByName : '-',
                                        TimeAssigned: (element.timeAssigned) ? moment.unix(element.timeAssigned).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        AssignedTo: assignedToName ? assignedToName : '-', //pending
                                        TimeStarted: (element.timeStarted) ? moment.unix(element.timeStarted).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        StartedBy: startedByName ? startedByName : '-',
                                        TimeEnded: (element.timeEnded) ? moment.unix(element.timeEnded).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        EndedBy: endedByName ? endedByName : '-', //pending
                                        TimeBacklogged: (element.timeBacklogged) ? moment.unix(element.timeBacklogged).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        BackloggedBy: backloggedByName ? backloggedByName : '-', //pending
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    pickSubListArr.push(result);
                                    if (pickSubListArr.length == 1) {

                                        headerKey = underscore.keys(result);
                                    }
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                pickSubListModel.count({'pickListId': pickListId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        pickSubListModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: pickSubListArr, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //log
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'PICKSUBLIST' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: pickSubListArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------
//putSubListId
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/all-putSubLists/:putListId/:userId/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var putListId = req.params.putListId.trim();
            var userId = req.params.userId.trim();
            var putSubListArr = [];
            var headerKey = '';
            var showConsole = 1;
            //search
            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var ObjQuery = {};
            ObjQuery.putListId = putListId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'startedBy' || selectedColumnFilter == 'endedBy') {//

                    columnCheck = selectedColumnFilter;
                } else if (selectedColumnFilter == 'status' || selectedColumnFilter == 'activeStatus' || selectedColumnFilter == 'requiredQuantity' || selectedColumnFilter == 'pickedQuantity') {

                    ObjQuery[selectedColumnFilter] = searchValue;
                } else {

                    var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery[selectedColumnFilter] = itemCode;
                }
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();
            //START1 search query
            flowController.on('START1', function () {

                if (columnCheck == 'startedBy') {

                    search = searchValue.toUpperCase();
                    var searchname = new RegExp(search, "i");

                    usersModel.findOne({username: searchname, activeStatus: 1}, function (err, userMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.startedBy = String(userMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                } else {

                    search = searchValue.toUpperCase();
                    var searchname = new RegExp(search, "i");

                    usersModel.findOne({username: searchname, activeStatus: 1}, function (err, userMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.endedBy = String(userMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                }
            });
            //
            //
            flowController.on('START', function () {

                console.log(ObjQuery);

                putSubListModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putSubListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from putSubList.", status: 'error', statusCode: '404'});
                    } else {


                        async.eachSeries(putSubListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    putListModel.findOne({_id: element.putListId}, function (err, putlistRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (putlistRow == null) {

                                            waterfallcallback(null, '');
                                        } else {
                                            putListName = (putlistRow.name) ? putlistRow.name : '';

                                            waterfallcallback(null, putListName);
                                        }
                                    });
                                },
                                //itemStoreId
                                function (putListName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    var itemStoreName = [];

                                    if (element.itemStoreId.length == 0) {

                                        waterfallcallback(null, putListName, itemStoreName);
                                    } else {

                                        async.eachSeries(element.itemStoreId, function (elementitemStore, callbackitemStore) {

                                            itemStoreModel.findOne({_id: elementitemStore}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackitemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    callbackitemStore();
                                                } else {

                                                    itemStoreName.push(itemStoreRow.palletNumber);
                                                    callbackitemStore();
                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, putListName, itemStoreName);
                                            }
                                        });
                                    }
                                },
                                function (putListName, itemStoreName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';

                                    if (element.createdBy == 'INTERFACE' || element.createdBy == 'MANUAL') {

                                        if (element.createdBy == 'INTERFACE') {

                                            waterfallcallback(null, putListName, itemStoreName, 'INTERFACE');
                                        } else {

                                            waterfallcallback(null, putListName, itemStoreName, 'MANUAL');
                                        }
                                    } else {
                                        usersModel.findOne({_id: element.createdBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, putListName, itemStoreName, '');
                                            } else {

                                                var createdByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, putListName, itemStoreName, createdByName);
                                            }
                                        });
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    if (element.assignedTo) {
                                        usersModel.findOne({_id: element.assignedTo}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, '');
                                            } else {

                                                var assignedToName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';
                                    if (element.startedBy) {
                                        usersModel.findOne({_id: element.startedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, '');
                                            } else {

                                                var startedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, startedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    if (element.endedBy) {
                                        usersModel.findOne({_id: element.endedBy}, function (err, userRow) {
                                            if (err) {
                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, '');
                                            } else {

                                                var endedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.backloggedBy) {
                                        usersModel.findOne({_id: element.backloggedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, '');
                                            } else {

                                                var backloggedByName = (userRow.username) ? userRow.username : '';

                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, backloggedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, backloggedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = '';
                                    if (element.status == 1)
                                        status = 'Pending';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 27)
                                        status = 'Pending for drop';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 33)
                                        status = 'Skipped';
                                    else if (element.status == 41)
                                        status = 'Backlog';
                                    var data = {

                                        PutListName: putListName,
                                        ItemStoreId: itemStoreName.length !== 0 ? itemStoreName : '-', //pending
                                        ItemCode: element.itemCode ? element.itemCode : '-',
                                        OrderNumber: element.orderNumber ? element.orderNumber : '-',
                                        PalletNumber: element.palletNumber ? element.palletNumber : '-',
                                        PalletSize: element.palletSize ? element.palletSize : '-',
                                        PalletType: element.palletType ? element.palletType : '-',
                                        ItemDescription: element.itemDescription,
                                        RequiredQuantity: element.requiredQuantity ? element.requiredQuantity : '-',
                                        PickedQuantity: element.pickedQuantity ? element.pickedQuantity : '-',
                                        DropLocationAddress: element.dropLocationAddress ? element.dropLocationAddress : '-',
                                        Sr_No: element.sequence,
                                        Status: status,
                                        SkipReason: element.skipReason ? element.skipReason : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        CreatedByName: createdByName,
                                        TimeAssigned: (element.timeAssigned) ? moment.unix(element.timeAssigned).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        AssignedTo: assignedToName ? assignedToName : '-', //pending
                                        TimeStarted: (element.timeStarted) ? moment.unix(element.timeStarted).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        StartedBy: startedByName ? startedByName : '-',
                                        TimeEnded: (element.timeEnded) ? moment.unix(element.timeEnded).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        EndedBy: endedByName ? endedByName : "-", //pending
                                        TimeBacklogged: (element.timeBacklogged) ? moment.unix(element.timeBacklogged).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        BackloggedBy: backloggedByName ? backloggedByName : '-', //pending
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    putSubListArr.push(result);
                                    if (putSubListArr.length == 1) {

                                        headerKey = underscore.keys(result);
                                    }
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                putSubListModel.count({'putListId': putListId}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        putSubListModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('LOG');
                                                flowController.emit('END', {data: putSubListArr, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //log
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'PUTSUBLIST' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log("error");
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");
                                //res.json({data: pickSubListArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            if (columnCheck)
                flowController.emit('START1');
            else
                flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------
//get all pickListId 
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/all-pickListIdAndName/:warehouseId/:userId/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();
            var pickListArray = [];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                pickListModel.find({'warehouseId': warehouseId}).lean().sort({'timeCreated': 1}).exec(function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "Unable to fetch data from pickList.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(pickListRow, function (element, callback) {

                            if (element.activeStatus == 3) {

                                setImmediate(callback);
                            } else {
                                var data = {
                                    pickListId: element._id,
                                    pickListName: element.name
                                };
                                pickListArray.push(data);
                                setImmediate(callback);
                            }
                        },
                                function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                                            if (err) {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userMasterRow == null) {

                                                flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                                            } else {

                                                username = (userMasterRow.username) ? userMasterRow.username : '';

                                                fs.appendFile(pathReports, '\n' + 'PICKLISTBYNAME' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                                    if (err) {
                                                        // append failed
                                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        flowController.emit('END', {data: pickListArray, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-REPORTS',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {

                        console.log('Entered error ');
                    } else {

                        console.log('Entered success ');
                    }
                });
                res.json(error);
            });
            //instlize
            flowController.emit('START');
        });
//
//             
//-----------------------------------------------------------------------------------------------------------------
//get all putListId
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/all-putListIdAndName/:warehouseId/:userId/')

        .post(function (req, res) {


            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();
            var putListArray = [];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                putListModel.find({'warehouseId': warehouseId}).lean().sort({'timeCreated': 1}).exec(function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "Unable to fetch data from pickList.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(putListRow, function (element, callback) {
                            var data = {
                                putkListId: element._id,
                                putListName: element.name
                            };
                            putListArray.push(data);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (userMasterRow == null) {

                                        flowController.emit('ERROR', {message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                                    } else {

                                        username = (userMasterRow.username) ? userMasterRow.username : '';

                                        fs.appendFile(pathReports, '\n' + 'PUTLISTBYNAME' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                            if (err) {
                                                // append failed
                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('END', {data: putListArray, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-REPORTS',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {

                        console.log('Entered error ');
                    } else {

                        console.log('Entered success ');
                    }
                });
                res.json(error);
            });
            //instlize
            flowController.emit('START');
        });
//
//-----------------------------------------------------------------------------------------------------------------
//Alerts Reports
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/read/alert/:warehouseId/:userId/')

        .post(function (req, res) {

            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();

            var headerKey = '';
            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;


            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            var columnCheck = '';

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'status') {

                    columnCheck = selectedColumnFilter;
                } else {

                    var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery[selectedColumnFilter] = itemCode;
                }
            }


            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }


            var alertArray = [];

            var flowController = new EventEmitter();
            //START1 search query
            flowController.on('START1', function () {
                (showConsole) ? console.log("START1") : '';

                var search = searchValue.toUpperCase();
                var searchname = new RegExp(search, "i");
                if (columnCheck == 'userName') {
                    usersModel.findOne({$or: [{username: searchname}, {firstName: searchname}, {lastName: searchname}]}).exec(function (err, userMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userMasterRow == null) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from areaMaster.", status: 'error', statusCode: '404'});
                        } else {

                            var userIdUser = String(userMasterRow._id);
                            flowController.emit('START', userIdUser);
                        }
                    });
                } else {
                    console.log("else");
                    flowController.emit('START', '');
                }
            });
            //
            //
            flowController.on('START', function () {

                (showConsole) ? console.log("START") : '';

                if (columnCheck)
                    var Query = {'users': {$elemMatch: {'status': parseInt(searchValue)}}};
                else
                    var Query = ObjQuery;

                alertsModel.find(Query).skip(limit * page).limit(limit).sort({'timeCreated': 1}).exec(function (err, alertRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (alertRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Alert data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {


                        async.eachSeries(alertRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    var userArray = [];
                                    var statusArray = [];
                                    var timeSeenArray = [];

                                    async.eachSeries(element.users, function (elementUser, callbackUser) {

                                        usersModel.findOne({_id: elementUser.userId, activeStatus: 1}, function (err, userRow) {
                                            if (err) {

                                                callbackUser(err);
                                            } else if (userRow == null) {

                                                setImmediate(callbackUser);
                                            } else {



                                                if (searchValue) {

                                                    if (parseInt(searchValue) == elementUser.status) {
                                                        statusArray.push((elementUser.status == 1) ? 'Seen' : '-' || (elementUser.status == 0) ? 'Unseen' : '-');
                                                        userArray.push(userRow.username);
                                                        timeSeenArray.push((elementUser.timeSeen) ? moment.unix(elementUser.timeSeen).format("DD/MMM/YYYY hh:mm:ss") : '-');
                                                    }
                                                } else {

                                                    statusArray.push((elementUser.status == 1) ? 'Seen' : '-' || (elementUser.status == 0) ? 'Unseen' : '-');
                                                    userArray.push(userRow.username);
                                                    timeSeenArray.push((elementUser.timeSeen) ? moment.unix(elementUser.timeSeen).format("DD/MMM/YYYY hh:mm:ss") : '-');
                                                }


                                                setImmediate(callbackUser);
                                            }
                                        });
                                    }, function (err) {
                                        if (err) {
                                            waterfallcallback(err);
                                        } else {
                                            waterfallcallback(null, userArray, statusArray, timeSeenArray);
                                        }
                                    });
                                }, function (userArray, statusArray, timeSeenArray, waterfallcallback) {
                                    data = {
                                        Module: element.module,
                                        Name: element.name,
                                        Username: userArray.length !== 0 ? userArray.join() : "-",
                                        Text: element.text,
                                        Status: statusArray.length !== 0 ? statusArray.join() : "-", //(element.status == 1) ? 'Seen' : '-' || (element.status == 0) ? 'Unseen' : '-',
                                        TimeSeen: timeSeenArray.length !== 0 ? timeSeenArray.join() : "-",
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                                // TimeUpdated: element.timeUpdated
                                    };
                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    alertArray.push(result);
                                    if (alertArray.length == 1) {
                                        headerKey = underscore.keys(data);
                                    }
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {

                            } else {

                                flowController.emit('LOG');
                                flowController.emit('END', Query, alertArray);
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId}, function (err, userMasterRow) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        res.json({data: [], columnArray: [], message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        username = (userMasterRow.username) ? userMasterRow.username : '';

                        fs.appendFile(pathReports, '\n' + 'ALERT' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                //res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {
                                console.log("success");

                            }
                        });
                    }
                });
            });
            // End
            flowController.on('END', function (Query, result) {

                (showConsole) ? console.log("END") : '';

                alertsModel.count({'warehouseId': warehouseId}, function (err, itemMasterCount) {
                    if (err) {

                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        alertsModel.count(Query, function (err, searchCount) {
                            if (err) {

                            } else {

                                res.json({data: result, columnArray: headerKey, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log("ERROR") : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//inventory reports
//-----------------------------------------------------------------------------------------------------------------    
router.route('/v1/reportMaster/masterData/processMaster/action/read/inventory/:warehouseId/:userId/')

        .post(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();
            var userId = req.params.userId.trim();

            var itemMasterArray = [];
            var headerKey = '';

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = req.query.searchValue;
            var byLocationItemMasterId = req.query.byLocationItemMasterId;
            var startDate = req.query.startDate;
            var endDate = req.query.endDate;

            var columnFilter = '';

//            var sortBy = req.query.sortBy;
//            var sortType = (req.query.sortType == "asc") ? 1 : -1;
//            var sortQuery = {};
//            var randomFieldsColumnArray = ["tareWeightInLbs", "grossWeightInLbs", "specificLotNo", "purchaseOrderNumber",
//               "name1", "grossWeight", "pieces", "netWeight", "palletType", "palletSize", "boxNo", "batch", "salesDocument"];
//            if (randomFieldsColumnArray.indexOf(sortBy) > -1) {
//
//                var prop = "randomFields." + sortBy;
//                sortQuery[prop] = sortType;
//            } else {
//
//                sortQuery[sortBy] = sortType;
//            }


            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;
            ObjQuery.activeStatus = {$in: [1, 2]};

            var newQuery = {};
            newQuery.warehouseId = warehouseId;
            newQuery.activeStatus = 1;

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                var randomFieldsColumnArray = ["palletType", "palletSize", "boxNo", "batch", "salesDocument"];
                var valueToSearch = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");

                if (randomFieldsColumnArray.indexOf(selectedColumnFilter) > -1) {

                    var prop = "randomFields." + selectedColumnFilter;
                    ObjQuery[prop] = valueToSearch;

                } else if (selectedColumnFilter == "itemCode" || selectedColumnFilter == "customerAddress") {

                    columnFilter = selectedColumnFilter;

                    if (selectedColumnFilter == "customerAddress") {

                        newQuery[selectedColumnFilter] = req.query.searchValue.toUpperCase();

                    } else {

                        newQuery[selectedColumnFilter] = req.query.searchValue.toUpperCase();
                    }
                } else {

                    ObjQuery[selectedColumnFilter] = valueToSearch;
                }
            }

            if (byLocationItemMasterId) {

                ObjQuery.itemMasterId = byLocationItemMasterId;
            }

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: parseInt(startDate), $lte: parseInt(endDate)};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: parseInt(startDate)};
                else
                    ObjQuery.timeCreated = {$gte: parseInt(startDate)};
            }

            var flowController = new EventEmitter();

            flowController.on('START1', function () {

                (showConsole) ? console.log('START1') : '';

                if (columnFilter == "customerAddress") {

                    locationStoreModel.findOne(newQuery, function (err, locationRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '500'});
                        } else if (locationRow == null) {

                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.locationStoreId = String(locationRow._id);
                            flowController.emit('START');
                        }
                    });
                } else {

                    itemMasterModel.findOne(newQuery, function (err, itemMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "Unable to get item  Master details! Try again after some time.", status: 'error', statusCode: '500'});
                        } else if (itemMasterRow == null) {

                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.itemMasterId = String(itemMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                }
            });
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';


                var pipeline = [{'$match': ObjQuery}, {$skip: (limit * page)}, {$limit: limit}, {'$sort': {'timeCreated': 1}}];
                var aggregation = itemStoreModel.aggregate(pipeline).allowDiskUse(true);

                aggregation.exec(function (err, result) {
                    if (err) {

                        flowController.emit('ERROR', {message: "Unable to get item Store Master details! Try again after some time." + err, status: 'error', statusCode: '500'});
                    } else {

                        if (result.length == 0) {

                            flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                        } else {

                            flowController.emit('1', result);
                        }
                    }
                });
            });
            // Generate date
            flowController.on('1', function (itemStoreArray) {

                (showConsole) ? console.log('1') : '';
                var date = moment(new Date()).format('DD/MM/YY');
                var count = 0;
                async.eachSeries(itemStoreArray, function (elementItemStore, callback) {

                    // console.log('Item ' + count);
                    async.waterfall([
                        //
                        function (waterfallcallback) {

                            if (elementItemStore.locationStoreId) {

                                locationStoreModel.findOne({'_id': elementItemStore.locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (locationStoreRow == null) {
                                        `                           `
                                        waterfallcallback(null, '-', 0, 0);
                                    } else {

                                        var customerAddress = locationStoreRow.customerAddress;
                                        var availableCapacity = locationStoreRow.availableCapacity;
                                        var userDefinedCapacity = locationStoreRow.locationProperties[0].userDefinedCapacity;

                                        waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity);
                                    }
                                });
                            } else {

                                waterfallcallback(null, '-', 0, 0);
                            }
                        },
                        //
                        //
                        function (customerAddress, availableCapacity, userDefinedCapacity, waterfallcallback) {
//                                
                            itemMasterModel.findOne({_id: elementItemStore.itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {

                                    waterfallcallback(err);
                                } else if (itemMasterRow == null) {

                                    waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity, '');
                                } else {

                                    itemCode = itemMasterRow.itemCode;
                                    waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity, itemCode);
                                }
                            });
                        },
                        //
                        //
                        function (customerAddress, availableCapacity, userDefinedCapacity, itemCode, waterfallcallback) {

                            if (elementItemStore.modifiedBy) {
                                usersModel.findOne({'_id': elementItemStore.modifiedBy}, function (err, userRow) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else if (userRow == null) {

                                        waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity, itemCode, '');
                                    } else {
                                        username = (userRow.username) ? userRow.username : '';
                                        waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity, itemCode, username);
                                    }
                                });
                            } else {

                                waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity, itemCode, '');
                            }
                        },
                        //warehouseUtilizationModel
                        function (customerAddress, availableCapacity, userDefinedCapacity, itemCode, username, waterfallcallback) {

                            var utilized = parseInt(userDefinedCapacity) - parseInt(availableCapacity);
                            percentageUtilization = (userDefinedCapacity != 0) ? (utilized * 100) / userDefinedCapacity : 0;

                            waterfallcallback(null, customerAddress, availableCapacity, userDefinedCapacity, itemCode, username, percentageUtilization);
                        },
                        //
                        //
                        function (customerAddress, availableCapacity, userDefinedCapacity, itemCode, username, percentageUtilization, waterfallcallback) {

                            var data = {
                                ItemCode: itemCode ? itemCode : "-",
                                Location: customerAddress ? customerAddress : "-",
                                AvailableCapacity: availableCapacity ? availableCapacity : "0",
                                UserDefinedCapacity: userDefinedCapacity ? userDefinedCapacity : "0",
                                PercentageUtilization: percentageUtilization ? percentageUtilization.toFixed(2) : "0",
                                CurrentActivityStatus: elementItemStore.currentActivityStatus ? elementItemStore.currentActivityStatus : "-",
                                ExclusiveStorage: elementItemStore.exclusiveStorage,
                                OverflowAutoAssign: elementItemStore.overflowAutoAssign,
                                AlertDate: (elementItemStore.alertDate) ? elementItemStore.alertDate : '-',
                                ExpiryDate: (elementItemStore.expiryDate) ? elementItemStore.expiryDate : '-',
                                ManufacturingDate: (elementItemStore.manufacturingDate) ? elementItemStore.manufacturingDate : '-',
                                PalletNumber: elementItemStore.palletNumber,
                                ItemSerialNumber: (elementItemStore.itemSerialNumber) ? elementItemStore.itemSerialNumber : '-',
                                ActiveStatus: (elementItemStore.activeStatus == 1) ? 'Active' : 'Inactive',
                                Batch: (elementItemStore.randomFields[0].batch) ? elementItemStore.randomFields[0].batch : '-', //batch,netWeight,palletType,boxNo,
                                NetWeight: elementItemStore.randomFields[0].netWeight ? elementItemStore.randomFields[0].netWeight : '-',
                                PalletType: elementItemStore.randomFields[0].palletType ? elementItemStore.randomFields[0].palletType : '-',
                                BoxNo: elementItemStore.randomFields[0].boxNo ? elementItemStore.randomFields[0].boxNo : '-',
                                TareWeightLBS: elementItemStore.randomFields[0].tareWeightLBS ? elementItemStore.randomFields[0].tareWeightLBS : '-',
                                SpecificLotNo: elementItemStore.randomFields[0].specifcLotNo ? elementItemStore.randomFields[0].specifcLotNo : '-',
                                PurchaseOrderNo: elementItemStore.randomFields[0].purchaseOrderNo ? elementItemStore.randomFields[0].purchaseOrderNo : '-',
                                GrossWeight: elementItemStore.randomFields[0].grossWeight ? elementItemStore.randomFields[0].grossWeight : '-',
                                Rack: elementItemStore.randomFields[0].rack ? elementItemStore.randomFields[0].rack : '-',
                                Pieces: elementItemStore.randomFields[0].pieces ? elementItemStore.randomFields[0].pieces : '-',
                                GrossWeightInLbs: elementItemStore.randomFields[0].grossWeightInLbs ? elementItemStore.randomFields[0].grossWeightInLbs : '-',
                                CustomerMeterialNumber: elementItemStore.randomFields[0].customerMeterialNumber ? elementItemStore.randomFields[0].customerMeterialNumber : '-',
                                Name1: elementItemStore.randomFields[0].name1 ? elementItemStore.randomFields[0].name1 : '-',
                                SalesDocument: elementItemStore.randomFields[0].salesDocument ? elementItemStore.randomFields[0].salesDocument : '-',
                                Material: elementItemStore.randomFields[0].material ? elementItemStore.randomFields[0].material : '-',
                                ModifiedBy: username ? username : '-',
                                // CreatedBy: username,
                                DateCreated: (elementItemStore.timeCreated) ? moment.unix(elementItemStore.timeCreated).format("DD/MMM/YYYY") : '-',
                                TimeCreated: (elementItemStore.timeCreated) ? moment.unix(elementItemStore.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                DateModified: (elementItemStore.timeModified) ? moment.unix(elementItemStore.timeModified).format("DD/MMM/YYYY") : '-',
                                TimeModified: (elementItemStore.timeModified) ? moment.unix(elementItemStore.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                            };
                            waterfallcallback(null, data);
                        }
                        //
                    ], function (err, result) {
                        if (err) {

                        } else {
                            count++;
                            itemMasterArray.push(result);

                            if (itemMasterArray.length == 1) {
                                headerKey = underscore.keys(result);
                            }
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        flowController.emit('LOG');
                        flowController.emit('END', itemMasterArray);
                    }
                });
            });

            flowController.on('LOG', function () {

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userMasterRow) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        username = (userMasterRow != null) ? (userMasterRow.username) ? userMasterRow.username : '' : '';

                        fs.appendFile(pathReports, '\n' + 'INVENTORY' + ',' + 'READ' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                console.log('success');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            // END
            flowController.on('END', function (itemMasterArray) {

                (showConsole) ? console.log('END') : '';
                itemStoreModel.count({'warehouseId': warehouseId, activeStatus: {$in: [1, 2]}}, function (err, itemStoreCount) {
                    if (err) {

                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                    } else {

                        itemStoreModel.count(ObjQuery, function (err, searchCount) {
                            if (err) {

                            } else {

                                res.json({data: itemMasterArray, columnArray: headerKey, "recordsTotal": itemStoreCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // START
            if (columnFilter == "itemCode" || columnFilter == "customerAddress") {

                flowController.emit('START1');
            } else {
                flowController.emit('START');
            }
        });
//
//
module.exports = router;

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? "  " : "  ") : "0";
    var mDisplay = m > 0 ? m + (m == 1 ? "  " : "  ") : "0";
    var sDisplay = s > 0 ? s + (s == 1 ? "  " : " ") : "0";
    var hh = (hDisplay > 9) ? hDisplay : '0' + hDisplay;
    var mm = mDisplay > 9 ? mDisplay : '0' + mDisplay;
    var ss = sDisplay > 9 ? sDisplay : '0' + sDisplay;

    return hh + ":" + mm + ":" + ss;
}
;