var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var json2csv = require('json2csv');
var csv = require('csvtojson');
var fs = require('fs');
var Promises = require('promise');
var requestify = require('requestify');
var MagicIncrement = require('magic-increment');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var transactionalLogService = require('../../../service-factory/transactionalLogService');
var pathSubPutList = './logs/dailyLog/putSubListLogs/log.txt';
var pathPutList = './logs/dailyLog/putListLogs/log.txt';
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------
// 1. IN FOLDER : Put Process 
// Upload put file to server
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/in/get-file/put-file/')

        .post(function (req, res) {

            var consoleLog = 1;

            //(consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            // Base URL 
            var baseUrl = req.body.baseUrl.trim();//'http://192.168.0.116:2000/avancer';
            // Warehouse Id for data separation
            var warehouseId = req.body.warehouseId.trim();
            // Name of the file (Keep same file name while adding to reprocess folder)
            var fileName = req.body.fileName.trim();

            var split = fileName.split('.');

            var onlyFileName = split[0] + '_' + timeInInteger;
            // Data in JSON object
            var desktopFile = req.body.desktopFile;

            var directories = ["./public/files/interface/", "./public/files/interface/put/", "./public/files/interface/put/in/", "./public/files/interface/_errors/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });
            // File Headers predefined
            var fields = ['Batch', 'BoxNo', 'PalletNo', 'Material', 'Rack', 'CreatedOn', 'PalletSize', 'PalletType', 'NetWeight', 'Pieces', 'GrossWeight', 'NetWeightinLBS', 'GrossWeightInLbs', 'TareWeightinLBs'];          // Convert JSON data to csv file at server side
            // File converted to csv
            var csvFile = json2csv({data: desktopFile, fields: fields});

            var directory = './public/files/interface/put/in/'; //Put02_ DDMMYYHHMMSS_###

            filePath = './public/files/interface/put/in/' + fileName;

            var validationErrors = [];

            var flowController = new EventEmitter();

            // Allow access to request if access lock is not set
            flowController.on('START', function () {

                flowController.emit('START2');
            });

            // Create picklist
            flowController.on('START2', function () {

                (consoleLog) ? console.log('START2') : '';

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read file ' + fileName + '! try again later', status: 'error', statusCode: '404'});
                    } else {

                        fs.writeFile(filePath, csvFile, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'Error occurred while copying file ' + fileName + ' to server: ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('0');
                            }
                        });
                    }
                });
            });

            // 
            flowController.on('0', function () {

                (consoleLog) ? console.log('0') : '';

                var jsonArray = [];

                csv().fromFile(filePath)

                        .on('json', (jsonObj) => {

                            jsonArray.push(jsonObj);// Update json object with additional values
                        })
                        .on('done', (error) => {

                            if (error) {

                                flowController.emit('ERROR', {message: 'Error occurred while getting the JSON Data: ' + error, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', jsonArray);
                            }
                        });
            });

            // 
            flowController.on('1', function (jsonArray) {

                (consoleLog) ? console.log('1') : '';

                var count = 0;

                var itemMasterData = '';

                async.eachSeries(jsonArray, function (element, callback) {

                    count++;

                    if (element.Batch == null) {

                        validationErrors.push({message: 'Batch number is missing! Fill all the data and try again. See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else if (element.BoxNo == null) {

                        validationErrors.push({message: 'Box No is missing! Fill all the data and try again. See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else if (element.PalletNo == null) {

                        validationErrors.push({message: 'Pallet No is missing! Fill all the data and try again. See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else if (element.Material == null) {

                        validationErrors.push({message: 'Material is missing! Fill all the data and try again. See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else if (element.PalletSize == null || element.PalletSize == "") {

                        validationErrors.push({message: 'Pallet Size is missing! Fill all the data and try again. See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else if (element.PalletType == null || element.PalletType == "") {

                        validationErrors.push({message: 'Pallet Type is missing! Fill all the data and try again. See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else {

                        itemMasterModel.findOne({'itemCode': element.Material, 'activeStatus': 1}, function (err, itemMasterRow) {

                            if (err) {

                                validationErrors.push({message: 'Error while getting item master details. See line no. ' + count + ' in Excel file.'});
                                setImmediate(callback);
                            } else if (itemMasterRow == null) {

                                validationErrors.push({message: 'Item master for Material not available. See line no. ' + count + ' in Excel file.'});
                                setImmediate(callback);
                            } else {

                                var in_Array = 'holdingType' in itemMasterRow;

                                if (!in_Array) {

                                    validationErrors.push({message: 'Item\'s holding type details not defined! Add details in master configuration first. See line no. ' + count + ' in Excel file.'});
                                    setImmediate(callback);
                                } else {

                                    itemStoreModel.findOne({'palletNumber': element.PalletNo, 'activeStatus': 1}, function (err, itemStoreRow) {

                                        if (err) {

                                            validationErrors.push({message: 'Error while getting item store details. See line no. ' + count + ' in Excel file.'});
                                            setImmediate(callback);
                                        } else if (itemStoreRow != null) {

                                            validationErrors.push({message: 'Pallet with Pallet No: ' + element.PalletNo + ' already present in warehouse! Same pallet duplication not allowed. See line no. ' + count + ' in Excel file.'});
                                            setImmediate(callback);
                                        } else {

                                            itemMasterData = itemMasterRow;
                                            setImmediate(callback);
                                        }
                                    });
                                }
                            }
                        });
                    }
                }, function () {
                    if (validationErrors.length != 0) {

                        require("fs").unlink(filePath, function () {

                            flowController.emit('MULTI-ERROR', {message: 'Following errors occurred while processing file: ' + fileName, validationErrors: validationErrors, status: 'error', statusCode: '304'});
                        });
                    } else {

                        flowController.emit('2', jsonArray, itemMasterData);
                    }
                });
            });

            // Create picklist
            flowController.on('2', function (jsonArray, itemMasterRow) {

                (consoleLog) ? console.log('2') : '';

                var newPutList = new putListModel();

                newPutList.warehouseId = warehouseId;
                newPutList.timeCreated = timeInInteger;
                newPutList.createdBy = 'INTERFACE';
                newPutList.referenceFile = fileName;
                newPutList.mode = 'INTERFACE';

                newPutList.save(function (err, insertedRecordDetails) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', jsonArray, String(insertedRecordDetails._id), itemMasterRow);
                    }
                });
            });

            // Update interface file details to putlist
            flowController.on('3', function (jsonArray, putlistData, itemMasterRow) {

                (consoleLog) ? console.log('3') : '';

                flowController.emit('4', jsonArray, putlistData, itemMasterRow);
            });

            // Generate pick-sublist under this list
            flowController.on('4', function (jsonArray, putlistData, itemMasterRow) {

                (consoleLog) ? console.log('4') : '';

                var count = 0;
                var dateNew = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + dateNew);

                itemStoreArray = [];
                lotAddressArray = [];

                async.eachSeries(jsonArray, function (element, callback) {

                    count++;

                    var Batch = element.Batch;
                    var BoxNo = element.BoxNo;
                    var PalletNo = element.PalletNo;
                    var Material = element.Material;
                    var Rack = element.Rack;
                    var CreatedOn = element.CreatedOn;
                    var PalletSize = element.PalletSize;
                    var PalletType = element.PalletType;
                    var tareWeightInLbs = parseFloat((element.TareWeightinLBs && element.TareWeightinLBs != 0) ? element.TareWeightinLBs : 0);
                    var grossWeightInLbs = parseFloat((element.GrossWeightInLbs && element.GrossWeightInLbs != 0) ? element.GrossWeightInLbs : 0);
                    var grossWeight = parseFloat((element.GrossWeight && element.GrossWeight != 0) ? element.GrossWeight : 0);
                    var netWeight = parseFloat((element.NetWeight && element.NetWeight != 0) ? element.NetWeight : 0);
                    var pieces = parseFloat((element.Pieces && element.Pieces != 0) ? element.Pieces : 0);
                    var netWeightinLbs = parseFloat((element.NetWeightinLBS && element.NetWeightinLBS != 0) ? element.NetWeightinLBS : 0);

                    var randomFieldObject = {};
                    randomFieldObject.batch = Batch;
                    randomFieldObject.boxNo = BoxNo;
                    randomFieldObject.palletSize = PalletSize;
                    randomFieldObject.palletType = PalletType;
                    randomFieldObject.tareWeightInLbs = tareWeightInLbs;
                    randomFieldObject.grossWeightInLbs = grossWeightInLbs;
                    randomFieldObject.grossWeight = grossWeight;
                    randomFieldObject.netWeight = netWeight;
                    randomFieldObject.pieces = pieces;
                    randomFieldObject.netWeightinLbs = netWeightinLbs;

                    var randomFields = [randomFieldObject];

                    itemMasterModel.findOne({'itemCode': element.Material, 'activeStatus': 1}, function (err, itemMasterRow) {
                        if (err) {

                            validationErrors.push({message: 'INTERNAL SERVER ERROR ' + err});
                            setImmediate(callback);
                        } else if (itemMasterRow == null) {

                            validationErrors.push({message: 'Item master of item ' + element.Material + ' not available! See line no. ' + count + ' from excel file.'});
                            setImmediate(callback);
                        } else {
                            itemStoreModel.findOne({'lotAddress': {$regex: rgx}}).sort({'lotAddress': -1}).exec(function (err, itemStoreRow) {

                                if (err) {

                                    validationErrors.push({message: 'INTERNAL SERVER ERROR ' + err});
                                    setImmediate(callback);
                                } else {

                                    newLotAddress = (itemStoreRow == null) ? dateNew + 'AA00000' : MagicIncrement.inc(itemStoreRow.lotAddress.slice(0, -2)) + '00';

                                    lotAddressArray.push(newLotAddress);

                                    var newItemStore = new itemStoreModel();

                                    newItemStore.warehouseId = warehouseId;
                                    newItemStore.itemMasterId = itemMasterRow._id;
                                    newItemStore.itemSerialNumber = BoxNo;
                                    newItemStore.palletNumber = PalletNo;
                                    newItemStore.lotAddress = newLotAddress;
                                    newItemStore.manufacturingDate = CreatedOn;
                                    newItemStore.overflowAutoAssign = itemMasterRow.overflowAutoAssign;
                                    newItemStore.exclusiveStorage = itemMasterRow.exclusiveStorage;
                                    newItemStore.randomFields = randomFields;
                                    newItemStore.currentActivityStatus = 'PUT - Scheduled(Interface)';
                                    newItemStore.createdBy = 'AVANCER';
                                    newItemStore.date = moment(new Date()).format('DD/MM/YY');
                                    newItemStore.timeCreated = timeInInteger;

                                    newItemStore.save(function (err, returnData) {
                                        if (err) {

                                            validationErrors.push({message: 'ERROR OCCURRED WHILE ADDING INVENTORY ' + err});
                                            setImmediate(callback);
                                        } else {

                                            itemStoreArray.push(String(returnData._id));
                                            setImmediate(callback);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (validationErrors.length != 0) {

                        require("fs").unlink(filePath, function () {

                            flowController.emit('MULTI-ERROR', {message: 'Following errors occurred while processing file: ' + fileName, validationErrors: validationErrors, tempId: putlistData, status: 'error', statusCode: '304'});
                        });
                    } else {

                        flowController.emit('5', putlistData, jsonArray[0], itemMasterRow, itemStoreArray, lotAddressArray);
                    }
                });
            });

            // Send JSON response
            flowController.on('5', function (putlistData, jsonArray, itemMasterRow, itemStoreArray, lotAddressArray) {

                (consoleLog) ? console.log('5') : '';

                var holdingType = itemMasterRow.holdingType;

                holdingTypeModel.findOne({'_id': holdingType}, function (err, holdingTypeRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, tempId: putlistData, status: 'error', statusCode: 304});
                    } else if (holdingTypeRow == null) {

                        flowController.emit('ERROR', {message: 'Item ' + itemMasterRow.itemCode + ' should have Holding type defined', tempId: putlistData, status: 'error', statusCode: 304});
                    } else {

                        var newPutSubList = new putSubListModel();

                        newPutSubList.putListId = putlistData;
                        newPutSubList.itemDescription = itemMasterRow.itemDescription;
                        newPutSubList.itemType = 'PALLET';
                        newPutSubList.itemValue = jsonArray.PalletNo;
                        newPutSubList.itemCode = itemMasterRow.itemCode;
                        newPutSubList.itemStoreId = itemStoreArray;
                        newPutSubList.requiredQuantity = 1;
                        newPutSubList.palletNumber = jsonArray.PalletNo;
                        newPutSubList.palletSize = jsonArray.PalletSize;
                        newPutSubList.palletType = jsonArray.PalletType;
                        newPutSubList.pickLocationAddress = 'CYBER CONVEYER LINE';
                        newPutSubList.sequence = 1;
                        newPutSubList.createdBy = 'INTERFACE';
                        newPutSubList.timeCreated = timeInInteger;

                        newPutSubList.save(function (err, insertedRecordDetails) {
                            if (err) {


                                flowController.emit('ERROR', {message: 'ERROR OCCURRED WHILE ADDING PUT LINE ITEM ' + err, status: 'error', tempId: putlistData, statusCode: '404'});
                            } else {

                                flowController.emit('6', putlistData, String(insertedRecordDetails._id), itemMasterRow, jsonArray.PalletNo, lotAddressArray);
                            }
                        });
                    }
                });
            });

            // Update putsublist to putlist
            flowController.on('6', function (putlistId, putSubListId, itemMasterRow, palletNumber, lotAddressArray) {

                (consoleLog) ? console.log('6') : '';

                var query = {'_id': putlistId};
                var update = {'$addToSet': {'putSubLists': putSubListId}};

                putListModel.update(query, update, function (err) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: "ERROR OCCURRED WHILE UPDATING PUTLIST " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('7', putlistId, putSubListId, itemMasterRow, palletNumber, lotAddressArray);
                    }
                });
            });

            // Provide name to putlist
            flowController.on('7', function (putlistId, putSubListId, itemMasterRow, palletNumber, lotAddressArray) {

                (consoleLog) ? console.log('7') : '';

                var date = moment(new Date()).format('DD/MM/YY');

                putListModel.findOne({'warehouseId': warehouseId, 'date': date}).sort({'name': -1}).exec(function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var name = (putListRow == null) ? 'PUT' + moment(new Date()).format('DDMM') + '0001' : MagicIncrement.inc(putListRow.name);
                        var sequence = (putListRow == null) ? 1 : MagicIncrement.inc(putListRow.sequence);

                        var query = {'_id': putlistId, 'activeStatus': 1};
                        var update = {'$set': {'warehouseId': warehouseId, 'name': name, 'sequence': sequence, 'date': date}};

                        putListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                fs.appendFile(pathPutList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PUTLIST' + ',' + 'INTERFACE' + ',' + name + ',' + sequence + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {
                                        // append failed
                                        res.json({message: 'Error while adding PutList. ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        console.log('append file in log');
                                    }
                                });
                                flowController.emit('ALERT', itemMasterRow);
                                flowController.emit('LOG', itemMasterRow.itemCode, itemMasterRow.itemDescription, palletNumber, "-", "Cyberline", "-", putlistId);
                                flowController.emit('LOGS', putlistId, putSubListId, itemMasterRow, palletNumber, lotAddressArray);
                                flowController.emit('END', {message: 'File uploaded & New Put-Sublist added into the system!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // ALERT 
            flowController.on('ALERT', function (itemMasterRow) {

                (consoleLog) ? console.log('ALERT') : '';

                itemStoreModel.count({'itemMasterId': itemMasterRow._id, activeStatus: 1}, function (err, itemCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        maxInventory = (itemMasterRow.itemSystemSpecification[0].maxInventoryAlert) ? itemMasterRow.itemSystemSpecification[0].maxInventoryAlert : '';

                        if (maxInventory) {

                            if (itemCount > parseInt(maxInventory)) {

                                dataObject = {
                                    warehouseId: warehouseId,
                                    textName: 'Current Inventory of ItemCode ' + itemMasterRow.itemCode + ' Has Reached To Maximum Inventory (Max. Count : ' + parseInt(maxInventory) + '  && Current Inventory  ' + itemCount + '  ).',
                                    module: 'INVENTORY',
                                    name: 'ITEM CODE : ' + itemMasterRow.itemCode,
                                    id: itemMasterRow._id
                                };

                                alertService.createAlert(dataObject, function (err, response) {
                                    if (err)
                                        console.log('Error occurred while creating alert ' + err);
                                    else
                                        console.log('Alert saved ' + response);
                                });
                            }
                        }
                    }
                });
            });

            // LOG APPENDS
            flowController.on('LOG', function (itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId) {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No Put-List available !', status: 'error', statusCode: '404'});
                    } else {

                        itemDescriptionSp = itemDescription.replace(/[^a-zA-Z0-9]/g, "-");
                        //pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                        // dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");
                        fs.appendFile(pathSubPutList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PUTSUBLIST' + ',' + "INTERFACE" + ',' + putListRow.name + ',' + itemCode + ',' + itemDescriptionSp + ',' + palletNumber + ',' + "-" + ',' + orderNumber + ',' + pickLocationAddress + ',' + dropLocationAddress + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {

                                // append failed
                                console.log(err);
                            } else {

                                console.log('append putSubList file create time');
                            }
                        });
                    }
                });
            });

            // Logs
            flowController.on('LOGS', function (putlistId, putSubListId, itemMasterRow, palletNumber, lotAddressArray) {

                (consoleLog) ? console.log('LOGS') : '';

                var object = {};
                object.itemMasterId = String(itemMasterRow._id);
                object.listId = putlistId;
                object.subListId = putSubListId;
                object.itemCode = itemMasterRow.itemCode;
                object.itemType = 'PALLET';
                object.itemValue = palletNumber;
                object.warehouseId = warehouseId;
                object.activityType = 'PUT';
                object.lotAddress = lotAddressArray;
                object.activity = 'PUT, Item created/added to itemstore & putlist created';

                var array = [];

                array.push(object);

                transactionalLogService.addTransactionToLogs(1001, array, function (err, logsRecord) {
                    if (err)
                        console.log('Error while adding transactions to logs');
                    else
                        console.log('Transactional logs added for putlist in to system.');
                });
            });

            // END
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';
                global.lock_interfacePut = 'NO';
                res.json(result);

                flowController.emit('SOCKET');
            });

            // Error Handling : Array of errors while processing
            flowController.on('MULTI-ERROR', function (error) {

                (consoleLog) ? console.log('MULTI-ERRORRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR') : '';

                var textFile = "./public/files/interface/_errors/" + onlyFileName + ".txt";

                fs.writeFile(textFile, 'Following errors occurred while processing PUT File : ' + fileName + '\n\n', function (err) {
                    if (err) {
                        console.log('Error Occurred while creating directory: ' + err);
                        res.json(error);
                    } else {
                        flowController.emit('MULTI-ERROR2', error, textFile);
                    }
                });
            });

            // 
            flowController.on('MULTI-ERROR2', function (error, textFile) {

                (consoleLog) ? console.log('MULTI-ERROR22222') : '';

                var count = 1;
                var text = 'Following errors occurred while processing PUT File : ' + fileName + '\n\n';

                async.eachSeries(error.validationErrors, function (element, callback) {

                    var append = count + '. ' + element.message + "\n";
                    text = text + append;
                    count++;
                    setImmediate(callback);

                }, function () {

                    fs.writeFile(textFile, text, function (err) {
                        if (err) {

                            console.log('Unable to append ' + err);
                        } else {

                            var ip = baseUrl.split('/')[2].split(':')[0];
                            var port = baseUrl.split('/')[2].split(':')[1];

                            var textFilePath = 'http://' + ip + ':' + port + "/files/interface/_errors/" + onlyFileName + ".txt";

                            dataObject = {};
                            dataObject.warehouseId = warehouseId;
                            dataObject.textName = 'Errors occurred while adding Putlist:<b>' + fileName + '</b> via Interface. <a target="_blank" href="' + textFilePath + '">CLICK HERE</a> to know more.';
                            dataObject.module = 'PUTLIST';
                            dataObject.name = 'PUTLIST : ' + fileName;
                            dataObject.id = '';

                            alertService.createAlert(dataObject, function (err, response) {
                                if (err) {
                                    res.json(err);
                                } else {
                                    res.json(error);
                                }
                                global.lock_interfacePut = 'NO';
                            });

                            if (error.hasOwnProperty('tempId')) {

                                putListModel.remove({_id: String(error.tempId)}, function (err) {
                                    if (err)
                                        console.log('Error');
                                    else
                                        console.log('Document removed');
                                });
                            }
                        }
                    });
                });
            });

            // Error Handling : Single error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERRORRRRRRRR') : '';
                (consoleLog) ? console.log(error) : '';
                (fs.existsSync(filePath)) ? require("fs").unlink(filePath) : '';

                dataObject = {};
                dataObject.warehouseId = warehouseId;
                dataObject.textName = error.message;
                dataObject.module = 'PUTLIST';
                dataObject.name = 'PUTLIST : ' + fileName;
                dataObject.id = '';

                alertService.createAlert(dataObject, function (err, response) {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(error);
                    }
                    global.lock_interfacePut = 'NO';
                });

                if (error.hasOwnProperty('tempId')) {

                    putListModel.remove({_id: String(error.tempId)}, function (err) {
                        if (err)
                            console.log('Error');
                        else
                            console.log('Document removed');
                    });
                }
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });

            // Error Handling
            flowController.on('SOCKET', function () {

                io = req.app.get('io');

//                Object.keys(io.sockets.sockets).forEach(function (id) {
//                    console.log("PutList ID:", id);  // socketId
//                });
                console.log('**************************putlist-android-socket-emit-start**********************');
                io.sockets.emit('putlist', '#putlist');
                console.log('**************************putlist-android-socket-emit-end************************');
            });

            // START
            flowController.emit('START');
        });
//
//
// 2. OUT FOLDER
//----------------------------------------------------------------------------------------------------------------------------
// Check for updated put file
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/out/send-update/put-file/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var directory = './public/files/interface/put/out/'; //Put02_ DDMMYYHHMMSS_###

            var directories = ["./public/files/interface/put/out/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else {

                        if (!files.length) {

                            flowController.emit('ERROR', {message: 'Watch done! No files found.', status: 'success', statusCode: '404'});
                        } else {

                            var fileArray = [];
                            files.forEach(file => {

                                fileArray.push(file);
                                if (files.length === fileArray.length) {

                                    flowController.emit('END', {message: 'Watch done! New file arrived.', data: fileArray, status: 'success', statusCode: '200'});
                                }
                            });
                        }
                    }
                }
                );
            });
            //END 
            flowController.on('END', function (result) {

                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                res.json(error);
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });
            //instlize
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Send JSON of required file to local computer
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/out/send-file/put-file/')

        .post(function (req, res) {

            var fileName = req.body.fileName.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var directory = './public/files/interface/put/out/'; //Put02_ DDMMYYHHMMSS_###

            var path = directory + fileName;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else {

                        if (!files.length) {

                            flowController.emit('ERROR', {message: 'Download lookup! No files found.', status: 'error', statusCode: '404'});
                        } else {

                            if (fs.existsSync(path)) {

                                var jsonArray = [];

                                csv().fromFile(path)

                                        .on('json', (jsonObj) => {

                                            jsonArray.push(jsonObj);// Update jsob object with additional values
                                        })
                                        .on('done', (error) => {

                                            flowController.emit('END', {message: 'Operation Successful!', data: jsonArray, status: 'success', statusCode: '200'});
                                        });
                            }
                        }
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                res.json(error);
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });
            //instlize
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Delete after it is received by local machine in their out folder
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/out/delete-file/put-file/')

        .put(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var file = req.body.fileName.trim();

            var directory = './public/files/interface/put/out/'; //Put02_ DDMMYYHHMMSS_###

            var path = './public/files/interface/put/out/' + file; //Put02_ DDMMYYHHMMSS_###

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else {

                        if (files.length) {

                            if (fs.existsSync(path)) {

                                require("fs").unlink(path, function () {

                                    flowController.emit('END', {message: 'File acknowledged! Removed from server.', status: 'success', statusCode: '200'});
                                });
                            }
                        }
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                res.json(error);
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });
            //instlize
            flowController.emit('START');
        });
//
//
module.exports = router;