/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var fs = require('fs');
//---------------------------------------------------------------------------------------------------------------------------
var directories = ["./logs/dailyLog/", "./logs/dailyLog/errorLogs"];
directories.forEach(function (object) {
    (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
});
var pathErrorLog = './logs/dailyLog/errorLogs/log.txt';

var errorLogService = {};
//************************************************************************************
errorLogService.createErrorLog = function (dataObject, callback) {
    var consoleLog = 1;

    (consoleLog) ? console.log(dataObject) : '';
    
    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    fs.appendFile(pathErrorLog, '\n' + dataObject.MODULE + ',' + dataObject.ERRORMESSAGE + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
        if (err) {
            // append failed
            console.log("log"+err);
        } else {

            callback(null);

        }
    });
};
module.exports = errorLogService;