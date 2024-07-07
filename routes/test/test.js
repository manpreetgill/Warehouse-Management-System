var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var intersection = require('array-intersection');
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var function_commonSharing = require('../../functionSet/function-commonSharing.js');
var fs = require('fs');
var intersection = require('array-intersection');
var arrayUnion = require('array-union');
var nodemailer = require("nodemailer");
var SMTPServer = require('smtp-server').SMTPServer;

var simplesmtp = require("simplesmtp"),
    fs = require("fs");

var smtp = simplesmtp.createServer();
smtp.listen(25);
//var smtp =simplesmtp.createSimpleServer({SMTPBanner:"localhost"}, function(req){
//    req.pipe(process.stdout);
//    req.accept();
//}).listen(400);


console.log(smtp);
smtp.on("startData", function(connection){
    console.log("Message from:", connection.from);
    console.log("Message to:", connection.to);
    connection.saveStream = fs.createWriteStream("/tmp/message.txt");
});

smtp.on("data", function(connection, chunk){
    connection.saveStream.write(chunk);
});

smtp.on("dataReady", function(connection, callback){
    connection.saveStream.end();
    console.log("Incoming message saved to /tmp/message.txt");
    callback(null, "ABC1"); // ABC1 is the queue id to be advertised to the client
    // callback(new Error("Rejected as spam!")); // reported back to the client
});

router.route('/v1/test/')

        .post(function (req, res) {

//            var smtpTransport = nodemailer.createTransport('SMTP', {
//                host: '127.0.0.1',
//                port: 25,
//                auth: {
//                    user: 'username',
//                    pass: 'password'
//                }
//            });
            var smtpTransport = nodemailer.createTransport({
                service: "gmail",
                host: "smtp.gmail.com",
                auth: {
                    user: "testuseravc1@gmail.com",
                    pass: "avancer123"
                }
            });
            var mailOptions = {
                to: "manpreet@bizician.com",
                subject: "manpreetbizician.com",
                text: "ki krde ha bhai jda busy lgda ha!!!!!!!!!!!!!"
            }
            console.log(mailOptions);
            smtpTransport.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    res.end("error");
                } else {
                    console.log("Message sent: " + response.message);
                    res.end("sent");
                }
            });
        });
module.exports = router;
//            for (var i = 0; i < 5; i++) {
//                console.log(i);
//                setTimeout(function () {
//                    console.log(i);
//                });
//            }

//            var digits = [];
//
//            for (var i = 0; i < 10; i++) {
//                if (digits.length < 2) {
//                    if (digits.length == 0)
//                        digits.push(0);
//
//                    if (digits.length == 1)
//                        digits.push(1);
//                } else {
//                    var a = digits.length -1;
//                    var b = digits.length - 2;
//
//                    var c = digits[a] + digits[b];
//                    digits.push(c);
//                }
//            }
//
//            setTimeout(function () {
//                console.log(digits);
//            }, 4000);

//            function doSetTimeout(i) {
//                setTimeout(function () {
//                    alert(i);
//                }, 100);
//            }

//            for (var i = 1; i <= 2; ++i)
//                doSetTimeout(i);

//            //Call and apply
//            var person = {
//                fullName: function () {
//                    return this.firstName + " " + this.lastName;
//                }
//            }
//            var myObject = {
//                firstName: "Mary",
//                lastName: "Doe",
//            }
//            x = person.fullName.call(myObject);