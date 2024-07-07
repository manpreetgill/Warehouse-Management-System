var express = require('express');
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var router = express.Router();
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var feedbackModels = require('../../../models/mongodb/settings-feedback/collection-feedback.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/settings/web/settingsMaster/feedback/read/feedback/')// after requirement

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                feedbackModels.find({'activeStatus': 1}, function (err, feedbackRow) {

                    flowController.emit('END', feedbackRow);
                });
            });
            flowController.on('END', function (result) {

                res.send(result);
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
router.route('/v1/settings/web/settingsMaster/feedback/create/feedback/')

        .post(function (req, res) {

            var warehouseId = req.body.warehouseId.trim();
            var userId = req.body.userId.trim();
            var description = req.body.description.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                var newfeedback = new feedbackModels();

                newfeedback.warehouseId = warehouseId;
                newfeedback.userId = userId;
                newfeedback.description = description;

                newfeedback.save(function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'Thanks for feedback, its valuable for us!', status: 'success', statusCode: '200'});
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
module.exports = router;
