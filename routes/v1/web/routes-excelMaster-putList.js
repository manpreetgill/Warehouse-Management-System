var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var mongoXlsx = require('mongo-xlsx');
var MagicIncrement = require('magic-increment');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
var async = require('async');
var json2csv = require('json2csv');
var csv = require('csvtojson');
//---------------------------------------------------------------------------------------------------------------------------
var pathPickSubList = './logs/dailyLog/pickSubListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var transactionalLogService = require('../../../service-factory/transactionalLogService');
var currentActiveStatusService = require('../../../service-functions/functions-currentActivityStatusService');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var pathSubPutList = './logs/dailyLog/putSubListLogs/log.txt';
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
// PUTLIST MANUAL : Import action (Specific to GBL)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/create/manual-import/')

        .post(function (req, res) {

            var consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var fileName = req.body.fileName.trim();

            var createdBy = req.body.createdBy.trim();

            var baseUrl = req.body.baseUrl.trim(); //'http://localhost:2000/avancer/';

            var fileXLS = req.body.fileXLS;

            var path = "./public/files/upload/put/" + fileName;

            var directories = ["./public/files/upload/", "./public/files/upload/put/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var validationErrors = [];

            var flowController = new EventEmitter();

            // Create picklist
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                if (fs.existsSync(path)) {

                    res.json({message: 'File already uploaded!', status: 'error', statusCode: '304'});
                } else {

                    require("fs").writeFile(path, fileXLS, 'base64', function (err) {
                        if (err) {

                            res.json({message: 'ERROR WHILE UPLOADING PUT DOCUMENT. error: ' + err, status: 'error', statusCode: '500'});
                        } else {

                            var model = null;

                            (consoleVar) ? console.log('PROMISE') : '';

                            mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {

                                flowController.emit('0', mongoData);
                            });
                        }
                    });
                }
                ;
            });

            // Check if multiple sheets are their in excel file
            flowController.on('0', function (mongoData) {

                (consoleVar) ? console.log('0') : '';

                var isArray = Array.isArray(mongoData[0]);

                if (isArray) {

                    require("fs").unlink(path, function () {

                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'success', statusCode: '200'});
                    });
                } else {

                    flowController.emit('1', mongoData);
                }
            });

            // Initial validation
            flowController.on('1', function (mongoData) {

                (consoleVar) ? console.log('1') : '';

                var itemMasterRowData = '';
                var count = 0;
                var palletNumberArray = [];

                async.eachSeries(mongoData, function (element, callback) {

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

                        var timeStamp = ((parseInt(element.CreatedOn) - 25569) * 86400) * 1000;
                        var newCreatedOn = moment(timeStamp).format('DD/MM/YY');
                        element.createdOn = newCreatedOn;

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

                                            (palletNumberArray.indexOf(element.PalletNo) == -1) ? palletNumberArray.push(element.PalletNo) : '';

                                            itemMasterRowData = itemMasterRow;
                                            setImmediate(callback);
                                        }
                                    });
                                }
                            }
                        });
                    }
                }, function () {

                    if (palletNumberArray.length > 1) {

                        require("fs").unlink(path, function () {

                            flowController.emit('ERROR', {message: 'Only one pallet allowed per Putlist! However, you can create multiple files to process multiple pallets. Current pallets are ' + palletNumberArray, status: 'error', statusCode: '500'});
                        });
                    } else if (validationErrors.length != 0) {

                        require("fs").unlink(path, function () {

                            flowController.emit('ERROR', {message: 'Following errors occurred while processing file: ' + fileName, validationErrors: validationErrors, status: 'error', statusCode: '304'});
                        });
                    } else {

                        flowController.emit('2', itemMasterRowData);
                    }
                });
            });

            // Create put
            flowController.on('2', function (itemMasterRow) {

                (consoleVar) ? console.log('2') : '';

                var newPutList = new putListModel();

                newPutList.warehouseId = warehouseId;
                newPutList.timeCreated = timeInInteger;
                newPutList.createdBy = createdBy;

                newPutList.save(function (err, insertedRecordDetails) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', String(insertedRecordDetails._id), itemMasterRow);
                    }
                });
            });

            // Add putlist upload mode
            flowController.on('3', function (putlistData, itemMasterRow) {

                (consoleVar) ? console.log('3') : '';

                putListModel.findOne({'_id': putlistData, 'activeStatus': 1}, function (err, putListRow) {

                    putListRow.referenceFile = fileName;
                    putListRow.mode = 'MANUAL';

                    putListRow.save(function (err) {

                        flowController.emit('4', putlistData, itemMasterRow);
                    });
                });
            });

            // Generate pick-sublist under this list
            flowController.on('4', function (putlistData, itemMasterRow) {

                (consoleVar) ? console.log('4') : '';

                var dateNew = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + dateNew);

                itemStoreArray = [];
                lotAddressArray = [];

                mongoModel = null;

                mongoXlsx.xlsx2MongoData(path, mongoModel, function (err, mongoData) {

                    var count = 0;

                    async.eachSeries(mongoData, function (element, callback) {

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
                                        newItemStore.createdBy = createdBy;
                                        newItemStore.currentActivityStatus = 'PUT - Scheduled(Manual)';
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

                        if (err) {

                            res.json({message: err, status: 'error', statusCode: '304'});
                        } else if (validationErrors.length != 0) {

                            require("fs").unlink(path, function () {

                                flowController.emit('ERROR', {message: 'Following errors occurred while processing file: ' + fileName, tempId: putlistData, validationErrors: validationErrors, status: 'error', statusCode: '304'});
                            });
                        } else {

                            flowController.emit('5', putlistData, mongoData[0], itemMasterRow, itemStoreArray, lotAddressArray);
                        }
                    });
                });
            });

            // Send JSON response
            flowController.on('5', function (putlistData, mongoData, itemMasterRow, itemStoreArray, lotAddressArray) {

                (consoleVar) ? console.log('5') : '';

                var holdingType = itemMasterRow.holdingType;

                holdingTypeModel.findOne({'_id': holdingType}, function (err, holdingTypeRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: 304});
                    } else if (holdingTypeRow == null) {

                        flowController.emit('ERROR', {message: 'Item ' + itemMasterRow.itemCode + ' should have Holding type defined', status: 'error', statusCode: 304});
                    } else {

                        var newPutSubList = new putSubListModel();

                        newPutSubList.putListId = putlistData;
                        newPutSubList.itemDescription = itemMasterRow.itemDescription;
                        newPutSubList.itemCode = itemMasterRow.itemCode;
                        newPutSubList.itemStoreId = itemStoreArray;
                        newPutSubList.requiredQuantity = 1;
                        newPutSubList.palletNumber = mongoData.PalletNo;
                        newPutSubList.palletSize = mongoData.PalletSize;
                        newPutSubList.palletType = mongoData.PalletType;
                        newPutSubList.pickLocationAddress = 'CYBER CONVEYER LINE';
                        newPutSubList.sequence = 1;
                        newPutSubList.createdBy = createdBy;
                        newPutSubList.timeCreated = timeInInteger;

                        newPutSubList.save(function (err, insertedRecordDetails) {
                            if (err) {

                                flowController.emit('ERROR', {message: err, tempId: putlistData, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('6', putlistData, String(insertedRecordDetails._id), itemMasterRow, mongoData.PalletNo, lotAddressArray);
                            }
                        });
                    }
                });
            });

            // Update sublist ID to putlist query 
            flowController.on('6', function (putlistData, putSubListId, itemMasterRow, palletNumber, lotAddressArray) {

                (consoleVar) ? console.log('6') : '';

                var date = moment(new Date()).format('DD/MM/YY');

                putListModel.findOne({'warehouseId': warehouseId, 'date': date}).sort({'name': -1}).exec(function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var name = (putListRow == null) ? 'PUT' + moment(new Date()).format('DDMM') + '0001' : MagicIncrement.inc(putListRow.name);
                        var sequence = (putListRow == null) ? 1 : MagicIncrement.inc(putListRow.sequence);

                        var query = {'_id': putlistData};
                        var update = {'$addToSet': {'putSubLists': putSubListId}, '$set': {'warehouseId': warehouseId, 'name': name, 'sequence': sequence, 'date': date}};

                        putListModel.update(query, update, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('ALERT', itemMasterRow);
                                flowController.emit('LOG', itemMasterRow.itemCode, itemMasterRow.itemDescription, palletNumber, "-", "Cyberline", "-", putlistData);
                                flowController.emit('LOGS', putlistData, putSubListId, itemMasterRow, palletNumber, lotAddressArray);
                                flowController.emit('END', {message: 'New Put-Sublist added into the system!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            //ALERT 
            flowController.on('ALERT', function (itemMasterRow) {

                itemStoreModel.count({'itemMasterId': itemMasterRow._id, activeStatus: 1}, function (err, itemCount) {
                    if (err) {

                    } else {

                        maxInventory = (itemMasterRow.itemSystemSpecification[0].maxInventoryAlert) ? itemMasterRow.itemSystemSpecification[0].maxInventoryAlert : '';

                        if (maxInventory) {

                            if (itemCount > parseInt(maxInventory)) {

                                dataObject = {

                                    warehouseId: warehouseId,
                                    textName: 'Current Inventory of ItemCode ' + itemMasterRow.itemCode + ' Has Reached To Maximum Inventory (Max. Count : ' + parseInt(maxInventory) + '  && Current Inventory  ' + itemCount + ').',
                                    module: 'INVENTORY',
                                    name: 'ITEM CODE : ' + itemMasterRow.itemCode,
                                    id: itemMasterRow._id
                                };

                                alertService.createAlert(dataObject, function (err, response) {
                                    if (err)
                                        console.log('err');
                                    else
                                        console.log('success' + response);
                                });
                            }
                        }
                    }
                });
            });

            //LOG APPENDS
            flowController.on('LOG', function (itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId) {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No Put-List available !', status: 'error', statusCode: '404'});
                    } else {

                        deviceId = '-';//(putListRow.resourceAssigned[0].deviceId) ? putListRow.resourceAssigned[0].deviceId : '';

                        usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                            } else {
                                username = (userRow.username) ? userRow.username : '-';
                                itemDescriptionSp = itemDescription.replace(/[^a-zA-Z0-9]/g, " ");
                                //pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                                // dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");
                                fs.appendFile(pathSubPutList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PUTSUBLIST' + ',' + username + ',' + putListRow.name + ',' + itemCode + ',' + itemDescriptionSp + ',' + palletNumber + ',' + orderNumber + ',' + pickLocationAddress + ',' + dropLocationAddress + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        // append failed
                                        console.log(err);
                                    } else {

                                        console.log('append putSubList file create time');
                                    }
                                });
                            }
                        });
                    }
                });
            });

            // Logs
            flowController.on('LOGS', function (putlistId, putSubListId, itemMasterRow, palletNumber, lotAddressArray) {

                (consoleVar) ? console.log('LOGS') : '';

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
                object.activity = 'PUT, Item created/added to itemstore via manual import & respective putlist created';

                var array = [];

                array.push(object);

                transactionalLogService.addTransactionToLogs(1001, array, function (err, logsRecord) {
                    if (err)
                        console.log('Error while adding transactions to logs');
                    else
                        console.log('Transactional logs added for putlist in to system.');
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleVar) ? console.log('END') : '';
                dashboardService.createAlert();
                res.json(result);

                flowController.emit('SOCKET');
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUTLIST-MANUAL-IMPORT',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {
                        console.log('Entered error ');
                    } else {
                        console.log('Entered success ');
                    }
                });

                if (error.hasOwnProperty('tempId')) {

                    putListModel.remove({_id: String(error.tempId)}, function (err) {
                        if (err)
                            console.log('Error');
                        else
                            console.log('Document removed');
                    });
                }

                res.json(error);
            });

            // Socket
            flowController.on('SOCKET', function () {

                //setTimeout(function () {
                io = req.app.get('io');

                Object.keys(io.sockets.sockets).forEach(function (id) {
                    console.log("PutList ID:", id);  // socketId
                });
                console.log('**************************putlist-android-socket-emit-start**********************');
                io.sockets.emit('putlist', '#putlist');
                console.log('**************************putlist-android-socket-emit-end************************');
                //}, 1000);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// PUTLIST MANUAL : Export action (Specific to GBL)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/create/manual-export/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var putListId = req.body.putListId.trim();

            var path = "./public/files/upload/put/";

            var csvFilePath = './public/files/interface/put/in/';

            var directories = ["./public/files/interface/", "./public/files/interface/put/", "./public/files/interface/put/out/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: "putList missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        var getJsonArray = [];

                        filePath = putListRow.referenceFile;

                        fileMode = putListRow.mode;

                        if (fileMode === 'MANUAL') {

                            var pathFile = path + putListRow.referenceFile;

                            var model = null;

                            mongoXlsx.xlsx2MongoData(pathFile, model, function (err, mongoData) {

                                async.eachSeries(mongoData, function (element, callback) {

                                    getJsonArray.push(element);
                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('1', getJsonArray, filePath, fileMode);
                                    }
                                });
                            });
                        } else {

                            var getJsonArray = [];

                            var csvFilePathDone = csvFilePath + putListRow.referenceFile;

                            csv().fromFile(csvFilePathDone)

                                    .on('json', (jsonObj) => {

                                        getJsonArray.push(jsonObj);
                                    })

                                    .on('done', (error) => {

                                        flowController.emit('1', getJsonArray, filePath, fileMode);
                                    });
                        }
                    }
                });
            });

            // Build the JSON
            flowController.on('1', function (getJsonArray, filePath, fileMode) {

                (consoleLog) ? console.log('1') : '';

                var fields = ['Batch', 'BoxNo', 'PalletNo', 'Material', 'Rack', 'CreatedOn', 'PalletSize', 'PalletType', 'NetWeight', 'Pieces', 'GrossWeight', 'NetWeightinLBS', 'GrossWeightInLbs', 'TareWeightinLBs']; // Convert JSON data to csv file at server side

                putSubListModel.findOne({'putListId': putListId, 'activeStatus': 1}, function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (putSubListRow == null) {

                        flowController.emit('ERROR', {message: "putSubList missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        var finalArray = [];

                        async.eachSeries(getJsonArray, function (element, callback) {

                            var data = {};
                            data.Batch = element.Batch;
                            data.BoxNo = element.BoxNo;
                            data.PalletNo = element.PalletNo;
                            data.Material = element.Material;
                            data.Rack = putSubListRow.dropLocationAddress;
                            data.CreatedOn = element.CreatedOn;
                            data.PalletSize = element.PalletSize;
                            data.PalletType = element.PalletType;
                            data.NetWeight = element.NetWeight;
                            data.Pieces = element.Pieces;
                            data.GrossWeight = element.GrossWeight;
                            data.NetWeightinLBS = element.NetWeightinLBS;
                            data.GrossWeightInLbs = element.GrossWeightInLbs;
                            data.TareWeightinLBs = element.TareWeightinLBs;

                            finalArray.push(data);
                            setImmediate(callback);

                        }, function (err) {

                            if (err) {
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                flowController.emit('2', finalArray, filePath, fileMode, fields);
                            }
                        });
                    }
                });
            });

            // Generate file
            flowController.on('2', function (finalArray, filePath, fileMode, fields) {

                (consoleLog) ? console.log('2') : '';

                if (fileMode == 'MANUAL') {

                    var fileName = filePath.toString().split(".");
                    var finalPath = './public/files/interface/put/out/' + fileName[0] + '.csv';
                } else {

                    var finalPath = './public/files/interface/put/out/' + filePath;
                }

                try {

                    var csvFile = json2csv({data: finalArray, fields: fields});

                    fs.writeFile(finalPath, csvFile, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else {
                            flowController.emit('END', {message: 'Putlist cybernatic file with new rack location updated!', status: 'success', statusCode: '200'});
                        }
                    });
                } catch (err) {

                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                }
            });

            // error while process execution
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'EXPORT-PUTLIST-ADD',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {
                        console.log('Entered error ');
                    } else {
                        console.log('Entered success ');
                    }
                });
                res.json(error);
            });

            // end
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';

                res.json(response);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;