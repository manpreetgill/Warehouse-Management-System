var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var processMastersModel = require('../../../models/mongodb/processMaster-processMaster/collection-processMaster.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/process/configuration/read/process/:warehouseId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                processMastersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userTypesRow) {

                    var userTypesArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypesRow.length == 0) {

                        flowController.emit('ERROR', {message: "No processes configured!", status: 'error', statusCode: '404'});
                    } else {
                        async.eachSeries(userTypesRow, function (element, callback) {
                            if (element.name != 'AVANCER') {// It will omit the AVANCER & send rest of all

                                var itemCategory = {id: element._id, name: element.name};

                                userTypesArray.push(itemCategory);
                            }
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: userTypesArray, status: 'success', statusCode: '200'});
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
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/process/configuration/create/process/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var processMasterArray = ['INWARD', 'PUTAWAY', 'PICK', 'STOCKCOUNT', 'CROSSDOCK', 'PACKING/QA', 'DISPATCH', 'LOADING'];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.eachSeries(processMasterArray, function (element, callback) {

                    processMastersModel.findOne({"name": element}, function (err, userTypesRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userTypesRow != null) {

                            callback({message: 'Process masters already configured!!', status: 'error', statusCode: '304'});
                        } else {

                            var newProcessMaster = new processMastersModel();

                            newProcessMaster.warehouseId = warehouseId;
                            newProcessMaster.name = element;
                            newProcessMaster.timeCreated = timeInInteger;

                            newProcessMaster.save(function (err) {
                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'Process master configured!', status: 'success', statusCode: '201'});
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
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/process/configuration/readAll-zone/process/:warehouseId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var finalArray = {};

            var flowController = new EventEmitter();

            flowController.on('PUT', function () {

                var zoneIdArray = [];
                var putArr = [];

                functionAreaModel.find({'name': {$in: ['STORAGE', 'REPROCESS']}, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (functionAreaRow.length == 0) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(functionAreaRow, function (element, callback) {

                            var functionAreaId = element._id;

                            locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow.length == 0) {

                                    setImmediate(callback);
                                } else {

                                    async.eachSeries(locationStoreRow, function (element2, callback2) {

                                        if (zoneIdArray.indexOf(element2) == -1) {

                                            zoneMastersModel.findOne({"_id": element2, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                                if (err) {

                                                    callback2({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (zoneMasterRow == null) {

                                                    callback2({message: 'zone not found!', status: 'error', statusCode: '304'});
                                                } else {

                                                    var zoneNameData = {};
                                                    zoneNameData.zoneId = element2;
                                                    zoneNameData.zoneName = zoneMasterRow.zone;
                                                    putArr.push(zoneNameData);
                                                    zoneIdArray.push(element2);
                                                    setImmediate(callback2);
                                                }
                                            });
                                        } else {

                                            setImmediate(callback2);
                                        }
                                    }, function (err) {
                                        if (err) {

                                            callback(err);
                                        } else {

                                            setImmediate(callback);
                                        }
                                    });
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('error', err);
                            } else {
                                finalArray.PUT = putArr;
                                flowController.emit('PICK');
                            }
                        });
                    }
                });
            });

            flowController.on('PICK', function () {

                var functionArray = [];
                functionAreaModel.find({"name": {$in: ['STORAGE', 'REPROCESS']}, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow.length == 0) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        async.eachSeries(functionAreaRow, function (element, callback) {

                            locationStoresModel.find({'function': element._id, 'activeStatus': 1}).exec(function (err, locationStoreRow) {
                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (locationStoreRow.length <= 0) {

                                    setImmediate(callback);
                                } else {
                                    for (var interval = 0; interval < locationStoreRow.length; interval++) {
                                        if (functionArray.indexOf(locationStoreRow[interval].zoneId) == -1)
                                            functionArray.push(locationStoreRow[interval].zoneId);
                                    }
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {

                            } else {

                                flowController.emit('PICKZONE', functionArray);
                            }
                        });
                    }
                });
            });

            flowController.on('PICKZONE', function (functionArray) {

                var pickArr = [];

                async.eachSeries(functionArray, function (element, callback) {

                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                        } else if (zoneMasterRow == null) {

                            setImmediate(callback);
                        } else {

                            var zoneNameData = {
                                zoneId: element,
                                zoneName: zoneMasterRow.zone
                            };
                            pickArr.push(zoneNameData);
                            setImmediate(callback);

                        }
                    });

                }, function (err) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        finalArray.PICK = pickArr;
                        flowController.emit('DISPATCH');
                    }
                });
            });

            flowController.on('DISPATCH', function () {
                var zoneDataArr = [];
                var dispatchArr = [];

                functionAreaModel.findOne({"name": 'DISPATCH' || 'LOAD-DOCK' || 'DOCK', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.DISPATCH = dispatchArr;
                                flowController.emit('INWARD');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            dispatchArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.DISPATCH = dispatchArr;
                                        flowController.emit('INWARD');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('INWARD', function () {
                var zoneDataArr = [];
                var inwardArr = [];

                functionAreaModel.findOne({"name": 'INWARD' || 'RMA' || 'UNLOAD-DOCK' || 'DOCK', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.INWARD = inwardArr;
                                flowController.emit('LOADING');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            inwardArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.INWARD = inwardArr;
                                        flowController.emit('LOADING');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('LOADING', function () {
                var zoneDataArr = [];
                var loadingArr = [];

                functionAreaModel.findOne({"name": 'LOAD-DOCK' || 'DOCK', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.LOADING = loadingArr;
                                flowController.emit('CROSSDOCK');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            loadingArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.LOADING = loadingArr;
                                        flowController.emit('CROSSDOCK');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('CROSSDOCK', function () {
                var zoneDataArr = [];
                var crossdockArr = [];

                functionAreaModel.findOne({"name": 'LOAD-DOCK' || 'UNLOAD-DOCK' || 'DOCK', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.CROSSDOCK = crossdockArr;
                                flowController.emit('STOCKCOUNT');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            crossdockArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.CROSSDOCK = crossdockArr;
                                        flowController.emit('STOCKCOUNT');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('STOCKCOUNT', function () {
                var zoneDataArr = [];
                var stockCountArr = [];

                functionAreaModel.findOne({"name": 'STORAGE', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.STOCKCOUNT = stockCountArr;
                                flowController.emit('PACK');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            stockCountArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.STOCKCOUNT = stockCountArr;
                                        flowController.emit('PACK');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('PACK', function () {
                var zoneDataArr = [];
                var packArr = [];

                functionAreaModel.findOne({"name": 'PACK' || 'Dispatch' || 'Storage' || 'Scrap', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.PACK = packArr;
                                flowController.emit('UNITCONSOLIDATION');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            packArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.PACK = packArr;
                                        flowController.emit('UNITCONSOLIDATION');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('UNITCONSOLIDATION', function () {
                var zoneDataArr = [];
                var unitConsolidationArr = [];

                functionAreaModel.findOne({"name": 'UNIT-CONSOLIDATION' || 'INWARD', 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (functionAreaRow == null) {

                        flowController.emit('error', {message: 'Function area not configured!!', status: 'error', statusCode: '304'});

                    } else {

                        var functionAreaId = functionAreaRow._id;

                        locationStoresModel.find({'function': functionAreaId, 'activeStatus': 1}).distinct('zoneId').exec(function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (locationStoreRow.length == 0) {

                                finalArray.UC = unitConsolidationArr;
                                flowController.emit('end');
                            } else {

                                async.eachSeries(locationStoreRow, function (element, callback) {

                                    zoneMastersModel.findOne({"_id": element, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                        } else if (zoneMasterRow == null) {

                                            flowController.emit('error', {message: 'zone not configured!!', status: 'error', statusCode: '304'});

                                        } else {

                                            var zoneNameData = {
                                                zoneId: element,
                                                zoneName: zoneMasterRow.zone
                                            }
                                            unitConsolidationArr.push(zoneNameData);
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {


                                        finalArray.UC = unitConsolidationArr;
                                        flowController.emit('end');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            flowController.on('end', function () {

                res.json({data: finalArray, message: "Operation Successfull", status: "success", statusCode: "200"});
            });

            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(errorData);
            });

            flowController.emit('PUT');
        });
//
//
module.exports = router;