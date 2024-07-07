const express = require('express');
const router = express.Router();
const morgan = require('morgan');// Logger
const request = require('request');
const bodyParser = require('body-parser');// Parse the POST request body
const csv = require('csvtojson');
const json2csv = require('json2csv');
const path = require('path');
const fs = require("fs");
const chokidar = require('chokidar');
const notifier = require('node-notifier');
const mv = require('mv');
const asyncRequest = require('sync-request');
//------------------------------------------------------------------------------------------------------------------------------------
// WATCH LOCAL COMPUTER SIDE REPROCESS FOLDER
//------------------------------------------------------------------------------------------------------------------------------------
var reprocessInFolder = '/media/sf_avancer/reprocess/';
//Local machine : F://avancer/reprocess/in/
// WATCHER LOOKOUT 
//var watcher = chokidar.watch('F://avancer/reprocess/in/', {persistent: true});

var watcher = chokidar.watch(reprocessInFolder + 'in/', {
    usePolling: true,
    interval: 100,
    binaryInterval: 300,
    persistent: true});

var log = console.log.bind(console);

// Watch local computer side for put file
watcher.on('add', path => {

    var fileName = path.split('/').pop();

    console.log('REPROCESS : File ' + fileName + ' picked.');

    var jsonArray = [];

    console.log(fileName);

    csv().fromFile(reprocessInFolder + 'in/' + fileName)

            .on('json', (jsonObj) => {

                jsonArray.push(jsonObj);

            })
            .on('done', (error) => {

                var sourceLocation = reprocessInFolder + 'in/' + fileName;
                var errorLocation = reprocessInFolder + '_error/' + fileName;
                var processingLocation = reprocessInFolder + '_processing/' + fileName;

                setTimeout(function () {

                    mv(sourceLocation, processingLocation, function () {

                        console.log('REPROCESS : File ' + fileName + ' moved to _processing');
                        if (jsonArray.length > 0) {

                            var res = asyncRequest(
                                    'POST',
                                    baseUrl + '/v1/interface/web/watch/directory/in/get-file/reprocess-file/',
                                    {json: {warehouseId: warehouseId, baseUrl: baseUrl, fileName: fileName, desktopFile: jsonArray}});

                            var bodyData = JSON.parse(res.getBody('utf8'));

                            if (bodyData.status == 'success') {
                                console.log(bodyData.message);
                                fs.unlinkSync(processingLocation);
                                console.log('REPROCESS : File ' + fileName + ' removed from _processing');
                            }

                            if (bodyData.status == 'error') {
                                mv(processingLocation, errorLocation, function () {
                                    console.log('REPROCESS : File ' + fileName + ' moved to _error');
                                });
                            }
                        } else {
                            console.log('REPROCESS FILE CORRUPTED');
                            console.log('REPROCESS JSON ARRAY LENGTH : ' + jsonArray.length);
                            console.log(jsonArray);
                        }
                    });
                }, 2000);
            });
});