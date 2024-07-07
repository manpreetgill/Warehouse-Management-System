var events = require('events');
var EventEmitter = events.EventEmitter;
var requestify = require('requestify');
//**************************************************************************************************
var clientsModel = require('../models/mongodb/locationMaster-companyMaster/collection-client');
var warehouseMasterModel = require('../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
//**************************************************************************************************
var dashboardService = {};
//************************************************************************************
dashboardService.createAlert = function (callback) {

    var consoleLog = 1;

    (consoleLog) ? console.log("SERVICE CALL") : '';

    var flowController = new EventEmitter();
    //
    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('SERVICE-START') : '';

        clientsModel.findOne({'activeStatus': 1}, function (err, clientRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
            } else if (clientRow == null) {

                flowController.emit('ERROR', {message: 'Client details not found in system! Contact avancer.', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('1', clientRow);
            }
        });
    });

    // Get client details
    flowController.on('1', function (clientRow) {

        (consoleLog) ? console.log('SERVICE-1') : '';

        warehouseMasterModel.findOne({'activeStatus': 1, "clientId": clientRow._id}, function (err, warehouseRow) {
            if (err) {

                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
            } else if (warehouseRow == null) {

                flowController.emit('ERROR', {message: 'Client details not found in system! Contact avancer.', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('2', clientRow, warehouseRow);
            }
        });
    });
    //
    //
    flowController.on('2', function (clientRow, warehouseRow) {

        (consoleLog) ? console.log('SERVICE-2') : '';
        console.log(clientRow);
        var baseUrl = clientRow.baseUrl;
        var warehouseId = warehouseRow._id;

        var requestifyUrl = baseUrl + '/v1/dashboardMaster/masterData/action/inventory/activity-update/';

        var object = {
            warehouseId: warehouseId
        };

        requestify.post(requestifyUrl, object).then(function (response) {

            var result = response.getBody();

            if (result.status === 'success') {
                flowController.emit('END', result);
            }
            if (result.status === 'error') {
                flowController.emit('ERROR', result);
            }
        });
    });
    //
    //END
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('SERVICE-END') : '';
        (consoleLog) ? console.log(response) : '';

        callback(null, response);
    });
    //
    // ERROR
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('SERVICE-ERROR') : '';
        (consoleLog) ? console.log(error) : '';

        callback(error);
    });
    //
    // START
    flowController.emit('START');
};

module.exports = dashboardService;
