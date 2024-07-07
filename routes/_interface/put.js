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
//--------------------------------------------------------------------------------------------------------------------------------------
// WATCH LOCAL COMPUTER SIDE PUT FOLDER
//------------------------------------------------------------------------------------------------------------------------------------
var putInFolder = '/media/sf_avancer/put/';
// Watch local computer side for put file
var watcher = chokidar.watch(putInFolder + 'in/', {
    usePolling: true,
    interval: 100,
    binaryInterval: 300,
    persistent: true});

var log = console.log.bind(console);

watcher.on('add', path => {

    var fileName = path.split('/').pop();

    console.log('PUT : File ' + fileName + ' picked.');

    var jsonArray = [];

    console.log(fileName);

    csv().fromFile(putInFolder + 'in/' + fileName)

            .on('json', (jsonObj) => {

                jsonArray.push(jsonObj);

            })
            .on('done', (error) => {

                var sourceLocation = putInFolder + 'in/' + fileName;
                var errorLocation = putInFolder + '_error/' + fileName;
                var processingLocation = putInFolder + '_processing/' + fileName;

                setTimeout(function () {

                    mv(sourceLocation, processingLocation, function () {

                        console.log('PUT : File ' + fileName + ' moved to _processing');

                        if (jsonArray.length > 0) {

                            var res = asyncRequest(
                                    'POST',
                                    baseUrl + '/v1/interface/web/watch/directory/in/get-file/put-file/',
                                    {json: {warehouseId: warehouseId, baseUrl: baseUrl, fileName: fileName, desktopFile: jsonArray}});

                            var bodyData = JSON.parse(res.getBody('utf8'));

                            if (bodyData.status == 'success') {
                                console.log(bodyData.message);
                                fs.unlinkSync(processingLocation);
                                console.log('PUT : File ' + fileName + ' removed from _processing directory.');
                            }

                            if (bodyData.status == 'error') {
                                mv(processingLocation, errorLocation, function () {
                                    console.log('PUT : File ' + fileName + ' moved to _error directory.');
                                });
                            }

//                            data = {warehouseId: warehouseId, baseUrl: baseUrl, fileName: fileName, desktopFile: jsonArray};
//
//                            request.post({
//                                url: baseUrl + '/v1/interface/web/watch/directory/in/get-file/put-file/',
//                                form: data
//                            }, function (err, httpResponse, body) {
//
//                                if (err) {
//                                    console.log(err)
//                                }
//
//                                var bodyData = JSON.parse(body);//
//
//                                if (bodyData.status == 'success') {
//                                    console.log(bodyData.message);
//                                    fs.unlinkSync(processingLocation);
//                                    console.log('PUT : File ' + fileName + ' removed from _processing');
//                                }
//
//                                if (bodyData.status == 'error') {
//                                    mv(processingLocation, errorLocation, function () {
//                                        console.log('PUT : File ' + fileName + ' moved to _error');
//                                    });
//                                }
//                            });
                        } else {
                            console.log('PUT FILE CORRUPTED');
                            console.log('PUT JSON ARRAY LENGTH : ' + jsonArray.length);
                            console.log(jsonArray);
                        }
                    });
                }, 2000);
            });
});


//------------------------------------------------------------------------------------------------------------------------------------
// WATCH SERVER SIDE PUT FOLDER
//------------------------------------------------------------------------------------------------------------------------------------

// API CALLING INTERVAL
setInterval(request_checkPutOutServerSide, 7000);


// Watch server side for put out file
function request_checkPutOutServerSide() {

    var url = baseUrl + '/v1/interface/web/watch/directory/out/send-update/put-file/';
    var res = asyncRequest('GET', url);

    var bodyData = JSON.parse(res.getBody('utf8'));

    if (bodyData.status) {
        console.log('\r\n');
        console.log('++++++++++++++++++++++++++ WATCH PUT OUT +++++++++++++++++++++++++++++++++')
        console.log('Watch Status   : ' + bodyData.status);
        console.log('Message        : ' + bodyData.message);
    }

    if (bodyData.statusCode == '200') {

        file = bodyData.data[0];
        request_downloadPutFileFromServer(file);
    }
}

// Download file from server and store to put folder on local computer
function request_downloadPutFileFromServer(file) {

    var json = {json: {warehouseId: warehouseId, fileName: file}};
    var url = baseUrl + '/v1/interface/web/watch/directory/out/send-file/put-file/';

    var res = asyncRequest('POST', url, json);

    var bodyData = JSON.parse(res.getBody('utf8'));

    if (bodyData.statusCode == '200') {

        desktopFile = bodyData.data;

        var fields = ['Batch', 'BoxNo', 'PalletNo', 'Material', 'Rack', 'CreatedOn', 'PalletSize', 'PalletType'];          // Convert JSON data to csv file at server side
        // File converted to csv
        var csvFile = json2csv({data: desktopFile, fields: fields});

        var directory = putInFolder + 'out/'; //Put02_ DDMMYYHHMMSS_###

        filePath = directory + file;

        fs.readdir(directory, function (err, files) {

            if (err) {

                console.log('\r\n');
                console.log('Local Status   : Error occurred while copying file to local server');
                console.log('Message        : File copy failed');
                console.log('\r\n');

            } else {

                if (fs.existsSync(filePath)) {
                    console.log('\r\n');
                    console.log('Local Status   : Download Successful');
                    console.log('Message        : File already copied!');

                    setTimeout(function () {

                        request_deletePutFileAfterDownloadFromServer(file);
                    }, 2000);

                } else {

                    fs.writeFile(filePath, csvFile, function (err) {

                        if (err) {

                            console.log('\r\n');
                            console.log('Local Status   : Error occurred while copying file to local server');
                            console.log('Message        : File copy failed');

                        } else {
                            console.log('\r\n');
                            console.log('Download Status: Operation Successful!');
                            console.log('Message        : New put file arrived to your local machine.');

                            setTimeout(function () {

                                request_deletePutFileAfterDownloadFromServer(file);
                            }, 2000);
                        }
                    });
                }
            }
        });
    }
}

// Delete file from server out folder
function request_deletePutFileAfterDownloadFromServer(file) {

    var json = {json: {warehouseId: warehouseId, fileName: file}};
    var url = baseUrl + '/v1/interface/web/watch/directory/out/delete-file/put-file/';

    var res = asyncRequest('PUT', url, json);

    var bodyData = JSON.parse(res.getBody('utf8'));

    if (bodyData.status) {
        console.log('\r\n');
        console.log('++++++++++++++++++++++++++ ACKNOWLEDGEMENT PUT FILE +++++++++++++++++++++++++++++++++')
        console.log('Watch Status   : ' + bodyData.status);
        console.log('Message        : ' + bodyData.message);
    }
}
