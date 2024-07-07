var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var jwt = require('jsonwebtoken');
var randomstring = require("randomstring");
//---------------------------------------------------------------------------------------------------------------------------
var authTokenModel = require('../models/mongodb/userMaster-authToken/collection-authToken.js');
//---------------------------------------------------------------------------------------------------------------------------
var webAuthenticationTokenService = {};
//
//---------------------------------------------------------------------------------------------------------------------------
webAuthenticationTokenService.loginToken = function (dataObject, callback) {

    var consoleLog = 1;

    (consoleLog) ? console.log(dataObject) : '';

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var randomstringToken = randomstring.generate({
        length: 30,
        charset: 'alphanumeric'
    });
    var loginToken = jwt.sign({userId: dataObject._id, username: dataObject.username}, randomstringToken);
    var data = {
        token: loginToken,
        randomstringToken: randomstringToken

    };
    callback(null, data);
};
//
//---------------------------------------------------------------------------------------------------------------------------
webAuthenticationTokenService.loginVerify = function (dataObject, callback) {

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    authTokenModel.findOne({authToken: dataObject.authToken, userId: dataObject.userId, activeStatus: 1}, function (err, authRow) {
        if (err) {

            callback(err);
        } else if (authRow == null) {

            callback({message: "Session expired! Try login again.", status: 'error', statusCode: '404'});
        } else {

            authRow.timeModified = new Date();

            authRow.save(function (err) {

                if (err) {

                    callback(err);
                } else {

                    jwt.verify(dataObject.authToken, authRow.privateKey, function (err, decoded) {
                        if (err) {

                            callback(err);
                        } else {

                            if (dataObject.userId == decoded.userId) {

                                callback(null, "success");
                            } else {

                                callback({message: "Authentication failed! Try login again.", status: 'error', statusCode: '404'});
                            }
                        }
                    });
                }
            });
        }
    });
};
//
module.exports = webAuthenticationTokenService;