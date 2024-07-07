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
const asyncRequest = require('sync-request');
//--------------------------------------------------------------------------------------------------------------------------------------
// WATCH SERVER SIDE PICK FOLDER
//------------------------------------------------------------------------------------------------------------------------------------
// API CALLING INTERVAL
var pickFolderPath = '/media/sf_avancer/pick/out/';
setInterval(request_checkPickOutServerSide, 7000);

// Watch server side for pick out file
function request_checkPickOutServerSide() {

    var url = baseUrl + '/v1/interface/web/watch/directory/out/send-update/pick-file/';
    var res = asyncRequest('GET', url);

    var bodyData = JSON.parse(res.getBody('utf8'));

    if (bodyData.status) {
        console.log('\r\n');
        console.log('++++++++++++++++++++++++++ WATCH PICK OUT +++++++++++++++++++++++++++++++++')
        console.log('Watch Status   : ' + bodyData.status);
        console.log('Message        : ' + bodyData.message);
    }

    if (bodyData.statusCode == '200') {

        file = bodyData.data[0];
        request_downloadPickFileFromServer(file);
    }
}

// Download file from server and store to put folder on local computer
function request_downloadPickFileFromServer(file) {

    var json = {json: {warehouseId: warehouseId, fileName: file}};
    var url = baseUrl + '/v1/interface/web/watch/directory/out/send-file/pick-file/';

    var res = asyncRequest('POST', url, json);

    var bodyData = JSON.parse(res.getBody('utf8'));

    if (bodyData.statusCode == '200') {

        desktopFile = bodyData.data;

        var fields = ['Batch', 'BoxNo', 'PalletNo', 'Rack'];          // Convert JSON data to csv file at server side
        // File converted to csv
        var csvFile = json2csv({data: desktopFile, fields: fields});

        filePath = pickFolderPath + file;

        fs.readdir(pickFolderPath, function (err, files) {

            if (err) {
                console.log('\r\n');
                console.log('Local Status   : Error occurred while copying file to local server');
                console.log('Message        : File copy failed');
            } else {

                if (fs.existsSync(filePath)) {
                    console.log('\r\n');
                    console.log('Local Status   : Download Successful');
                    console.log('Message        : File already copied!');

                    request_deletePickFileAfterDownloadFromServer(file);
                } else {

                    fs.writeFile(filePath, csvFile, function (err) {

                        if (err) {
                            console.log('\r\n');
                            console.log('Local Status   : Error occurred while copying file to local server');
                            console.log('Message        : File copy failed');
                        } else {

                            console.log('\r\n');
                            console.log('Download Status: Operation Successful!');
                            console.log('Message        : New pick file arrived to your local machine.');

                            setTimeout(function () {

                                request_deletePickFileAfterDownloadFromServer(file);
                            }, 2000);
                        }
                    });
                }
            }
        });
    }
}

// Delete file from server out folder
function request_deletePickFileAfterDownloadFromServer(file) {

    var json = {json: {warehouseId: warehouseId, fileName: file}};

    var url = baseUrl + '/v1/interface/web/watch/directory/out/delete-file/pick-file/';
    var res = asyncRequest('PUT', url, json);

    var bodyData = JSON.parse(res.getBody('utf8'));

    if (bodyData.status) {
        console.log('\r\n');
        console.log('++++++++++++++++++++++++++ ACKNOWLEDGEMENT PICK FILE +++++++++++++++++++++++++++++++++')
        console.log('Watch Status   : ' + bodyData.status);
        console.log('Message        : ' + bodyData.message);
    }
}
