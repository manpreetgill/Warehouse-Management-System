var events = require('events');
var EventEmitter = events.EventEmitter;
var requestify = require('requestify');
//**************************************************************************************************
var clientsModel = require('../models/mongodb/locationMaster-companyMaster/collection-client');
//**************************************************************************************************
var alertService = {};
//************************************************************************************
alertService.createAlert = function (dataObject, callback) {

    var consoleLog = 0;

    //(consoleLog) ? console.log(dataObject) : '';

    var flowController = new EventEmitter();
    //
    // Get client details
    flowController.on('START', function () {

        (consoleLog) ? console.log('ALERT-START') : '';

        clientsModel.findOne({'activeStatus': 1}, function (err, clientRow) {
            if (err) {

                flowController.emit('ERROR', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
            } else if (clientRow == null) {

                flowController.emit('ERROR', {message: 'Client details not found in system! Contact avancer.', status: 'error', statusCode: '404'});
            } else {

                flowController.emit('1', clientRow);
            }
        });
    });
    //
    //
    flowController.on('1', function (clientRow) {

        (consoleLog) ? console.log('ALERT-1') : '';
        
        var baseUrl = clientRow.baseUrl;
        
        var requestifyUrl = baseUrl + '/v1/itemMaster/web/item/configuration/create/alert/';

        var object = {
            warehouseId: dataObject.warehouseId,
            textName: dataObject.textName,
            module: dataObject.module,
            name: dataObject.name,
            id: dataObject.id
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

        (consoleLog) ? console.log('ALERT-END') : '';
        (consoleLog) ? console.log(response) : '';

        callback(null, response);
    });
    //
    // ERROR
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ALERT-ERROR') : '';
        (consoleLog) ? console.log(error) : '';

        callback(error);
    });
    //
    // START
    flowController.emit('START');
}
;

module.exports = alertService;


