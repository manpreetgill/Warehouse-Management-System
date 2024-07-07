var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;

var function_pickListService = require('../service-functions/functions-pickListService');

var pickListMobileService = {};

pickListMobileService.updateStatusToInProgress = function (dataObject, callback) {

    var consoleVar = 1;

    (consoleVar) ? console.log(dataObject) : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var pickListId = dataObject.pickListId.trim();
    var deviceId = dataObject.deviceId.trim();
    var lot = dataObject.lot;// Int value
    var startedBy = dataObject.startedBy.trim();

    var flowController = new EventEmitter();

    flowController.on('START', function () {

        (consoleVar) ? console.log('START') : '';

        function_pickListService.getPicklistData(pickListId, function (err, pickListRecord) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('2', pickListRecord);
            }
        });
    });


    flowController.on('2', function (pickListRecord) {

        (consoleVar) ? console.log('2') : '';

        function_pickListService.updatePicklistStatusToInProgress(pickListId, pickListRecord, timeInInteger, startedBy, function (err, response) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('3');
            }
        });
    });


    flowController.on('3', function () {

        (consoleVar) ? console.log('3') : '';

        function_pickListService.updateResourceStartTimeToPicklist(pickListId, deviceId, lot, timeInInteger, startedBy, function (err, pickListRecord) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
            }
        });
    });


    flowController.on('END', function (result) {

        (consoleVar) ? console.log('END') : '';

        callback(null, result);
    });


    flowController.on('ERROR', function (error) {

        (consoleVar) ? console.log('ERROR') : '';

        callback(error);
    });


    flowController.emit('START');
};

module.exports = pickListMobileService;