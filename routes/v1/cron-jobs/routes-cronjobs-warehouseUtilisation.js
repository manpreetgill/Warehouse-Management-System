var express = require('express'); // MVC Framework
var router = express.Router();
var events = require('events');
var EventEmitter = events.EventEmitter;
var moment = require('moment'); //timestamp
var momenttimezone = require('moment-timezone'); //timestamp zone
var requestify = require('requestify');
var cron = require('node-cron');
var async = require('async');
var round10 = require('round10').round10;
//------------------------------------------------------------------------------------------------------------------------
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var userTypeModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var warehouseUtilizationModel = require('../../../models/mongodb/locationMaster-warehouseUtilization/collection-warehouseUtilization');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
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

    var consoleLog = 0;

    console.log('|-----------------------------------------------CRON RUNNING-----------------------------------------------|');

    var flowController = new EventEmitter();

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

        warehouseMasterModel.findOne({'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('2', clientRow, warehouseRow);
            }
        });
    });

    // Get start time and end time of current day
    flowController.on('2', function (clientRow, warehouseRow) {

        (consoleLog) ? console.log('2') : '';

        var date1 = moment(new Date()).format('YYYY-MM-DD');

        timestamp = moment(date1).unix();

        var endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;

        flowController.emit('3', endTime, clientRow, warehouseRow);
    });

    // Check if current time exceeds end time of day 
    // Call all functions to execute for operations from here
    flowController.on('3', function (endTime, clientRow, warehouseRow) {

        (consoleLog) ? console.log('3') : '';

        var currentTime = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

        if (currentTime >= endTime) {

            warehouseUtilizationModel.find({'date': moment(new Date()).format('DD/MM/YY')}, function (err, cronDataRow) {
                if (err) {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else if (cronDataRow.length != 0) {

                    flowController.emit('END', {message: 'Cron details already updated!', status: 'success', statusCode: '200'});
                } else {

                    warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, backlogRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (backlogRow == null) {

                            flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
                        } else {

                            if (backlogRow.cronActivated == 'YES') {

                                autoBacklogScript(clientRow, warehouseRow);
                            } else {
                                updateTodaysWarehouseUtilization(clientRow, warehouseRow);
                            }
                        }

                    });
                }
            });

        } else {

            flowController.emit('END', {message: 'Iteration complete!', status: 'success', statusCode: '200'});
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
//
//----------------------------------------------------------------------------------------------------------------------------
// Auto Backlog
function autoBacklogScript(clientRow, warehouseRow) {

    var consoleLog = 1;

    var flowController = new EventEmitter();

    // Get avancer user mongoId
    flowController.on('GET-USER', function (clientRow, warehouseRow) {

        (consoleLog) ? console.log('GET-USER') : '';

        userModel.findOne({'username': 'AVANCER', 'activeStatus': 1}, function (err, userRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (userRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '404'});
            } else {

                var userId = String(userRow._id);

                flowController.emit('START-CRON', clientRow.baseUrl, String(warehouseRow._id), userId);
            }
        });
    });

    // Cron job for Putlist Backlog
    flowController.on('START-CRON', function (baseUrl, warehouseId, userId) {

        (consoleLog) ? console.log('START-CRON') : '';

        //flowController.emit('CRON-PUT', baseUrl, warehouseId, userId);
        flowController.emit('CRON-PICK', baseUrl, warehouseId, userId);
    });

    // Cron job for Put
    flowController.on('CRON-PUT', function (baseUrl, warehouseId, backloggedBy) {

        (consoleLog) ? console.log('CRON-PUT') : '';

        var requestifyUrl = baseUrl + '/v1/processMaster/mobile/putList/action/update-status/pending-backlog/';

        requestify.post(requestifyUrl, {warehouseId: warehouseId, backloggedBy: backloggedBy}).then(function (response) {

            var result = response.getBody();

            if (result.status === 'success') {

                flowController.emit('END', result);
            }

            if (result.status === 'error') {

                flowController.emit('END', result);
            }
        });
    });

    // Cron job for Pick
    flowController.on('CRON-PICK', function (baseUrl, warehouseId, backloggedBy) {

        (consoleLog) ? console.log('CRON-PICK') : '';

        var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickList/action/update-status/pending-backlog/';

        requestify.post(requestifyUrl, {warehouseId: warehouseId, backloggedBy: backloggedBy}).then(function (response) {

            var result = response.getBody();

            if (result.status === 'success') {

                flowController.emit('END', result);
            }

            if (result.status === 'error') {

                flowController.emit('END', result);
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysWarehouseUtilization(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('GET-USER', clientRow, warehouseRow);
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Warehouse Utilization
function updateTodaysWarehouseUtilization(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('Warehouse-Utilization') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    // Start
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        var locationArray = [];

        locationStoreModel.find({'warehouseId': warehouseRow._id, 'activeStatus': 1}, function (err, locationRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (locationRow.length == 0) {

                flowController.emit('ERROR', {message: 'No locations available or configured yet!', status: 'error', statusCode: '404'});
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

                        flowController.emit('1', locationArray);
                    }
                });
            }
        });
    });

    // Calculate total utilization average
    flowController.on('1', function (locationArray) {

        (consoleLog) ? console.log('1') : '';

        var totalLocations = 0;
        var totalWeightedUtilization = 0;
        var totalPercentageUtilization = 0;
        var totalUtilized = 0;
        var totaluserDef = 0

        async.eachSeries(locationArray, function (element, callback) {

            totalLocations = totalLocations + 1;
            totalUtilized = totalUtilized + element.utilizedCapacity;
            totaluserDef = totaluserDef + element.userDefinedCapacity;
            totalWeightedUtilization = totalWeightedUtilization + element.weightedUtilization;
            totalPercentageUtilization = totalPercentageUtilization + element.percentageUtilization;
            setImmediate(callback);

        }, function (err) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else {

                var weightedUtilization = totalWeightedUtilization / totalLocations;
                var percentageUtilization = totalPercentageUtilization / totalLocations;

//                console.log("totaluserDef "+totaluserDef);
//                console.log("totalUtilized "+totalUtilized);
//                console.log("weightedUtilization "+weightedUtilization);
//                console.log("percentageUtilization "+percentageUtilization);

                flowController.emit('2', locationArray, weightedUtilization, percentageUtilization);
            }
        });
    });

    // Insert warehouse utilization
    flowController.on('2', function (locationArray, weightedUtilization, percentageUtilization) {

        (consoleLog) ? console.log('2') : '';

        var newWarehouseUtilizationModel = new warehouseUtilizationModel();

        newWarehouseUtilizationModel.clientId = clientRow._id;
        newWarehouseUtilizationModel.warehouseId = warehouseRow._id;
        newWarehouseUtilizationModel.date = moment(new Date()).format('DD/MM/YY');
        newWarehouseUtilizationModel.weightedUtilization = weightedUtilization;
        newWarehouseUtilizationModel.percentageUtilization = percentageUtilization;
        newWarehouseUtilizationModel.warehouseUtilization = locationArray;
        newWarehouseUtilizationModel.timeCreated = timeInInteger;

        newWarehouseUtilizationModel.save(function (err) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse utilization updated!'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysOrderCycleTime(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';

    });

    // Initialize
    flowController.emit('START');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Order Cycle Time
function updateTodaysOrderCycleTime(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('ORDER-CYCLE-TIME') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var orderCycleTime = 0;

    flowController.on('START-OCT', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1.1', startTime, endTime);
            }
        });
    });

    // Start - get all distinct order number 
    flowController.on('1.1', function (startTime, endTime) {

        (consoleLog) ? console.log('1.1') : '';

        var orderNumberArray = [];

        pickSubListModel.find({'activeStatus': 1, 'timeEnded': {'$gte': startTime, $lte: endTime}}).distinct('orderNumber', function (err, pickSubListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (pickSubListRow.length == 0) {

                flowController.emit('1', orderNumberArray);
            } else {

                async.eachSeries(pickSubListRow, function (element, callback) {

                    orderNumberArray.push(element);

                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', orderNumberArray);
                    }
                });
            }
        });
    });

    // Get all order specific sublist
    flowController.on('1', function (orderNumberArray) {

        (consoleLog) ? console.log('1') : '';

        var orderDataArray = [];

        async.eachSeries(orderNumberArray, function (element, callback) {

            pickSubListModel.find({'orderNumber': element, 'status': 31, 'activeStatus': 1}, function (err, subListRow) {

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

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('2', orderNumberArray, orderDataArray);
            }
        });
    });

    // Get total order cycle time
    flowController.on('2', function (orderNumberArray, orderDataArray) {

        (consoleLog) ? console.log('2') : '';

        async.eachSeries(orderDataArray, function (element, callback) {

            orderCycleTime = orderCycleTime + (parseInt(element.timeEnded) - parseInt(element.timeStarted));

            setImmediate(callback);

        }, function (err) {

            if (err) {

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('3', orderNumberArray, orderCycleTime);
            }
        });
    });

    // Calculation
    flowController.on('3', function (orderNumberArray, orderCycleTime) {

        (consoleLog) ? console.log('3') : '';

        var orderCycleTimeInHrs = orderCycleTime / 3600;


        if (orderNumberArray.length == 0) {

            var orderCycleTimePerHour = 0;

            flowController.emit('UPDATE', orderCycleTimePerHour);

        } else {

            var orderCycleTimePerHour = orderCycleTimeInHrs / orderNumberArray.length;

            flowController.emit('UPDATE', orderCycleTimePerHour);

        }
    });

    // Insert order cycle time
    flowController.on('UPDATE', function (orderCycleTimePerHour) {

        (consoleLog) ? console.log('update') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};
        var update = {'$set': {'orderCycleTimePerHour': orderCycleTimePerHour}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Order Cycle Time'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysOrderShipmentTime(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-OCT');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Order Shipment Time
function updateTodaysOrderShipmentTime(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('ORDER-SHIPMENT-TIME') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var onTime = 0;
    var offTime = 0;

    flowController.on('START-OST', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('START1', startTime, endTime);
            }
        });
    });

    // Start - get all distinct order number 
    flowController.on('START1', function (startTime, endTime) {

        (consoleLog) ? console.log('START1') : '';

        var orderNumberArray = [];

        pickSubListModel.find({'timeEnded': {'$gte': startTime, $lte: endTime}, 'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (pickSubListRow.length == 0) {

                flowController.emit('1', orderNumberArray, startTime, endTime);

            } else {

                async.eachSeries(pickSubListRow, function (element, callback) {

                    orderNumberArray.push(element);

                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', orderNumberArray, startTime, endTime);
                    }
                });
            }
        });
    });

    // Get all order specific sublist
    flowController.on('1', function (orderNumberArray, startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        var orderDataArray = [];

        async.eachSeries(orderNumberArray, function (element, callback) {

            pickSubListModel.find({'orderNumber': element, 'timeEnded': {'$gte': startTime, $lte: endTime}, "status": 31, 'activeStatus': 1}, function (err, subListRow) {

                if (err) {

                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else if (subListRow.length == 0) {

                    setImmediate(callback);
                } else {

                    async.eachSeries(subListRow, function (element1, callback1) {

                        var data = {
                            orderNumber: element,
                            timeAssigned: (element1.timeAssigned) ? (element1.timeAssigned) : 0,
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

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('2', orderNumberArray, orderDataArray);
            }
        });
    });

    // calculation 1
    flowController.on('2', function (orderNumberArray, orderDataArray) {

        (consoleLog) ? console.log('2') : '';

        async.eachSeries(orderDataArray, function (element, callback) {

            var timetaken = ((element.timeEnded) - (element.timeAssigned)) / 3600;

            var targetTime = warehouseRow.targetOrderCycleTime;

            if (timetaken <= targetTime) {

                onTime++;
            } else {

                offTime++;
            }

            setImmediate(callback);

        }, function (err) {

            if (err) {

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('3', onTime, offTime, orderDataArray);
            }
        });
    });

    // calculation 2
    flowController.on('3', function (onTime, offTime, orderDataArray) {

        (consoleLog) ? console.log('3 ' + onTime + " " + offTime + " " + orderDataArray) : '';

        var onTimeShipment = 0;

        if ((onTime + offTime) == 0) {

            flowController.emit('UPDATE', onTimeShipment);
        } else {
            var onTimeShipment = (onTime * 100) / (orderDataArray.length);

            flowController.emit('UPDATE', onTimeShipment);
        }
    });

    // Insert onTimeShipment
    flowController.on('UPDATE', function (onTimeShipment) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};
        var update = {'$set': {'onTimeShipment': onTimeShipment}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Ontime Shipment'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysBackOrders(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-OST');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Backorders
function updateTodaysBackOrders(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('Backorders') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var totalList = 0;
    var totalBacklogList = 0;

    // Start - get all distinct order number 
    flowController.on('START-BO', function () {

        (consoleLog) ? console.log('START') : '';

        var orderNumberArray = [];

        pickSubListModel.find({'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (pickSubListRow.length == 0) {

                flowController.emit('1', orderNumberArray);

            } else {

                async.eachSeries(pickSubListRow, function (element, callback) {

                    orderNumberArray.push(element);

                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', orderNumberArray);
                    }
                });
            }
        });
    });

    // order specific total list
    flowController.on('1', function (orderNumberArray) {

        (consoleLog) ? console.log('1') : '';

        async.eachSeries(orderNumberArray, function (element, callback) {

            pickSubListModel.count({'orderNumber': element, 'activeStatus': 1}, function (err, subListCount) {

                if (err) {

                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else {

                    totalList = totalList + subListCount;

                    setImmediate(callback);
                }
            });
        }, function (err) {

            if (err) {

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('2', orderNumberArray, totalList);
            }
        });
    });

    // get total backlog list
    flowController.on('2', function (orderNumberArray, totalList) {

        (consoleLog) ? console.log('2') : '';

        async.eachSeries(orderNumberArray, function (element, callback) {

            pickSubListModel.count({'orderNumber': element, 'status': 41, 'activeStatus': 1}, function (err, backlogCount) {

                if (err) {

                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else {

                    totalBacklogList = totalBacklogList + backlogCount;

                    setImmediate(callback);
                }
            });
        }, function (err) {

            if (err) {

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('3', orderNumberArray, totalList, totalBacklogList);
            }
        });
    });

    // calculation
    flowController.on('3', function (orderNumberArray, totalList, totalBacklogList) {

        (consoleLog) ? console.log('3') : '';

        var totalBackOrders = 0;

        if (totalList == 0) {
            flowController.emit('UPDATE', totalBackOrders);
        } else {

            totalBackOrders = (totalBacklogList * 100) / totalList;

            flowController.emit('UPDATE', totalBackOrders);
        }
    });

    // Insert order cycle time
    flowController.on('UPDATE', function (backOrderPercentage) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};
        var update = {'$set': {'totalBackOrders': backOrderPercentage}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Back Order'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysLinesPickedPerHour(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-BO');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Lines Picked Per Hour
function updateTodaysLinesPickedPerHour(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('LINE-PICKED-PER-HOUR') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var totalActiveHours = 0;
    var totalPickedList = 0;

    // Start - get all distinct order number //usersModel
    flowController.on('START-LP', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '500'});
            } else {

                var endTime;
                var startTime;

                var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                var currentTime = moment(startTimeIn, 'h:mm');
                var dayEndTime = moment(endTimeIn, 'h:mm');

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });
    });

    //2
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        pickSubListModel.count({'timeEnded': {'$gte': startTime, $lte: endTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else {

                var pickRate = round10((pickDoneCount / ((timeInInteger - startTime) / 3600)), -2);

                flowController.emit('UPDATE', pickRate, startTime, endTime);
            }
        });
    });

    // Insert linesPicked/hours
    flowController.on('UPDATE', function (pickRate, startTime, endTime) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};
        var update = {'$set': {'linesPickedPerHour': pickRate}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'operation successful-LinesPickedPerHour'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysOrderFillRate(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-LP');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Order Fill Rate
function updateTodaysOrderFillRate(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('ORDER-FILL-RATE') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    flowController.on('START-OFR', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '500'});
            } else {

                var endTime;
                var startTime;

                var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                var currentTime = moment(startTimeIn, 'h:mm');
                var dayEndTime = moment(endTimeIn, 'h:mm');

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('START1', startTime, endTime);
            }
        });
    });

    // Start - get all distinct order number //usersModel
    flowController.on('START1', function (startTime, endTime) {

        (consoleLog) ? console.log('START1') : '';

        var orderNumberArray = [];

        pickSubListModel.find({'activeStatus': 1, 'timeCreated': {'$gte': startTime, $lte: endTime}}).distinct('orderNumber', function (err, pickSubListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (pickSubListRow.length == 0) {

                flowController.emit('1', orderNumberArray);
            } else {

                async.eachSeries(pickSubListRow, function (element, callback) {

                    var data = {
                        orderNumber: element
                    };

                    orderNumberArray.push(data);

                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', orderNumberArray);
                    }
                });
            }
        });
    });

    // order specific total done list
    flowController.on('1', function (orderNumberArray) {

        (consoleLog) ? console.log('1') : '';

        var doneListArray = [];

        async.eachSeries(orderNumberArray, function (element, callback) {

            pickSubListModel.count({'orderNumber': element.orderNumber, 'status': 31, 'activeStatus': 1}, function (err, subListDoneCount) {

                if (err) {

                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
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

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('2', doneListArray);
            }
        });
    });

    // order specific total list
    flowController.on('2', function (doneListArray) {

        (consoleLog) ? console.log('2') : '';

        var totalListArray = [];

        async.eachSeries(doneListArray, function (element, callback) {

            pickSubListModel.count({'orderNumber': element.orderNumber, 'activeStatus': 1}, function (err, subListCount) {

                if (err) {

                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
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

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('3', totalListArray);
            }
        });
    });

    // get order specific doneCount 
    flowController.on('3', function (totalListArray) {

        (consoleLog) ? console.log('3') : '';

        var doneCount = 0;

        async.eachSeries(totalListArray, function (element, callback) {

            if ((element.totalList) === (element.totalDoneList)) {

                doneCount++;
            }
            setImmediate(callback);
        }, function (err) {

            if (err) {

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('4', totalListArray, doneCount);
            }
        });
    });

    // calculation
    flowController.on('4', function (totalListArray, doneCount) {

        (consoleLog) ? console.log('4') : '';

        if ((totalListArray.length) == 0) {

            var orderFillRatePercentage = 0;
            flowController.emit('UPDATE', orderFillRatePercentage);
        } else {

            var orderFillRatePercentage = (doneCount * 100) / (totalListArray.length)
            flowController.emit('UPDATE', orderFillRatePercentage);
        }
    });

    // Insert order fill rate
    flowController.on('UPDATE', function (orderFillRatePercentage) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};
        var update = {'$set': {'percentageOrderFillRate': orderFillRatePercentage}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Order Fill Rate'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysLinesPickedPerHourPerOperator(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-OFR');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Lines Picked Per Hour per operator
function updateTodaysLinesPickedPerHourPerOperator(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('LINE-PICKED-PER-HOUR-PER-OPERATOR') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var totalActiveHours = 0;
    var totalPickedList = 0;

    // Start - get all distinct order number //usersModel
    flowController.on('START-LP-PH-PO', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not available in system!', status: 'error', statusCode: '500'});
            } else {

                var endTime;
                var startTime;

                var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                var currentTime = moment(startTimeIn, 'h:mm');
                var dayEndTime = moment(endTimeIn, 'h:mm');

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });

    });

    //get list of assigned user
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        var userArray = [];

        //pickSubListModel.find({'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

        pickSubListModel.find({'timeEnded': {'$gte': startTime, $lte: endTime}, 'activeStatus': 1}).distinct('assignedTo', function (err, subListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (subListRow.length == 0) {

                flowController.emit('2', userArray);

            } else {

                async.eachSeries(subListRow, function (element, callback) {

                    userArray.push(element.assignedTo);
                    setImmediate(callback);


                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', userArray);
                    }
                });
            }
        });
    });

    //get linesPickedPerHour
    flowController.on('2', function (userArray) {

        (consoleLog) ? console.log('2') : '';

        var linesPickedPerHourPerOperator = 0;

        warehouseUtilizationModel.findOne({'date': moment(new Date()).format('DD/MM/YY'), 'activeStatus': 1}, function (err, utilizationRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (utilizationRow == null) {

                flowController.emit('UPDATE', linesPickedPerHourPerOperator);

            } else {

                var linesPickedPerHour = utilizationRow.linesPickedPerHour;
                var totalNumberOfUser = userArray.length;

                if (totalNumberOfUser == 0) {

                    flowController.emit('UPDATE', linesPickedPerHourPerOperator);

                } else {

                    linesPickedPerHourPerOperator = linesPickedPerHour / totalNumberOfUser;

                    flowController.emit('UPDATE', linesPickedPerHourPerOperator)

                }
            }

        })
    });

    // Insert linesPickedPerHourPerOperator
    flowController.on('UPDATE', function (linesPickedPerHourPerOperator) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'linesPickedPerHourPerOperator': linesPickedPerHourPerOperator}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'operation successful-linesPickedPerHourPerOperator'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysProductiveHoursToTotalHours(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-LP-PH-PO');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Productive hours to total hours
function updateTodaysProductiveHoursToTotalHours(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('PRODUCTIVE-HOURS-TO-TOTAL-HOURS') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var totalActiveHours = 0;
    var totalProductiveHours_pick = 0;
    var totalProductiveHours_put = 0;
    var totalProductiveHours = 0;

    // START AND END TIME
    flowController.on('START-PH-T-TH', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });
    });

    //1
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        userTypeModel.findOne({'warehouseId': warehouseRow._id, 'name': 'OPERATOR', 'activeStatus': 1}, function (err, userTypeRow) {

            var userTypeId = userTypeRow._id;

            flowController.emit('2', userTypeId, startTime, endTime);
        });
    });

    //GET ALL USER ACTIVE HOURS
    flowController.on('2', function (userTypeId, startTime, endTime) {

        (consoleLog) ? console.log('2') : '';

        userModel.find({'warehouseId': warehouseRow._id, 'userTypeId': userTypeId, 'activeStatus': 1}, function (err, userRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (userRow.length == 0) {

                flowController.emit('3', totalActiveHours, userRow, startTime, endTime);

            } else {
                var userData = [];
                async.eachSeries(userRow, function (element, callback) {

                    var d = moment().add(-1, 'days').format('DD/MM/YY');

                    hoursTrackingModel.findOne({'userId': element._id, 'timeCreated': {$gte: startTime, $lte: endTime}, }, function (err, hoursTrackingRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (hoursTrackingRow == null) {

                            totalActiveHours = totalActiveHours + 0;
                            setImmediate(callback);
                        } else {
                            console.log("activeTime " + hoursTrackingRow.activeTime);
                            totalActiveHours = totalActiveHours + ((hoursTrackingRow.activeTime) / 3600);
                            userData.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', totalActiveHours, userData, startTime, endTime);
                    }
                });
            }
        });
    });

    //GET PRODUTIVE HOURS FOR PICK PROCESS
    flowController.on('3', function (totalActiveHours, userRow, startTime, endTime) {

        (consoleLog) ? console.log('3') : '';

        async.eachSeries(userRow, function (element, callback) {

            pickSubListModel.find({'timeEnded': {$gte: startTime, $lte: endTime}, 'status': 31, 'assignedTo': element._id, 'activeStatus': 1}, function (err, subListRow) {

                if (err) {

                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                } else if (subListRow.length == 0) {

                    setImmediate(callback);

                } else {
                   // console.log("sublist lenght " + subListRow);
                    async.eachSeries(subListRow, function (element1, callback1) {
                        
                        totalProductiveHours_pick += ((element1.timeEnded) - (element1.timeStarted)) / 3600;

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

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('4', totalActiveHours, userRow, totalProductiveHours_pick, startTime, endTime);
            }
        });

    });

    // GET PRODUTIVE HOURS FOR PUT PROCESS
    flowController.on('4', function (totalActiveHours, userRow, totalProductiveHours_pick, startTime, endTime) {

        (consoleLog) ? console.log('4') : '';

        async.eachSeries(userRow, function (element, callback) {

            putListModel.find({'timeCompleted': {$gte: startTime, $lte: endTime}, 'status': 31, 'assignedTo': element._id, 'activeStatus': 1}, function (err, putListRow) {

                if (err) {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                } else if (putListRow.length == 0) {

                    setImmediate(callback);

                } else {
                    async.eachSeries(putListRow, function (element1, callback1) {
                        totalProductiveHours_put += ((element1.timeCompleted) - (element1.timeStarted)) / 3600;

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

                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('5', totalActiveHours, userRow, totalProductiveHours_pick, totalProductiveHours_put, startTime, endTime);
            }
        });
    });

    //CALCULATE
    flowController.on('5', function (totalActiveHours, userRow, totalProductiveHours_pick, totalProductiveHours_put, startTime, endTime) {

        var todayProductiveHours = 0;

        (consoleLog) ? console.log('5') : '';

        if (totalActiveHours == 0) {
            flowController.emit('UPDATE', todayProductiveHours);
        } else {
            totalProductiveHours = totalProductiveHours_pick + totalProductiveHours_put;
            var todayProductiveHoursPer = (totalProductiveHours * 100) / totalActiveHours;
            flowController.emit('UPDATE', todayProductiveHoursPer);
        }
    });

    // Insert todayProductiveHours
    flowController.on('UPDATE', function (todayProductiveHours) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'todayProductiveHours': todayProductiveHours}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'operation successful-todayProductiveHours'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysProductiveHoursPerDayPerOperator(clientRow, warehouseRow);

    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-PH-T-TH');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Productive hours Per Day per Operator
function updateTodaysProductiveHoursPerDayPerOperator(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('PRODUCTIVE-HOURS-PER-DAY-PER-OPERATOR') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    // START AND END TIME
    flowController.on('START-PH-PD-PO', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Warehouse details not allowed in system!', status: 'error', statusCode: '404'});
            } else {

                var endTime;
                var startTime;

                var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                var currentTime = moment(startTimeIn, 'h:mm');
                var dayEndTime = moment(endTimeIn, 'h:mm');

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });
    });

    //1 Get operator user type mongoID
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        userTypeModel.findOne({'warehouseId': warehouseRow._id, 'name': 'OPERATOR', 'activeStatus': 1}, function (err, userTypeRow) {

            var userTypeId = userTypeRow._id;

            flowController.emit('2', userTypeId, startTime, endTime);
        });
    });

    //GET NUMBER OF USER
    flowController.on('2', function (userTypeId, startTime, endTime) {

        (consoleLog) ? console.log('2') : '';

        var totalNumberOfUser = 0;

        userModel.find({'warehouseId': warehouseRow._id, 'userTypeId': userTypeId, 'activeStatus': 1}, function (err, userRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

            } else if (userRow.length == 0) {

                flowController.emit('3', totalNumberOfUser);

            } else {
                var userData = [];
                async.eachSeries(userRow, function (element, callback) {

                    var d = moment().add(-1, 'days').format('DD/MM/YY');
                    devicesTrackingModel.findOne({'userId': element._id, 'timeCreated': {$gte: startTime, $lte: endTime}, 'activeStatus': 1}, function (err, deviceRow) {

                        if (err) {

                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                        } else if (deviceRow == null) {

                            setImmediate(callback);

                        } else {

                            userData.push(element);

                            callback();
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {
                        totalNumberOfUser = userData.length;

                        flowController.emit('3', totalNumberOfUser);
                    }
                });
            }
        });
    });

    flowController.on('3', function (totalNumberOfUser) {

        (consoleLog) ? console.log('3') : '';

        var productiveHoursPerDayPerOperator = 0;

        warehouseUtilizationModel.findOne({'date': moment(new Date()).format('DD/MM/YY'), 'activeStatus': 1}, function (err, utilizationRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (utilizationRow == null) {

                flowController.emit('UPDATE', productiveHoursPerDayPerOperator);

            } else {

                var todayProductiveHoursPerDay = utilizationRow.todayProductiveHours;

                if (totalNumberOfUser == 0) {

                    flowController.emit('UPDATE', productiveHoursPerDayPerOperator);

                } else {
                    productiveHoursPerDayPerOperator = todayProductiveHoursPerDay / totalNumberOfUser;
                    flowController.emit('UPDATE', productiveHoursPerDayPerOperator);
                }
            }

        });
    });

    // Insert todayProductiveHours
    flowController.on('UPDATE', function (productiveHoursPerDayPerOperator) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'productiveHoursPerOperator': productiveHoursPerDayPerOperator}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'operation successful-productiveHoursPerDayPerOperator'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaySkippedItems(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-PH-PD-PO');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update ITEMS SKIPPED PER DAY
function updateTodaySkippedItems(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('ITEM_SKIPPED') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    // START AND END TIME
    flowController.on('START-SKIPPED', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });

    });

    // GET COUNT OF SKIPPED LIST
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        pickSubListModel.count({'timeAssigned': {$gte: startTime, $lte: endTime}, 'status': {$in: [35, 33]}, 'activeStatus': 1}, function (err, subListSkippedCount) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('UPDATE', subListSkippedCount)
            }
        });
    });

    // Insert Number of skipped list
    flowController.on('UPDATE', function (subListSkippedCount) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'itemSkipped': subListSkippedCount}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Total Skipped PickList'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysPutAwayPerHour(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-SKIPPED');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Put away Per Hour
function updateTodaysPutAwayPerHour(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('LINE-PUTAWAY-PER-HOUR') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var totalActiveHours = 0;
    var totalPutList = 0;

    // Start - get all distinct order number //usersModel
    flowController.on('START-PUT-AWAY', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });
    });

    //1
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';
        putListModel.count({'timeCompleted': {'$gte': startTime, $lte: endTime}, 'activeStatus': 1}, function (err, putDoneCount) {

            if (err) {

                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else {
                var putRate = round10((putDoneCount / ((timeInInteger - startTime) / 3600)), -2);
            }

            flowController.emit('UPDATE', putRate);

        });
    });

    // Insert Put-Away/hours
    flowController.on('UPDATE', function (putRate) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};
        var update = {'$set': {'putAwayPerHour': putRate}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'operation successful-PutAwayPerHour'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodaysPutAwayPerHourPerOperator(clientRow, warehouseRow);
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-PUT-AWAY');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Put away Per Hour per operator
function updateTodaysPutAwayPerHourPerOperator(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('PUT-AWAY-PER-HOUR-PER-OPERATOR') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    var totalActiveHours = 0;
    var totalPickedList = 0;

    // Start - get all distinct order number //usersModel
    flowController.on('START-PA-PH-PO', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });

    });

    //get list of assigned user
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        var userArray = [];

        //pickSubListModel.find({'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

        putListModel.find({'timeCompleted': {$gte: startTime, $lte: endTime}, 'status': 31, 'activeStatus': 1}).distinct('assignedTo', function (err, putListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (putListRow.length == 0) {

                flowController.emit('2', userArray);

            } else {

                async.eachSeries(putListRow, function (element, callback) {

                    userArray.push(element.assignedTo);
                    setImmediate(callback);


                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', userArray);
                    }
                });
            }
        });

    });

    //get Put-away Per Hour
    flowController.on('2', function (userArray) {

        (consoleLog) ? console.log('2') : '';

        var putAwayPerHourPerOperator = 0;

        warehouseUtilizationModel.findOne({'date': moment(new Date()).format('DD/MM/YY'), 'activeStatus': 1}, function (err, utilizationRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (utilizationRow == null) {

                flowController.emit('UPDATE', putAwayPerHourPerOperator);

            } else {

                var putAwayPerHour = utilizationRow.putAwayPerHour;
                var totalNumberOfUser = userArray.length;

                if (totalNumberOfUser == 0) {

                    flowController.emit('UPDATE', putAwayPerHourPerOperator);

                } else {

                    putAwayPerHourPerOperator = putAwayPerHour / totalNumberOfUser;

                    flowController.emit('UPDATE', putAwayPerHourPerOperator)

                }
            }

        })
    });

    // Insert putAwayPerHourPerOperator
    flowController.on('UPDATE', function (putAwayPerHourPerOperator) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'putAwayPerHourPerOperator': putAwayPerHourPerOperator}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - PutAway Per Hour Per Operator'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodayTotalNumberOfOrder(clientRow, warehouseRow);

    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-PA-PH-PO');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Total number of order
