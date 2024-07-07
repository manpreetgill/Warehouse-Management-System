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
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var alertService = require('../../../service-factory/alertService');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
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

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('2', clientRow, warehouseRow);

            }
        });
    });

    // Check if current time exceeds end time of day 
    // Call all functions to execute for operations from here
    flowController.on('2', function (clientRow, warehouseRow) {

        (consoleLog) ? console.log('2') : '';

        var currentTime = timeInInteger;
        var alertTime = warehouseRow.warehouseKPI_alert_time;

        console.log(currentTime + " " + alertTime);

        if (currentTime >= alertTime) {

            var newTime = currentTime + (warehouseRow.warehouseKPI_alert_interval) * 60 * 60;
            var query = {'_id': warehouseRow._id};
            var update = {'$set': {'warehouseKPI_alert_time': newTime}};

            warehouseMasterModel.update(query, update, function (err) {
                if (err) {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else {

                    warehouseKPI_alert(clientRow, warehouseRow);
                }
            });

        } else {

            flowController.emit('END', {message: 'Warehouse KPI - time not arrived!', status: 'success', statusCode: '200'});
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


function warehouseKPI_alert(clientRow, warehouseRow) {

    var consoleLog = 1;

    var warehouseId = warehouseRow._id;

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

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});

            } else {

                async.waterfall([
                    // Picklist done count 
                    function (waterfallcallback) {
                        var pick_timeTaken = 0;
                        pickSubListModel.find({'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1, 'status': 31}, function (err, pickSubListRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (pickSubListRow.length == 0) {

                                waterfallcallback(null, startTime, pick_timeTaken);

                            } else {

                                async.eachSeries(pickSubListRow, function (element, callback) {

                                    pick_timeTaken = pick_timeTaken + (((element.timeEnded) - (element.timeAssigned)) / 3600);

                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, startTime, pick_timeTaken);
                                    }
                                });
                            }
                        });
                    },

                    function (startTime, pick_timeTaken, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-1') : '';
                        console.log(pick_timeTaken);

                        pickSubListModel.count({'status': 31, 'timeCreated': {'$gte': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR '+err, status: 'error', statusCode: '500'});

                            } else {
                                if (pick_timeTaken == 0) {
                                    var pickLine = {
                                        Actual: 0,
                                        Target: warehouseRow.targetPickLines
                                    };
                                } else {

                                    var pickLine = {
                                        Actual: Math.round(pickDoneCount / pick_timeTaken),
                                        Target: warehouseRow.targetPickLines
                                    };
                                    if (pickLine.Actual < pickLine.Target) {
                                        var dataObject = {
                                            warehouseId: warehouseId,
                                            textName: "PickLine current rate below the target rate",
                                            module: "PICKLINE",
                                            name: "",
                                            id: ""
                                        };
                                        alertService.createAlert(dataObject);
                                    }
                                }
                                waterfallcallback(null, startTime, pickLine, pickDoneCount);
                            }
                        });
                    },
                    
                    function (startTime, pickLine, pickDoneCount, waterfallcallback) {
                        var put_timeTaken = 0;
                        putListModel.find({'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1, 'status': 31}, function (err, putListRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (putListRow.length == 0) {

                                waterfallcallback(null, startTime, pickLine, pickDoneCount, put_timeTaken);

                            } else {

                                async.eachSeries(putListRow, function (element, callback) {

                                    put_timeTaken = put_timeTaken + (((element.timeCompleted) - (element.timeAssigned)) / 3600);

                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, startTime, pickLine, pickDoneCount, put_timeTaken);
                                    }
                                });
                            }
                        });
                    },
                    // Putlist done count
                    function (startTime, pickLine, pickDoneCount, put_timeTaken, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-2') : '';

                        putListModel.count({'status': 31, 'timeCreated': {'$gte': startTime}, 'activeStatus': 1}, function (err, putDoneCount) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR '+err, status: 'error', statusCode: '500'});

                            } else {
                                var putLine;

                                if (put_timeTaken == 0) {

                                    putLine = {
                                        Actual: 0,
                                        Target: warehouseRow.targetPutLines
                                    };
                                } else {

                                    putLine = {
                                        Actual: Math.round(putDoneCount / put_timeTaken),
                                        Target: warehouseRow.targetPutLines
                                    };
                                    if (putLine.Actual < putLine.Target) {
                                        var dataObject = {
                                            warehouseId: warehouseId,
                                            textName: "Putline current rate below the target rate",
                                            module: "PUTLINE",
                                            name: "",
                                            id: ""
                                        };
                                        alertService.createAlert(dataObject);
                                    }
                                }

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount);
                            }
                        });
                    },

                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-3') : '';
                        var orderNumberArray = [];

                        pickSubListModel.find({'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (pickSubListRow.length == 0) {

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray);
                            } else {

                                async.eachSeries(pickSubListRow, function (element, callback) {

                                    orderNumberArray.push(element);

                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray);
                                    }
                                });
                            }
                        });
                    },

                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-4') : '';
                        var orderDataArray = [];

                        async.eachSeries(orderNumberArray, function (element, callback) {

                            pickSubListModel.find({'orderNumber': element, 'activeStatus': 1}, function (err, subListRow) {

                                if (err) {

                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else if (subListRow.length == 0) {

                                    setImmediate(callback);

                                } else {

                                    async.eachSeries(subListRow, function (element1, callback1) {

                                        var data = {
                                            orderNumber: element,
                                            timeStarted: (element1.timeStarted) ? (element1.timeStarted) : 0,
                                            timeEnded: (element1.timeEnded) ? (element1.timeEnded) : 0
                                        };

                                        orderDataArray.push(data);

                                        callback1();

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

                                waterfallcallback({message: err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderDataArray);
                            }
                        });
                    },

                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderDataArray, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-5') : '';
                        async.eachSeries(orderDataArray, function (element, callback) {

                            orderCycleTime = orderCycleTime + (parseInt(element.timeEnded) - parseInt(element.timeStarted));

                            setImmediate(callback);

                        }, function (err) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderCycleTime);
                            }
                        });
                    },

                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderNumberArray, orderCycleTime, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-6') : '';
                        var orderCycleTimeInHrs = orderCycleTime / 3600;

                        if (orderNumberArray.length == 0) {

                            var orderCycleTimePerHour = 0;

                            waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTimePerHour);

                        } else {

                            var orderCycleTimePerHour = orderCycleTimeInHrs / orderNumberArray.length;

                            waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTimePerHour);

                        }
                    },
                    // Order cycle time
                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTimePerHour, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-7') : '';

                        var orderCycleTime = {

                            Actual: round10(orderCycleTimePerHour, -2),
                            Target: warehouseRow.targetOrderCycleTime

                        };
                        if (orderCycleTime.Actual < orderCycleTime.Target) {
                            var dataObject = {
                                warehouseId: warehouseId,
                                textName: "Order Cycle Time current rate below the target rate",
                                module: "ORDER-CYCLE-TIME",
                                name: "",
                                id: ""
                            };
                            alertService.createAlert(dataObject);
                        }

                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime);

                    },

                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-8') : '';
                        var timeTaken = 0;
                        var totalShippedItem = 0;

                        pickSubListModel.find({'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1, 'status': 31}, function (err, pickSubListRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (pickSubListRow.length == 0) {

                                waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime, timeTaken, totalShippedItem);

                            } else {

                                async.eachSeries(pickSubListRow, function (element, callback) {

                                    timeTaken = timeTaken + (((element.timeEnded) - (element.timeAssigned)) / 3600);

                                    totalShippedItem = pickSubListRow.length

                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime, timeTaken, totalShippedItem);
                                    }
                                });
                            }
                        });
                    },

                    // Order completion time
                    function (startTime, pickLine, putLine, pickDoneCount, putDoneCount, orderCycleTime, timeTaken, totalShippedItem, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-9') : '';

                        if (timeTaken == 0) {

                            var orderCompletion = {

                                Actual: 0,
                                Target: warehouseRow.targetOrderCompletion

                            };

                        } else {

                            var orderCompletion = {

                                Actual: Math.round(totalShippedItem / timeTaken),
                                Target: warehouseRow.targetOrderCompletion

                            };
                            if (orderCompletion.Actual < orderCompletion.Target) {
                                var dataObject = {
                                    warehouseId: warehouseId,
                                    textName: "Order Completion current rate below the target rate",
                                    module: "ORDER-COMPLETION",
                                    name: "",
                                    id: ""
                                };
                                alertService.createAlert(dataObject);
                            }
                        }
                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderCompletion);

                    },
                    // Inventory on hand weight
                    function (startTime, pickLine, putLine, orderCycleTime, orderCompletion, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-10') : '';

                        var totalWeight = 0;

                        itemStoreModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemStoreRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (itemStoreRow.length == 0) {

                                var inventoryOnHandWeight = {
                                    Actual: 0,
                                    Target: warehouseRow.targetInventoryHandWeight
                                };

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderCompletion, inventoryOnHandWeight);
                            } else {

                                async.eachSeries(itemStoreRow, function (element, callback) {

                                    totalWeight += parseInt(element.randomFields[0].netWeight) ? parseInt(element.randomFields[0].netWeight) : 0;

                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR '+err, status: 'error', statusCode: '500'});
                                    } else {

                                        var inventoryOnHandWeight = {
                                            Actual: totalWeight / 1000,
                                            Target: warehouseRow.targetInventoryHandWeight
                                        };
                                        if (inventoryOnHandWeight.Actual < inventoryOnHandWeight.Target) {
                                            var dataObject = {
                                                warehouseId: warehouseId,
                                                textName: "InventoryOnHandWeight current rate below the target rate",
                                                module: "INVENTORY ON HAND WEIGHT",
                                                name: "",
                                                id: ""
                                            };
                                            alertService.createAlert(dataObject);
                                        }

                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderCompletion, inventoryOnHandWeight);
                                    }
                                });
                            }
                        });
                    },
                    // Inventory on hand price
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-11') : '';

                        var totalPrice = 0;
                        var unit = '';
                        itemMasterModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemMasterRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (itemMasterRow.length == 0) {

                                var inventoryOnHandPrice = {
                                    Actual: 0,
                                    Target: warehouseRow.targetInventoryHandPrice,
                                    Unit: ""
                                };

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice);

                            } else {

                                async.eachSeries(itemMasterRow, function (element, callback) {

                                    itemStoreModel.count({'itemMasterId': element._id, 'activeStatus': 1}, function (err, itemStoreCount) {

                                        if (err) {

                                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else {

                                            totalPrice += (element.priceValue) ? (element.priceValue) * itemStoreCount : 0;
                                            unit = element.priceCurrency;
                                            setImmediate(callback);

                                        }
                                    });

                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        var inventoryOnHandPrice = {
                                            Actual: round10((totalPrice / 10000000), -2),
                                            Target: warehouseRow.targetInventoryHandPrice,
                                            Unit: unit
                                        };
                                        if (inventoryOnHandWeight.Actual < inventoryOnHandWeight.Target) {
                                            var dataObject = {
                                                warehouseId: warehouseId,
                                                textName: "InventoryOnHandWeight current rate below the target rate",
                                                module: "INVENTORY ON HAND WEIGHT",
                                                name: "",
                                                id: ""
                                            };
                                            alertService.createAlert(dataObject);
                                        }

                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice);
                                    }
                                });
                            }
                        });
                    },
                    // Warehouse utilization
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-12') : '';

                        var locationArray = [];

                        locationStoreModel.find({'warehouseId': warehouseRow._id, 'activeStatus': 1}, function (err, locationRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (locationRow.length == 0) {

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, locationArray);
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

                                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, locationArray);
                                    }
                                });
                            }
                        });
                    },

                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, locationArray, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-13') : '';

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

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                var weightedUtilization = totalWeightedUtilization / totalLocations;
                                var percentageUtilization = totalPercentageUtilization / totalLocations;

                                // flowController.emit('2', locationArray, weightedUtilization, percentageUtilization);
                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, percentageUtilization);
                            }
                        });
                    },
                    // Warehouse utilization
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, percentageUtilization, waterfallcallback) {
                        console.log(startTime);
                        (consoleLog) ? console.log('WATERFALL-14') : '';

                        var warehouseUtilization = {

                            Actual: round10(percentageUtilization, -2),
                            Target: warehouseRow.targetWarehouseUtilization

                        };
                        if (warehouseUtilization.Actual < warehouseUtilization.Target) {
                            var dataObject = {
                                warehouseId: warehouseId,
                                textName: "Warehouse Utilization current rate below the target rate",
                                module: "WAREHOUSE-UTILIZATION",
                                name: "",
                                id: ""
                            };
                            alertService.createAlert(dataObject);
                        }

                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization);
                    },
                    // Device in use 1
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-15') : '';

                        var deviceArr = [];

                        deviceMastersModel.find({'warehouseId': warehouseId, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, deviceMasterRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else if (deviceMasterRow.length == 0) {

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceArr);

                            } else {

                                async.eachSeries(deviceMasterRow, function (element, callback) {

                                    devicesTrackingModel.findOne({'deviceId': element._id, 'timeCreated': {'$gt': startTime}, 'status': "LOGIN", 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceRow) {

                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        } else if (deviceRow == null) {

                                            waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceArr);

                                        } else {

                                            deviceArr.push(deviceRow.deviceId);
                                            setImmediate(callback);
                                        }
                                    });
                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});

                                    } else {

                                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceArr);
                                    }
                                });
                            }

                        });
                    },
                    // device in use 2
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceArr, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-16') : '';

                        var deviceInUse = {
                            Actual: deviceArr.length,
                            Target: 0 //element.targetWarehouseUtilization
                        };


                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse);
                    },
                    // Backlogged picklists
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-17') : '';

                        pickSubListModel.count({'status': 41, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, pickBackOrderCount) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR '+err, status: 'error', statusCode: '500'});

                            } else {

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, pickBackOrderCount);
                            }
                        });
                    },
                    // Backlogged Putlist
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, pickBackOrderCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-18') : '';

                        putListModel.count({'status': 41, 'timeCreated': {'$gt': startTime}, 'activeStatus': 1}, function (err, putBackOrderCount) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR '+err, status: 'error', statusCode: '500'});

                            } else {

                                waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, pickBackOrderCount, putBackOrderCount);
                            }
                        });
                    },
                    // Total back orders
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, pickBackOrderCount, putBackOrderCount, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-19') : '';

                        var backOrders = {
                            Actual: pickBackOrderCount + putBackOrderCount,
                            Target: warehouseRow.targetBackOrder
                        };
                        if (backOrders.Actual < backOrders.Target) {
                            var dataObject = {
                                warehouseId: warehouseId,
                                textName: "Back-Order current rate below the target rate",
                                module: "BACK-ORDER",
                                name: "",
                                id: ""
                            };
                            alertService.createAlert(dataObject);
                        }

                        waterfallcallback(null, startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders);
                    },
                    // Order fill rate
                    // Start - get all distinct order number //usersModel
                    function (startTime, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-20') : '';

                        var orderNumberArray = [];

                        pickSubListModel.find({'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

                            if (err) {

                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (pickSubListRow.length == 0) {

                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderNumberArray);
                            } else {

                                async.eachSeries(pickSubListRow, function (element, callback) {

                                    var data = {
                                        orderNumber: element
                                    };

                                    orderNumberArray.push(data);

                                    setImmediate(callback);
                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderNumberArray);
                                    }
                                });
                            }
                        });
                    },

                    function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderNumberArray, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-21') : '';

                        var doneListArray = [];

                        async.eachSeries(orderNumberArray, function (element, callback) {

                            pickSubListModel.count({'orderNumber': element.orderNumber, 'status': 31, 'activeStatus': 1}, function (err, subListDoneCount) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    var data = {
                                        orderNumber: element.orderNumber,
                                        totalDoneList: subListDoneCount
                                    };
                                    doneListArray.push(data);

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                waterfallcallback({message: err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, doneListArray);
                            }
                        });
                    },

                    function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, doneListArray, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-22') : '';

                        var totalListArray = [];

                        async.eachSeries(doneListArray, function (element, callback) {

                            pickSubListModel.count({'orderNumber': element.orderNumber, 'activeStatus': 1}, function (err, subListCount) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    var data = {
                                        orderNumber: element.orderNumber,
                                        totalDoneList: element.totalDoneList,
                                        totalList: subListCount
                                    };

                                    totalListArray.push(data);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                waterfallcallback({message: err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, totalListArray);
                            }
                        });
                    },

                    function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, totalListArray, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-23') : '';

                        var doneCount = 0;

                        async.eachSeries(totalListArray, function (element, callback) {

                            if ((element.totalList) === (element.totalDoneList)) {

                                doneCount++;
                            }
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                waterfallcallback({message: err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, totalListArray, doneCount);
                            }
                        });
                    },

                    function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, totalListArray, doneCount, waterfallcallback) {
                        (consoleLog) ? console.log('WATERFALL-24') : '';

                        if ((totalListArray.length) == 0) {

                            var orderFillRatePercentage = 0;
                            waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderFillRatePercentage);
                        } else {

                            var orderFillRatePercentage = (doneCount * 100) / (totalListArray.length)
                            waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderFillRatePercentage);
                        }
                    },
                    // Order fill rate
                    function (pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderFillRatePercentage, waterfallcallback) {

                        (consoleLog) ? console.log('WATERFALL-25') : '';

                        var orderFillRate = {

                            Actual: round10(orderFillRatePercentage, -2),
                            Target: warehouseRow.targetOrderFillRate

                        };
                        if (orderFillRate.Actual < orderFillRate.Target) {
                            var dataObject = {
                                warehouseId: warehouseId,
                                textName: "Order Fill Rate below the target rate",
                                module: "ORDER FILL RATE",
                                name: "",
                                id: ""
                            };
                            alertService.createAlert(dataObject);
                        }

                        waterfallcallback(null, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderFillRate);

                    }
                    // End
                ], function (err, pickLine, putLine, orderCycleTime, orderComplition, inventoryOnHandWeight, inventoryOnHandPrice, warehouseUtilization, deviceInUse, backOrders, orderFillRate) {

                    (consoleLog) ? console.log('WATERFALL-RESULT') : '';

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {
                        flowController.emit('END');
                    }
                });
            }
        });
    });

    // End
    flowController.on('END', function (result) {

        (consoleLog) ? console.log('END') : '';
        console.log("Your warehouseKPI alert generated...Please check your notification");
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';
        (consoleLog) ? console.log(error) : '';

    });

    // Initialize
    flowController.emit('START');
}
task.start();
//task.stop();

module.exports = router;