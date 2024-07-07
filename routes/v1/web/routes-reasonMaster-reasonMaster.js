var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var reasonMasterModel = require('../../../models/mongodb/reasonMaster-reasonMaster/collection-reasonMaster.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/reasonMaster/web/reason/configuration/read/reasonMaster/:warehouseId/')

        .get(function (req, res) {

            var warehouseId = req.params.warehouseId.trim();// Parameter from body
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var reasonArr = [];
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                reasonMasterModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, reasonMasterRow) {
                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (reasonMasterRow == 0) {

                        flowController.emit('ERROR', {message: "Reason Master tampered/removed from system!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(reasonMasterRow, function (element, callback) {

                            var data = {
                                reasonMasterId: element._id,
                                name: element.name,
                                typeNumber: element.typeNumber
                            };
                            reasonArr.push(data);
                            setImmediate(callback);
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: " Operation Successful.", data: reasonArr, status: 'success', statusCode: '201'});
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
router.route('/v1/reasonMaster/web/reason/configuration/create/reason-master/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var reasonMasterArray = [
                {'name': 'ACCESS TO LOCATION BLOCKED', '_name': 'ACCESS_TO_LOCATION_BLOCKED', 'typeNumber': 2},
                {'name': 'ITEM LOCATION MISMATCH', '_name': 'ITEM_LOCATION_MISMATCH', 'typeNumber': 2},
                {'name': 'REQURIED QUANTITY NOT AVAILABLE', '_name': 'REQURIED_QUANTITY_NOT_AVAILABLE', 'typeNumber': 2},
                {'name': 'NOT ABLE TO SCAN ITEM', '_name': 'NOT_ABLE_TO_SCAN_ITEM', 'typeNumber': 2},
                {'name': 'NOT ABLE TO SCAN PICK LOCATION', '_name': 'NOT_ABLE_TO_SCAN_PICK_LOCATION', 'typeNumber': 2},
                {'name': 'NOT ABLE TO SCAN DROP LOCATION', '_name': 'NOT_ABLE_TO_SCAN_DROP_LOCATION', 'typeNumber': 2},
                {'name': 'SCANNER NOT WORKING', '_name': 'SCANNER_NOT_WORKING', 'typeNumber': 2},
                {'name': 'REQURIED QUANTITY NOT AVAILABLE', '_name': 'REQURIED_QUANTITY_NOT_AVAILABLE', 'typeNumber': 1},
                {'name': 'DROP LOCATION IS NOT AVAILABLE', '_name': 'DROP_LOCATION_IS_NOT_AVAILABLE', 'typeNumber': 1},
                {'name': 'NOT ABLE TO SCAN ITEM', '_name': 'NOT_ABLE_TO_SCAN_ITEM', 'typeNumber': 1},
                {'name': 'NOT ABLE TO SCAN PICK LOCATION', '_name': 'NOT_ABLE_TO_SCAN_PICK_LOCATION', 'typeNumber': 1},
                {'name': 'NOT ABLE TO SCAN DROP LOCATION', '_name': 'NOT_ABLE_TO_SCAN_DROP_LOCATION', 'typeNumber': 1},
                {'name': 'SCANNER NOT WORKING', '_name': 'SCANNER_NOT_WORKING', 'typeNumber': 1},
                {'name': 'REQURIED QUANTITY NOT AVAILABLE', '_name': 'REQURIED_QUANTITY_NOT_AVAILABLE', 'typeNumber': 3},
                {'name': 'DROP LOCATION IS NOT AVAILABLE', '_name': 'DROP_LOCATION_IS_NOT_AVAILABLE', 'typeNumber': 3},
                {'name': 'NOT ABLE TO SCAN ITEM', '_name': 'NOT_ABLE_TO_SCAN_ITEM', 'typeNumber': 3},
                {'name': 'NOT ABLE TO SCAN PUT LOCATION', '_name': 'NOT_ABLE_TO_SCAN_PUT_LOCATION', 'typeNumber': 3},
                {'name': 'NOT ABLE TO SCAN DROP LOCATION', '_name': 'NOT_ABLE_TO_SCAN_DROP_LOCATION', 'typeNumber': 3},
                {'name': 'SCANNER NOT WORKING', '_name': 'SCANNER_NOT_WORKING', 'typeNumber': 3}
            ];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.eachSeries(reasonMasterArray, function (element, callback) {

                    reasonMasterModel.find({'_name': element._name, 'typeName': element.typeName}, function (err, reasonMasterRow) {
                        if (err) {
                            // Serverside error
                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (reasonMasterRow.length != 0) {
                            // Data already present in database || 304 - not modified
                            callback({message: "Already Present! Same Reasonx not allowed.", status: 'error', statusCode: '304'});
                        } else {

                            var newreasonMaster = new reasonMasterModel();

                            newreasonMaster.warehouseId = warehouseId;
                            newreasonMaster.name = element.name;
                            newreasonMaster.typeName = element.typeName;
                            newreasonMaster.typeNumber = element.typeNumber;
                            newreasonMaster.timeCreated = timeInInteger;

                            newreasonMaster.save(function (err) {
                                if (err)
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                else
                                    setImmediate(callback);
                            });
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "Reason master set!", status: 'success', statusCode: '201'});
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
module.exports = router;