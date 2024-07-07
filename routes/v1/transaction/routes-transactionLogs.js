var express = require('express');
var router = express.Router();

var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var timezone = momenttimezone().tz("Asia/Kolkata").format(); // timezone in specific timezone
var time = moment(timezone).unix();
var timeInInteger = parseInt(time);

var transactionlLogsModels=require('../../models/transactionlLogs/collection-transactionlLogs.js');

module.exports = router;