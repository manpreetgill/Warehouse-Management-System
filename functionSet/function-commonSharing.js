var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp


var function_commonSharing = {

    getTime: function (callback) {


        var time = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());


        callback(null, timeInInteger);
    }
};

module.exports = function_commonSharing;