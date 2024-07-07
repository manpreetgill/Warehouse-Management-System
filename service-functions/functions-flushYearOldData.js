var express = require('express'); // MVC Framework
var router = express.Router();
var events = require('events');
var EventEmitter = events.EventEmitter;
var moment = require('moment'); //timestamp
var momenttimezone = require('moment-timezone');//timestamp zone
var cron = require('node-cron');
var async = require('async');
var round10 = require('round10').round10;
//------------------------------------------------------------------------------------------------------------------------
var alertsModel = require('../models/mongodb/itemMaster-alerts/collection-alerts');
var transactionalLogsModel = require('../models/transactionalLogs/collection-transactionalLogs');
var customPalletNumbersModel = require('../models/mongodb/processMaster-customPalletNumber/collection-customPalletNumber');
var technicalDetailsModel = require('../models/mongodb/deviceMaster-technicalDetails/collection-technicalDetails.js')
var pickSubListModel = require('../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var itemMasterModel = require('../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var itemStoreModel = require('../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var alertService = require('../service-factory/alertService');
var areaAllocationModel = require('../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation.js');
var deviceAllocationsModel = require('../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var deviceMastersModel = require('../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var devicesTrackingModel = require('../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var warehouseMasterModel = require('../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var warehouseUtilizationModel = require('../models/mongodb/locationMaster-warehouseUtilization/collection-warehouseUtilization');
var putListModel = require('../models/mongodb/processMaster-putList/collection-putList.js');
var userModel = require('../models/mongodb/userMaster-users/collection-users.js');
var putSubListModel = require('../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var ruleEngineModel = require('../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
var measurementUnitModel = require('../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var pickListModel = require('../models/mongodb/processMaster-pickList/collection-pickList.js');
var areaMasterModel = require('../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMasterModel = require('../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMasterModel = require('../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMasterModel = require('../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var sideMastersModel = require('../models/mongodb/locationMaster-sideMaster/collection-sideMaster.js');
var virtualLocationsModel = require('../models/mongodb/locationMaster-virtualLocationStore/collection-virtualLocationStore.js');
var excelPathStoreModel = require('../models/mongodb/locationMaster-excelPathStore/collection-excelPathStore.js');
var holdingTypeModel = require('../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var itemCategorysModel = require('../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var dispatchRuleModel = require('../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var materialHandlingMasterModel = require('../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var functionAreaModel = require('../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var inventoryComparisonModel = require('../models/mongodb/locationMaster-inventoryComparison/collection-inventoryComparison');
var usersModel = require('../models/mongodb/userMaster-users/collection-users.js');
var userCategorysModel = require('../models/mongodb/userMaster-userCategory/collection-userCategory.js');

var cyberneticFilesModel = require('../models/mongodb/processMaster-cyberneticFiles/collection-cyberneticFiles.js');
var reasonMasterModel = require('../models/mongodb/reasonMaster-reasonMaster/collection-reasonMaster.js');

//--------------------------------------------------------------------------------------------------------------------------------
var functions_flushYearOldDataService = {};

//direct data deletion (activeStatus:2)-------------------------------------------------------------------------------------------
functions_flushYearOldDataService.direct = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START-direct Service') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {

                flowController.emit('ERROR', {message: "No Data available for delete operation-direct", status: 'error', statusCode: '304'});

            } else {
                
                async.eachSeries(modelRow, function (element, callback) {
                    
                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("done direct deletion");
                        });
                    }
                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END', {message: "Operation Successfull - DirectService", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
    });

    // delete query
    flowController.on('1', function (response) {

        (consoleLog) ? console.log('1-direct Service') : '';

    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END-direct Service') : '';

        (consoleLog) ? console.log(response) : '';
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR-direct Service') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START');

};

//customPalletNumber-Indirect deletion-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.customPalletNumber = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START-Indirect') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation -customPalletNumber ", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {

                        itemStoreModel.find({'customPalletNumber': element.customPalletNumber, 'activeStatus': 4}, function (err, itemStoreRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (itemStoreRow.length == 0) {

                                setImmediate(callback);

                            } else {
                                async.eachSeries(itemStoreRow, function (element1, callback1) {
                                    if (element1.timeCreated <= endTime) {
                                        model.remove({_id: element._id}, function (err, result) {
                                            if (err) {
                                                console.log(err);
                                            }
                                            // console.log(result);
                                        });
                                    }
                                    setImmediate(callback1);

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                    } else {

                                        setImmediate(callback);
                                    }
                                });

                            }
                        });
                    }

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END',{message: "Operation Successfull-Custom Pallet Number", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END-Indirect') : '';

        (consoleLog) ? console.log(response) : '';
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR-Indirect') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START');

};

//----------------------------------------------------------------------------------------------------------
//itemStore-Dispatch data removed-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.itemStore = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation-itemStore(dispatch)", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("result done");
                        });
                    }
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END',{message: "Operation Successfull - ItemStore", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
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

    // Initialize
    flowController.emit('START');
};

//----------------------------------------------------------------------------------------------------------
//pickList-Dispatch data removed-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.pickList = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation - pickList", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("result done");
                        });
                    }
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END', {message: "Operation Successfull-PickList", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
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

    // Initialize
    flowController.emit('START');
};

//----------------------------------------------------------------------------------------------------------
//pickSubList-Dispatch data removed-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.pickSubList = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation-pickSubList ", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("result done");
                        });
                    }
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END', {message: "Operation Successfull-PickSubList", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
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

    // Initialize
    flowController.emit('START');
};

//----------------------------------------------------------------------------------------------------------
//putList-Dispatch data removed-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.putList = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation-putList ", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("result done");
                        });
                    }
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END', {message: "Operation Successfull-putList", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
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

    // Initialize
    flowController.emit('START');
};

//----------------------------------------------------------------------------------------------------------
//putSubList-Dispatch data removed-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.putSubList = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation-PutSubList", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("result done");
                        });
                    }
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END', {message: "Operation Successfull-putSubList", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
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

    // Initialize
    flowController.emit('START');
};

//----------------------------------------------------------------------------------------------------------
//transactionalLog-data removed-------------------------------------------------------------------------------------------------------
functions_flushYearOldDataService.transactionalLog = function (model, endTime, query, callback) {
    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        model.find(query, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (modelRow.length == 0) {
                flowController.emit('ERROR', {message: "No Data available for delete operation - transactionalLog", status: 'error', statusCode: '304'});

            } else {

                async.eachSeries(modelRow, function (element, callback) {

                    if (element.timeCreated <= endTime) {
                        model.remove({_id: element._id}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("result done");
                        });
                    }
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('END', {message: "Operation Successfull-TransactionalLog", status: 'success', statusCode: '200'});
                    }
                });
            }
        });
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

    // Initialize
    flowController.emit('START');
};

module.exports = functions_flushYearOldDataService;


