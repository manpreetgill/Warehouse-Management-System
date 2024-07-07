var express = require('express');
var router = express.Router();
var events = require('events');
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var fs = require('fs');
var EventEmitter = events.EventEmitter;
var async = require('async');
var Handlebars = require('handlebars');
var itemTemplate = [];
var palletTemplate = [];
var locationTemplate4 = [];
var locationTemplate8 = [];
var locationTemplate10 = [];
var sys = require('sys');
var exec = require('child_process').exec;
//---------------------------------------------------------------------------------------------------------------------------
var itemContents = fs.readFileSync('./views/barcodeItem.hbs', 'utf8');
itemTemplate = Handlebars.compile(itemContents, {noEscape: true});
//---------------------------------------------------------------------------------------------------------------------------
var palletContents = fs.readFileSync('./views/barcodePallet.hbs', 'utf8');
palletTemplate = Handlebars.compile(palletContents, {noEscape: true});
//---------------------------------------------------------------------------------------------------------------------------
//var locationContents = fs.readFileSync('./views/barcodeLocation_0_4.hbs', 'latin1');
//locationTemplate4 = Handlebars.compile(locationContents, {noEscape: true});
//var locationContents = fs.readFileSync('./views/barcodeLocation_5_6.hbs', 'latin1');
//locationTemplate6 = Handlebars.compile(locationContents, {noEscape: true});
//var locationContents = fs.readFileSync('./views/barcodeLocation_7_8.hbs', 'latin1');
//locationTemplate8 = Handlebars.compile(locationContents, {noEscape: true});
//var locationContents = fs.readFileSync('./views/barcodeLocation_9_10.hbs', 'latin1');
//locationTemplate10 = Handlebars.compile(locationContents, {noEscape: true});
//---------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Generate barcode
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/printMaster/web/barcode/configuration/create/barcodeLabel/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            console.log(req.body);
            var labelType = req.body.labelType.trim().toUpperCase();

            var flowController = new EventEmitter();
            flowController.on('START', function () {

                switch (labelType) {

                    case 'LOCATION_LABEL':
                        var locationAddress = req.body.locationAddress;

                        flowController.emit('barcodeTemplateLocation', locationAddress);
                        break;

                    case 'PALLET_LABEL':
                        var palletNumber = req.body.palletNumber;

                        flowController.emit('pallet', palletNumber);
                        break;

                    case 'ITEM_LABEL':
                        var itemCode = req.body.itemCode;

                        flowController.emit('item', itemCode);
                        break;

                    default:
                        flowController.emit('ERROR');
                }

            });

            flowController.on('location', function (location) {

            });

            //Item-Part 
            flowController.on('item', function (itemCode) {

                var itemMasterArray = [];

                async.eachSeries(itemCode, function (element, callback) {

                    itemMasterModel.findOne({'itemCode': element, 'activeStatus': 1}, function (err, itemMasterRow) {

                        if (err) { // Serverside error

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                        } else if (itemMasterRow == null) {

                            callback({message: "Item's master data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});

                        } else {

                            var data = {
                                itemDescription: itemMasterRow.itemDescription,
                                mfgDate: itemMasterRow.manufacturingDate,
                                compoundCode: element,
                                boxSrNo: itemMasterRow.itemSerialNumber,
                                color: 'YELLOW',
                                lotNumber: '1701M00073',
                                length: itemMasterRow.itemSystemSpecification.length,
                                pieces: '1000',
                                NWT: '7.65 Kgs',
                                GWT: '6.53 Kgs',
                                WTH: '25MM',
                                THK: '0.50MM',
                                barcode: element
                            };
                            itemMasterArray.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('barcodeTemplateItem', itemMasterArray);
                    }

                });
            });

            // flowController.on('lotNumber', function(itemMasterArray){

            //    var itemStoreArray = [];

            //    async.eachSeries(itemMasterArray,function(element,callback){

            //       itemStoreModel.findOne({'itemSerialNumber': element.boxSrNo,'activeStatus': 1}, function (err, itemStoreRow) {

            //                 if (err) {// Serverside error

            //                  callback({message: "INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED", status: 'error', statusCode: '500'});

            //               } else if (itemStoreRow == null) {

            //                  callback({message: "Item's Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});

            //               } else {

            //                var data = {

            //                   itemDescription:element.itemDescription,
            //                   mfgDate:element.mfgDate,
            //                   compoundCode:element.compoundCode,
            //                   boxSrNo:element.boxSrNo,
            //                   color:'YELLOW',
            //                   lotNumber:itemStoreRow.lotAddress,  //lotNUmber
            //                   length:element.length,
            //                   pieces:'1000',
            //                   NWT:'7.65 Kgs',
            //                   GWT:'6.53 Kgs',
            //                   WTH:'25MM',
            //                   THK:'0.50MM',
            //                   barcode:element.barcode
            //                }
            //                itemStoreArray.push(data);
            //                console.log(itemStoreArray); 
            //                callback();

            //             }
            //          });
            //    }, function (err) {

            //      if (err) {

            //       flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
            //    } else {

            //       flowController.emit('barcodeTemplateItem',itemStoreArray);
            //    }

            // });
            // });

            flowController.on('barcodeTemplateItem', function (value) {

                var data = '';

                async.eachSeries(value, function (element, callback) {
                    var object = {
                        itemDescription: element.itemDescription,
                        compoundCode: element.compoundCode,
                        color: element.color,
                        lotNumber: element.lotNumber,
                        boxSrNo: element.boxSrNo,
                        mfgDate: element.mfgDate,
                        length: element.length,
                        pieces: element.pieces,
                        NWT: element.NWT,
                        GWT: element.GWT,
                        WTH: element.WTH,
                        THK: element.THK,
                        barcode: element.barcode
                    };

                    data = data + itemTemplate(object);
                    setImmediate(callback);
                }, function (err) {
                    if (err) {
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var path = '/home/avancer/app/public/files/Barcode/' + timeInInteger + '.txt';


                        fs.appendFile(path, data, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('append file');
                                exec("lpr -P AVANCER_BARCODE -o raw " + path, putsdata);
                                res.send(data);
                            }
                        });
                    }
                });
            });
            //pallet-Part
            flowController.on('pallet', function (palletNumber) {

                var palletArray = [];

                async.eachSeries(palletNumber, function (element, callback) {

                    itemStoreModel.find({'palletNumber': element, 'activeStatus': 1}, function (err, itemStoreRow) {

                        if (err) { // Serverside error

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                        } else if (itemStoreRow.length == 0) {

                            callback({message: "Item's master data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});

                        } else {

                            var data = {

                                totalBoxes: itemStoreRow.length,
                                barcode: element
                            };
                            palletArray.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('barcodeTemplatePallet', palletArray);
                    }
                });
            });
            flowController.on('barcodeTemplatePallet', function (value) {

                var array = [];
                var data = '';

                async.eachSeries(value, function (element, callback) {
                    var object = {

                        totalBoxes: element.totalBoxes,
                        barcode: element.barcode
                    };

                    data = data + palletTemplate(object);
                    setImmediate(callback);
                }, function (err) {
                    if (err) {
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        var path = '/home/avancer/app/public/files/Barcode/' + timeInInteger + '.txt';
                        fs.appendFile(path, data, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('append file');
                                exec("lpr -P AVANCER_BARCODE -o raw " + path, putsdata);
                                res.send(data);
                            }
                        });
                    }
                });
            });
            //location-Part
            flowController.on('barcodeTemplateLocation', function (value) {

                var array = [];
                var data = '';

                async.eachSeries(value, function (element, callback) {

                    var object = {

                        barcode: element
                    };

                    var elementCount = element.length;
                    if (elementCount <= 4) {
                        data = data + locationTemplate4(object);
                    }
                    if (elementCount >= 5 && elementCount <= 6) {
                        data = data + locationTemplate6(object);
                    }
                    if (elementCount >= 7 && elementCount <= 8) {
                        data = data + locationTemplate8(object);
                    }
                    if (elementCount >= 9 && elementCount <= 10) {
                        data = data + locationTemplate10(object);
                    }



                    setImmediate(callback);

                }, function (err) {
                    if (err) {
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        fs.appendFile('/home/avancer/app/public/files/Barcode' + timeInInteger + '.txt', data, 'latin1', function (err) {
                            if (err) {
                                //append failed
                                console.log(err);
                                //flowController.emit('ERROR', {message: 'CAN\'T INSERT INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!100', status: 'error', statusCode: '500'});
                            } else {
                                console.log('append file');
                                exec("lpr -P AVANCER_BARCODE -o raw " + '/home/avancer/app/public/files/Barcode' + timeInInteger + '.txt', putsdata);
                                res.send(data);
                            }
                        });

                    }
                });
            });
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.emit('START');
        });
//
//

function putsdata(error, stdout, stderr) {
    sys.puts(stdout);
}
module.exports = router;
