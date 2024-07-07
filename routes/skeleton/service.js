var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;

var pickListService = {};

pickListService.updateStatusToInActivate = function (dataObject, callback) {

    var consoleVar = 1;

    var date = moment(new Date()).format('DD/MM/YY');

    var pickListId = dataObject.pickListId.trim();

    var flowController = new EventEmitter();

    flowController.on('START', function () {

        (consoleVar) ? console.log('START') : '';


    });

    flowController.on('1', function () {

        (consoleVar) ? console.log('1') : '';


    });

    flowController.on('2', function (lastSequence) {

        (consoleVar) ? console.log('2') : '';


    });

    flowController.on('3', function (lastSequence) {


    });

    flowController.on('4', function (newSequence) {

        (consoleVar) ? console.log('4') : '';


    });

    flowController.on('5', function (newSequence) {

        (consoleVar) ? console.log('5') : '';


    });

    flowController.on('END', function (result) {

        (consoleVar) ? console.log('END') : '';

        callback(result);
    });

    flowController.on('ERROR', function (error) {

        (consoleVar) ? console.log('ERROR') : '';

        callback(error);
    });

    flowController.emit('START');
};

//router.route('<URL>')
//
//        .put(function (req, res, next) {// Middleware 1
//
//            //Access rights logic here
//
//            if (err) {
//                res.json(err);
//            } else {
//                next();
//            }
//
//        }, function (req, res, next) {//  Middleware 2
//
//            // Parametric validation here
//
//            if (err) {
//                res.json(err);
//            } else {
//                next();
//            }
//
//        }, function (req, res, next) {//  Middleware 3
//
//            // Some other stuff
//
//        }, function (req, res) {//  Operational logic
//
//
//        });
//
//
//var accessRightsMiddleware = function (req, res, next) {
//// Do processing here
//    if (err) {
//        res.json(err);
//    } else {
//        next();
//    }
//};

module.exports = pickListService;