function updateTodayTotalNumberOfOrder(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('TOTAL NUMBER OF ORDER') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    // START AND END TIME
    flowController.on('START-TNO', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow._id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });

    });

    // GET COUNT OF order number for pick
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        var orderNumberArray = [];

        pickSubListModel.find({'timeEnded': {$gte: startTime, $lte: endTime}, 'activeStatus': 1}).distinct('orderNumber', function (err, pickSubListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (pickSubListRow.length == 0) {

                flowController.emit('2', startTime, endTime, orderNumberArray);
            } else {

                async.eachSeries(pickSubListRow, function (element, callback) {

                    orderNumberArray.push(element);

                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', startTime, endTime, orderNumberArray);
                    }
                });
            }
        });
    });

    // GET COUNT OF order number for put
    flowController.on('2', function (startTime, endTime, orderNumberArray) {

        (consoleLog) ? console.log('2') : '';

        var orderNumberArray2 = [];

        putListModel.find({'timeCompleted': {$gte: startTime, $lte: endTime}, 'activeStatus': 1}).distinct('orderNumber', function (err, putListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (putListRow.length == 0) {

                flowController.emit('UPDATE', orderNumberArray, orderNumberArray2);
            } else {

                async.eachSeries(putListRow, function (element, callback) {

                    orderNumberArray2.push(element);

                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('UPDATE', orderNumberArray, orderNumberArray2);
                    }
                });
            }
        });
    });

    // Insert Number of Order
    flowController.on('UPDATE', function (orderNumberArray, orderNumberArray2) {

        (consoleLog) ? console.log('UPDATE') : '';

        var totalOrderNumber = (orderNumberArray.length) + (orderNumberArray2.length);

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'totalOrderNumber': totalOrderNumber}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Total Order Number'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';

        updateTodayOrderShippedPerHour(clientRow, warehouseRow);


    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-TNO');
}
//----------------------------------------------------------------------------------------------------------------------------
// Update Order Shipped Per Hour
function updateTodayOrderShippedPerHour(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('orderShippedPerHour') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    // START AND END TIME
    flowController.on('START-OSPH', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow.id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });

    });

    // GET total shipped and timeTaken
    flowController.on('1', function (startTime, endTime) {

        (consoleLog) ? console.log('1') : '';

        var timeTaken = 0;
        var totalShippedItem = 0;

        pickSubListModel.find({'timeEnded': {$gte: startTime, $lte: endTime}, 'activeStatus': 1}, function (err, pickSubListRow) {

            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

            } else if (pickSubListRow.length == 0) {

                flowController.emit('2', timeTaken, totalShippedItem);

            } else {

                async.eachSeries(pickSubListRow, function (element, callback) {

                    timeTaken = timeTaken + (((element.timeEnded) - (element.timeAssigned)) / 3600);

                    totalShippedItem = pickSubListRow.length;

                    setImmediate(callback);

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', timeTaken, totalShippedItem);
                    }
                });
            }
        });
    });

    // calculate order shipped per hour
    flowController.on('2', function (timeTaken, totalShippedItem) {

        (consoleLog) ? console.log('2') : '';

        var orderShippedPerHour = 0;

        if (timeTaken == 0) {

            flowController.emit("UPDATE", orderShippedPerHour);

        } else {

            orderShippedPerHour = totalShippedItem / timeTaken;

            flowController.emit("UPDATE", orderShippedPerHour);

        }

    });

    // Insert Order Shipped Per Hour
    flowController.on('UPDATE', function (orderShippedPerHour) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'orderShippedPerHour': orderShippedPerHour}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Order Shipped Per Hour'});
            }
        });
    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';
        updateTodayInventoryOnHandWeight(clientRow, warehouseRow);
        (consoleLog) ? console.log(response) : '';


    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';
        updateTodayInventoryOnHandWeight(clientRow, warehouseRow);
        (consoleLog) ? console.log(error) : '';
    });

    // Initialize
    flowController.emit('START-OSPH');
}
//----------------------------------------------------------------------------------------------------------------------------
// Inventory On Hand Weight
function updateTodayInventoryOnHandWeight(clientRow, warehouseRow) {

    var consoleLog = 1;

    (consoleLog) ? console.log('orderShippedPerHour') : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var flowController = new EventEmitter();

    // START AND END TIME
    flowController.on('START-IOHW', function () {

        (consoleLog) ? console.log('START') : '';

        warehouseMasterModel.findOne({'_id': warehouseRow.id, 'activeStatus': 1}, function (err, warehouseRow) {
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

                var date1 = moment(new Date()).format('YYYY-MM-DD');
                timestamp = moment(date1).unix();
                endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                startTime = parseInt(endTime) - 86400;

                flowController.emit('1', startTime, endTime);
            }
        });
    });
    flowController.on('1', function (startTime, endTime) {
        itemStoreModel.aggregate([
            {'$match': {'activeStatus': 1}},
            {'$unwind': {'path': "$randomFields", preserveNullAndEmptyArrays: false}},
            {'$group': {'_id': '$id', 'total': {'$sum': '$randomFields.netWeight'}}}
        ], function (err, result) {
            if (err) {
                throw err;
            } else {
                var inventoryOnHandWeight = (result.length != 0) ? result[0].total / 1000 : 0;
                flowController.emit("UPDATE", inventoryOnHandWeight);
            }
        });
    });
    // Insert Invetory on hand weight
    flowController.on('UPDATE', function (inventoryOnHandWeight) {

        (consoleLog) ? console.log('UPDATE') : '';

        var query = {'date': moment(new Date()).format('DD/MM/YY')};

        var update = {'$set': {'inventoryOnHandWeight': inventoryOnHandWeight}};

        warehouseUtilizationModel.update(query, update, function (err) {
            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else {

                flowController.emit('END', {message: 'Warehouse KPI - Inventory On Hand Weight'});
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
    flowController.emit('START-IOHW');
}
task.start();
//task.stop();

module.exports = router;