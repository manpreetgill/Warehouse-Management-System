var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path')
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var timezone = momenttimezone().tz("Asia/Kolkata").format(); // timezone in specific timezone
var time = moment(timezone).unix();
var timeInInteger = parseInt(time);
//---------------------------------------------------------------------------------------------------------------------------
var materialHandlingComppnentsModels = require('../../../../models/mongodb/materialHandlingMaster-materialHandlingComponents/collection-materialHandlingComponents.js');
//---------------------------------------------------------------------------------------------------------------------------
//
//
module.exports = router;