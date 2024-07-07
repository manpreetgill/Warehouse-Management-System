var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var requestify = require('requestify');
var intersection = require('array-intersection');

var transactionalLogService = require('../service-factory/transactionalLogService');
var function_deviceMasterService = require('../service-functions/functions-deviceMasterService');
var function_deviceAreaAllocationService = require('../service-functions/functions-deviceAreaAllocationService');
var function_itemMasterService = require('../service-functions/functions-itemMasterService');
var function_itemStoreService = require('../service-functions/functions-itemStoreService');
var function_locationStoreService = require('../service-functions/functions-locationStoreService');
var function_inwardListService = require('../service-functions/functions-inwardListService');
var function_inwardSubListService = require('../service-functions/functions-inwardSubListService');

var inwardListService = {};
//
//
inwardListService.updateStatusToInActivate = function (dataObject, servicecallback) {

    var consoleVar = 1;

    var inwardListId = dataObject.inwardListId.trim();

    var warehouseId = dataObject.warehouseId.trim();

    var flowController = new EventEmitter();
    // Get the picklist data
    flowController.on('START', function () {

        (consoleVar) ? console.log('START') : '';

        function_inwardListService.getPicklistDataByDate(inwardListId, function (err, inwardListRecord) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('1', inwardListRecord);
            }
        });
    });
    // Get the picklist data by activated sequence
    flowController.on('1', function () {

        (consoleVar) ? console.log('1') : '';

        function_inwardListService.getAllPicklistDataByActivatedSequence(function (err, inwardListActivatedRecord) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('2', inwardListActivatedRecord);
            }
        });
    });
    // Get picksublist data by picklist ID
    flowController.on('2', function (lastSequence) {

        (consoleVar) ? console.log('2') : '';

        function_inwardSubListService.getPickSublistDataById(inwardListId, function (err, inwardSubListRecords) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('2.0', lastSequence, inwardSubListRecords);
            }
        });
    });
    // Check if any of the Pick Sublist is OUTER & Check if all outer are picked or not.
    flowController.on('2.0', function (lastSequence, inwardSubListRecords) {

        (consoleVar) ? console.log('2.0') : '';

        async.eachSeries(inwardSubListRecords, function (element, callback) {

            if (element.itemType === 'PALLET') {

                var palletType = element.palletType;
                var status = element.status;

                if (palletType === 'O' && status <= 5) {

                    var customPalletNumber = element.customPalletNumber;

                    function_itemStoreService.checkPickActivityByCustomPalletNumber(inwardListId, customPalletNumber, function (err) {
                        if (err) {

                            callback(err);
                        } else {
                            setImmediate(callback);
                        }
                    });
                } else {
                    setImmediate(callback);
                }
            } else {
                setImmediate(callback);
            }
        }, function (err) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('3', lastSequence);
            }
        });
    });
    // Get latest activated sequence
    flowController.on('3', function (lastSequence) {

        console.log(lastSequence);

        (consoleVar) ? console.log('3') : '';

        var sequence = (lastSequence.length == 0) ? 1 : lastSequence[0] + 1;

        flowController.emit('4', sequence);
    });
    // Update picklist status to activated
    flowController.on('4', function (newSequence) {

        (consoleVar) ? console.log('4') : '';

        function_inwardListService.updatePicklistStatusToActivated(inwardListId, newSequence, function (err, response) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('5', newSequence);
            }
        });
    });
    // Update picksublist status to activated
    flowController.on('5', function (newSequence) {

        (consoleVar) ? console.log('5') : '';

        function_inwardSubListService.updatePickSublistStatusToActivated(inwardListId, newSequence, function (err, response) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('LOGS');
                flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
            }
        });
    });
    // Add transactional log
    flowController.on('LOGS', function () {

        (consoleVar) ? console.log('LOGS') : '';

        function_inwardSubListService.addTransactionalLogAfterActivationPicklist(warehouseId, inwardListId, function (err, response) {
            if (err) {

                console.log('Error while initiating transactional Logs');
            } else {

                console.log('Transactional Logs initiated successfully');
            }
        });
    });
    // End
    flowController.on('END', function (result) {

        (consoleVar) ? console.log('END') : '';

        servicecallback(null, result);
    });
    // Error
    flowController.on('ERROR', function (error) {

        (consoleVar) ? console.log('ERROR') : '';

        servicecallback(error);
    });
    // Initialize
    flowController.emit('START');
};
//
//
inwardListService.updateStatusToAssign = function (dataObject, servicecallback) {

    var consoleVar = 1;

    (consoleVar) ? console.log(dataObject) : '';

    var userId = dataObject.userId.trim();

    var deviceId = dataObject.deviceId.trim();

    var singleMHU = dataObject.materialHandlingUnit.trim();

    var baseUrl = dataObject.baseUrl;//"http://localhost:2000/avancer";

    var flowController = new EventEmitter();

    // Check if initial lot already assigned to device
    flowController.on('START', function () {

        (consoleVar) ? console.log('START') : '';

        function_inwardListService.checkIfInitialLotAlreadyAssigned(deviceId, baseUrl, function (err, result) {

            if (err) {

                servicecallback(err);
            } else {

                if (result == 'ASSIGNED') {
                    console.log('result:  ASSIGNED');
                    flowController.emit('END', {message: 'Initial lot already assigned to device!', status: 'success', statusCode: '200'});
                } else {
                    console.log('result:  UNASSIGNED');
                    flowController.emit('1');
                }
            }
        });
    });
    // Get all picklist data by activated sequence
    flowController.on('1', function () {

        (consoleVar) ? console.log('1') : '';

        function_inwardListService.getAllPicklistDataByActivatedSequenceAscending(function (err, picklistRecords) {
            //console.log(picklistRecords);
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('2', picklistRecords);
            }
        });
    });
    // Get line items data inside sorted picklists
    flowController.on('2', function (picklistRecords) {

        (consoleVar) ? console.log('2') : '';

        var pickSublistRecordsArray = [];

        async.eachSeries(picklistRecords, function (element, callbackDone) {

            function_inwardSubListService.getAllActivatedPickSublistDataByPicklistId(element.inwardListId, function (err, inwardSubListRecords) {

                if (err) {

                    callbackDone(err);
                } else {

                    async.eachSeries(inwardSubListRecords, function (element2, callback2Done) {

                        var data = {
                            inwardListId: element.inwardListId,
                            inwardSubListId: String(element2._id),
                            name: element.name,
                            hopperSequence: element.hopperSequence,
                            hopperPriority: element.hopperPriority,
                            itemCode: element2.itemCode,
                            pickLocationAddress: element2.pickLocationAddress,
                            dropLocationAddress: element2.dropLocationAddress,
                            customPalletNumber: (element2.customPalletNumber) ? element2.customPalletNumber : ''
                        };
                        pickSublistRecordsArray.push(data);
                        setImmediate(callback2Done);

                    }, function (err) {
                        if (err)
                            callbackDone(err);
                        else
                            setImmediate(callbackDone);
                    });
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('3', pickSublistRecordsArray);
        });
    });
    // Get item and location MHE with zone
    flowController.on('3', function (pickSublistRecordsArray) {

        (consoleVar) ? console.log('3') : '';

        //console.log(pickSublistRecordsArray);

        var pickSublistRecordsWithMasterArray = [];// Contain item MHU,location MHU & matching with selected MHU

        async.eachSeries(pickSublistRecordsArray, function (element, callbackDone) {

            function_itemMasterService.getItemMasterDataByItemCode(element.itemCode, function (err, itemMasterRecord) {

                if (err) {

                    callbackDone(err);
                } else {

                    function_locationStoreService.getLocationDataByCustomerAddress(element.pickLocationAddress, function (err, locationStoreRecord) {

                        if (err) {

                            callbackDone(err);
                        } else {
                            function_locationStoreService.getLocationDataByCustomerAddress(element.dropLocationAddress, function (err, dropLocationStoreRecord) {

                                if (err) {

                                    callbackDone(err);
                                } else {

                                    var pickLocationMHE = locationStoreRecord.materialHandlingUnitId;
                                    var itemMHE = itemMasterRecord.handlingUnit;
                                    var dropLocationMHE = dropLocationStoreRecord.materialHandlingUnitId;

                                    if (pickLocationMHE.length > 0 && itemMHE.length > 0 && dropLocationMHE.length > 0) {
                                        console.log('ITEM, PICK & DROP MHE CHECKED');
                                        var commonArray = intersection(pickLocationMHE, itemMHE, dropLocationMHE);
                                        // selected MHU must be part of comnined array
                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else if (pickLocationMHE.length > 0 && itemMHE.length > 0) {
                                        console.log('PICK & ITEM MHE CHECKED');
                                        var commonArray = intersection(pickLocationMHE, itemMHE);
                                        // selected MHU must be part of comnined array
                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else if (itemMHE.length > 0 && dropLocationMHE.length > 0) {
                                        console.log('ITEM & DROP MHE CHECKED');
                                        var commonArray = intersection(itemMHE, dropLocationMHE);
                                        // selected MHU must be part of comnined array
                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else if (pickLocationMHE.length > 0 && dropLocationMHE.length > 0) {
                                        console.log('PICK & DROP MHE CHECKED');
                                        var commonArray = intersection(pickLocationMHE, dropLocationMHE);

                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else {
                                        // Anything allowed
                                        console.log('ANYTHING ALLOWED');
                                        var data = {
                                            inwardListId: element.inwardListId,
                                            inwardSubListId: element.inwardSubListId,
                                            name: element.name,
                                            hopperSequence: element.hopperSequence,
                                            hopperPriority: element.hopperPriority,
                                            zoneId: locationStoreRecord.zoneId,
                                            materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                            materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                            pickLocationAddress: element.pickLocationAddress,
                                            customPalletNumber: element.customPalletNumber
                                        };

                                        pickSublistRecordsWithMasterArray.push(data);
                                        setImmediate(callbackDone);
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('4', pickSublistRecordsWithMasterArray);
        });
    });
    // Filter line items based on area allocated to device
    flowController.on('4', function (pickSublistRecordsWithMasterArray) {

        (consoleVar) ? console.log('4') : '';

        //console.log(pickSublistRecordsWithMasterArray);

        finalArray = [];

        async.eachSeries(pickSublistRecordsWithMasterArray, function (element, callbackDone) {

            function_deviceAreaAllocationService.getPickAreaAllocatedToDeviceByDeviceId(deviceId, function (err, deviceAreaAllocationRecord) {

                if (err) {

                    callbackDone(err);
                } else {

                    if (deviceAreaAllocationRecord.zoneAllocated.indexOf(element.zoneId) == -1) {

                        setImmediate(callbackDone);
                    } else {

                        var data = {
                            inwardListId: element.inwardListId,
                            inwardSubListId: element.inwardSubListId,
                            name: element.name,
                            hopperSequence: element.hopperSequence,
                            hopperPriority: element.hopperPriority,
                            customPalletNumber: element.customPalletNumber
                        };
                        finalArray.push(data);
                        setImmediate(callbackDone);
                    }
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('5', finalArray);
        });
    });
    // Send line items based on initial lot requirement set to device by ADMIN
    flowController.on('5', function (finalArray) {

        (consoleVar) ? console.log('5') : '';

        //console.log(finalArray);

        function_deviceMasterService.getDeviceDataByDeviceId(deviceId, function (err, deviceMasterRecord) {

            if (err) {

                servicecallback(err);
            } else {

                var maxItemCount = ('maxPickListItem' in deviceMasterRecord && deviceMasterRecord.maxPickListItem != undefined) ? parseInt(deviceMasterRecord.maxPickListItem) : 3;

                if (finalArray.length < maxItemCount) {

                    flowController.emit('6.0', finalArray);
                } else {

                    resultArray = finalArray.slice(0, maxItemCount); // ( This will send top (maxItemCount - 1) items to result array)

                    flowController.emit('6.0', resultArray);
                }
            }
        });
    });
    // Check if any of the picksublist is of outer type & if YES then whole lot must be assigned to device
    flowController.on('6.0', function (resultArray) {

        var finalResultArray = [];
        var customPalletNumberArray = []; // Reference to avoid duplications of outersublists

        async.eachSeries(resultArray, function (element, callbackDone) {

            if (element.customPalletNumber == '') {

                finalResultArray.push(element);
                setImmediate(callbackDone);
            } else if (customPalletNumberArray.indexOf(element.customPalletNumber) > -1) {
                // All items over this pallet have been added to finalResultArray 
                setImmediate(callbackDone);
            } else {
                var inwardListId = element.inwardListId;
                var customPalletNumber = element.customPalletNumber;

                function_inwardSubListService.getAllPickSublistByCustomPalletNumber(inwardListId, customPalletNumber, function (err, inwardSubListRecords) {
                    if (err) {

                        callbackDone(err);
                    } else {

                        async.eachSeries(inwardSubListRecords, function (element2, callbackDone2) {

                            var inwardSubListId = String(element2._id);

                            var object = {};
                            object.inwardListId = element.inwardListId;
                            object.inwardSubListId = inwardSubListId;
                            object.name = element.name;
                            object.hopperSequence = element.hopperSequence;
                            object.hopperPriority = element.hopperPriority;

                            finalResultArray.push(object);
                            setImmediate(callbackDone2);

                        }, function (err) {

                            customPalletNumberArray.push(customPalletNumber);
                            setImmediate(callbackDone);
                        });
                    }
                });
            }
        }, function (err) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('6', finalResultArray);
            }
        });
    });
    // Filter and set result object for one to many at picklist to lineitems level
    flowController.on('6', function (resultArray) {

        (consoleVar) ? console.log('6') : '';

        //console.log(resultArray);

        updatedArray = [];
        picklistIdArray = [];

        async.eachSeries(resultArray, function (element, callbackDone) {

            var inwardListId = element.inwardListId;

            var temp = [];

            async.eachSeries(resultArray, function (element, callback2Done) {

                if (inwardListId == element.inwardListId) {

                    temp.push(element.inwardSubListId);
                    setImmediate(callback2Done);
                } else {

                    setImmediate(callback2Done);
                }
            }, function (err) {

                if (err) {

                    callbackDone(err);
                } else {

                    if (picklistIdArray.indexOf(inwardListId) == -1) {

                        var data = {
                            inwardListId: inwardListId,
                            name: element.name,
                            hopperSequence: element.hopperSequence,
                            hopperPriority: element.hopperPriority,
                            inwardSubListId: temp
                        };
                        updatedArray.push(data);
                        picklistIdArray.push(inwardListId);
                        setImmediate(callbackDone);
                    } else {

                        setImmediate(callbackDone);
                    }
                }
            });

        }, function (err) {

            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('7', updatedArray, resultArray.length);
            }
        });
    });
    // Update device capacity
    flowController.on('7', function (updatedArray, resultArray) {

        //console.log(updatedArray);

        (consoleVar) ? console.log('7') : '';

        if (updatedArray.length == 0) {

            flowController.emit('ERROR', {message: 'Currently, No suitable line items matching to your device MHE available for Pick!', status: 'error', 'statusCode': '404'});
        } else {
            //requestfy API SEND
            var requestifyUrl = baseUrl + '/v1/deviceMaster/web/device/configuration/update/target-capacity/picklist/';

            requestify.post(requestifyUrl, {'inwardListArray': updatedArray, inwardSubListCount: resultArray, 'deviceId': deviceId, 'userId': userId}).then(function (response) {

                var result = response.getBody();

                if (result.status === 'success') {

                    flowController.emit('END', {message: 'Picklist assigned.', status: 'success', 'statusCode': '200'});
                }

                if (result.status === 'error') {

                    flowController.emit('ERROR', result);
                }
            });
        }
    });
    // END
    flowController.on('END', function (result) {

        (consoleVar) ? console.log('END') : '';

        servicecallback(result);
    });
    // ERROR
    flowController.on('ERROR', function (error) {

        (consoleVar) ? console.log('ERROR') : '';
        (consoleVar) ? console.log(error) : '';

        servicecallback(error);
    });
    // START
    flowController.emit('START');
};
//
//
inwardListService.assignNextLot = function (dataObject, servicecallback) {

    var consoleVar = 1;

    (consoleVar) ? console.log(dataObject) : '';

    var userId = dataObject.userId.trim();

    var deviceId = dataObject.deviceId.trim();

    var singleMHU = dataObject.materialHandlingUnit.trim();

    var baseUrl = dataObject.baseUrl;

    var pendingPickListCount = 0;

    var flowController = new EventEmitter();
    // Allow access to request if access lock is not set
    flowController.on('START', function () {

        var lockAssignment = global.lockAssignment;

        if (lockAssignment === 'YES') {

            setTimeout(function () {
                console.log('Retrying: ' + deviceId);
                flowController.emit('START');
            }, 1000);
        } else {

            global.lockAssignment = 'YES';
            console.log('Got access: ' + deviceId);
            flowController.emit('0.0');
        }
    });
    // Get total pending line items count
    flowController.on('0.0', function () {

        (consoleVar) ? console.log('0.0') : '';

        function_inwardListService.getTotalPendingPickSubListByDeviceId(deviceId, function (err, inwardListRecord) {

            if (err) {

                flowController.emit('ERROR', err);
            } else {

                pendingPickListCount = inwardListRecord;
                flowController.emit('0');
            }
        });
    });
    // Check if device reqched to required minimum lot level
    flowController.on('0', function () {

        (consoleVar) ? console.log('0') : '';

        function_deviceMasterService.getDeviceDataByDeviceId(deviceId, function (err, deviceMasterRecord) {

            if (err) {

                flowController.emit('ERROR', err);
            } else {

                if (!('minPickListItem' in deviceMasterRecord)) {

                    flowController.emit('ERROR', {message: 'Minimum lot of device not defined!', status: 'error', 'statusCode': '404'});
                } else {

                    if (pendingPickListCount <= deviceMasterRecord.minPickListItem) {

                        flowController.emit('1');
                    } else {

                        flowController.emit('END', {message: 'Device has line items more than request for minimum lot.', status: 'success', 'statusCode': '200'});
                    }
                }
            }

        });
    });
    // Get all picklist data by activated sequence
    flowController.on('1', function () {

        (consoleVar) ? console.log('1') : '';

        function_inwardListService.getAllPicklistDataByActivatedSequenceAscending(function (err, picklistRecords) {

            if (err) {

                flowController.emit('ERROR', err);
            } else {

                console.log(picklistRecords);

                flowController.emit('2', picklistRecords);
            }
        });
    });
    // Get line items data inside sorted picklists
    flowController.on('2', function (picklistRecords) {

        (consoleVar) ? console.log('2') : '';

        var pickSublistRecordsArray = [];

        async.eachSeries(picklistRecords, function (element, callbackDone) {

            function_inwardSubListService.getAllActivatedPickSublistDataByPicklistId(element.inwardListId, function (err, inwardSubListRecords) {

                if (err) {

                    callbackDone(err);
                } else if (inwardSubListRecords == 0) {

                    setImmediate(callbackDone);
                } else {

                    async.eachSeries(inwardSubListRecords, function (element2, callback2Done) {

                        var data = {
                            inwardListId: element.inwardListId,
                            name: element.name,
                            hopperSequence: element.hopperSequence,
                            hopperPriority: element.hopperPriority,
                            inwardSubListId: String(element2._id),
                            itemCode: element2.itemCode,
                            pickLocationAddress: element2.pickLocationAddress,
                            dropLocationAddress: element2.dropLocationAddress,
                            customPalletNumber: (element2.customPalletNumber) ? element2.customPalletNumber : ''
                        };
                        pickSublistRecordsArray.push(data);
                        setImmediate(callback2Done);

                    }, function (err) {
                        if (err)
                            callbackDone(err);
                        else
                            setImmediate(callbackDone);
                    });
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('3', pickSublistRecordsArray);
        });
    });
    // Get item and location MHE with zone
    flowController.on('3', function (pickSublistRecordsArray) {

        (consoleVar) ? console.log('3') : '';
        //(consoleVar) ? console.log(pickSublistRecordsArray) : '';

        var pickSublistRecordsWithMasterArray = [];// Contain item MHU,location MHU & matching with selected MHU

        async.eachSeries(pickSublistRecordsArray, function (element, callbackDone) {

            function_itemMasterService.getItemMasterDataByItemCode(element.itemCode, function (err, itemMasterRecord) {

                if (err) {

                    callbackDone(err);
                } else {

                    function_locationStoreService.getLocationDataByCustomerAddress(element.pickLocationAddress, function (err, locationStoreRecord) {

                        if (err) {

                            callbackDone(err);
                        } else {
                            function_locationStoreService.getLocationDataByCustomerAddress(element.dropLocationAddress, function (err, dropLocationStoreRecord) {

                                if (err) {

                                    callbackDone(err);
                                } else {

                                    var pickLocationMHE = locationStoreRecord.materialHandlingUnitId;
                                    var itemMHE = itemMasterRecord.handlingUnit;
                                    var dropLocationMHE = dropLocationStoreRecord.materialHandlingUnitId;

                                    if (pickLocationMHE.length > 0 && itemMHE.length > 0 && dropLocationMHE.length > 0) {
                                        console.log('ITEM, PICK & DROP MHE CHECKED');
                                        var commonArray = intersection(pickLocationMHE, itemMHE, dropLocationMHE);
                                        // selected MHU must be part of comnined array
                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else if (pickLocationMHE.length > 0 && itemMHE.length > 0) {
                                        console.log('PICK & ITEM MHE CHECKED');
                                        var commonArray = intersection(pickLocationMHE, itemMHE);
                                        // selected MHU must be part of comnined array
                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else if (itemMHE.length > 0 && dropLocationMHE.length > 0) {
                                        console.log('ITEM & DROP MHE CHECKED');
                                        var commonArray = intersection(itemMHE, dropLocationMHE);
                                        // selected MHU must be part of comnined array
                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else if (pickLocationMHE.length > 0 && dropLocationMHE.length > 0) {
                                        console.log('PICK & DROP MHE CHECKED');
                                        var commonArray = intersection(pickLocationMHE, dropLocationMHE);

                                        if (commonArray.indexOf(singleMHU) > -1) {

                                            var data = {
                                                inwardListId: element.inwardListId,
                                                inwardSubListId: element.inwardSubListId,
                                                name: element.name,
                                                hopperSequence: element.hopperSequence,
                                                hopperPriority: element.hopperPriority,
                                                zoneId: locationStoreRecord.zoneId,
                                                materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                                materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                                pickLocationAddress: element.pickLocationAddress,
                                                customPalletNumber: element.customPalletNumber
                                            };
                                            pickSublistRecordsWithMasterArray.push(data);
                                        }
                                        // This picksublist not allowed for requesting user
                                        setImmediate(callbackDone);
                                    } else {
                                        // Anything allowed
                                        console.log('ANYTHING ALLOWED');
                                        var data = {
                                            inwardListId: element.inwardListId,
                                            inwardSubListId: element.inwardSubListId,
                                            name: element.name,
                                            hopperSequence: element.hopperSequence,
                                            hopperPriority: element.hopperPriority,
                                            zoneId: locationStoreRecord.zoneId,
                                            materialHandingUnitItem: itemMasterRecord.handlingUnit,
                                            materialHandlingUnitLocation: locationStoreRecord.materialHandlingUnitId,
                                            pickLocationAddress: element.pickLocationAddress,
                                            customPalletNumber: element.customPalletNumber
                                        };

                                        pickSublistRecordsWithMasterArray.push(data);
                                        setImmediate(callbackDone);
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('4', pickSublistRecordsWithMasterArray);
        });
    });
    // Filter line items based on area allocated to device
    flowController.on('4', function (pickSublistRecordsWithMasterArray) {

        (consoleVar) ? console.log('4') : '';
        //(consoleVar) ? console.log(pickSublistRecordsWithMasterArray) : '';

        finalArray = [];

        async.eachSeries(pickSublistRecordsWithMasterArray, function (element, callbackDone) {

            function_deviceAreaAllocationService.getPickAreaAllocatedToDeviceByDeviceId(deviceId, function (err, deviceAreaAllocationRecord) {

                if (err) {

                    callbackDone(err);
                } else {

                    if (deviceAreaAllocationRecord.zoneAllocated.indexOf(element.zoneId) == -1) {

                        setImmediate(callbackDone);
                    } else {

                        var data = {
                            inwardSubListId: element.inwardSubListId,
                            inwardListId: element.inwardListId,
                            name: element.name,
                            hopperSequence: element.hopperSequence,
                            hopperPriority: element.hopperPriority,
                            customPalletNumber: element.customPalletNumber
                        };
                        finalArray.push(data);
                        setImmediate(callbackDone);
                    }
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('5', finalArray);
        });
    });
    // Send line items based on initial lot requirement set to device by ADMIN
    flowController.on('5', function (finalArray) {

        (consoleVar) ? console.log('5') : '';
        //(consoleVar) ? console.log(finalArray) : '';

        resultArray = [];

        function_deviceMasterService.getDeviceDataByDeviceId(deviceId, function (err, deviceMasterRecord) {

            if (err) {

                flowController.emit('ERROR', err);
            } else {

                var minItemCount = ('maxPickListItem' in deviceMasterRecord && deviceMasterRecord.maxPickListItem != undefined) ? deviceMasterRecord.maxPickListItem - pendingPickListCount : deviceMasterRecord.minPickListItem;

                if (finalArray.length < minItemCount) {

                    flowController.emit('6.0', finalArray);
                } else {

                    resultArray = finalArray.slice(0, minItemCount); // ( This will send top (maxItemCount - 1) items to result array)

                    flowController.emit('6.0', resultArray);
                }
            }
        });
    });
    // Check if any of the picksublist is of outer type & if YES then whole lot must be assigned to device
    flowController.on('6.0', function (resultArray) {

        (consoleVar) ? console.log('6.0') : '';
        //(consoleVar) ? console.log(finalArray) : '';

        var finalResultArray = [];
        var customPalletNumberArray = []; // Reference to avoid duplications of outersublists

        async.eachSeries(resultArray, function (element, callbackDone) {

            if (element.customPalletNumber == '') {

                finalResultArray.push(element);
                setImmediate(callbackDone);
            } else if (customPalletNumberArray.indexOf(element.customPalletNumber) > -1) {
                // All items over this pallet have been added to finalResultArray 
                setImmediate(callbackDone);
            } else {
                var inwardListId = element.inwardListId;
                var customPalletNumber = element.customPalletNumber;

                function_inwardSubListService.getAllPickSublistByCustomPalletNumber(inwardListId, customPalletNumber, function (err, inwardSubListRecords) {
                    if (err) {

                        callbackDone(err);
                    } else {

                        async.eachSeries(inwardSubListRecords, function (element2, callbackDone2) {

                            var inwardSubListId = String(element2._id);

                            var object = {};
                            object.inwardListId = element.inwardListId;
                            object.inwardSubListId = inwardSubListId;
                            object.name = element.name;
                            object.hopperSequence = element.hopperSequence;
                            object.hopperPriority = element.hopperPriority;

                            finalResultArray.push(object);
                            setImmediate(callbackDone2);

                        }, function (err) {

                            customPalletNumberArray.push(customPalletNumber);
                            setImmediate(callbackDone);
                        });
                    }
                });
            }
        }, function (err) {
            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('6', finalResultArray);
            }
        });
    });
    // Filter and set result object for one to many at picklist to lineitems level
    flowController.on('6', function (resultArray) {

        (consoleVar) ? console.log('6') : '';
        //(consoleVar) ? console.log(resultArray) : '';

        updatedArray = [];
        picklistIdArray = [];

        async.eachSeries(resultArray, function (element, callbackDone) {

            var inwardListId = element.inwardListId;

            var temp = [];

            async.eachSeries(resultArray, function (element, callback2Done) {

                if (inwardListId == element.inwardListId) {

                    temp.push(element.inwardSubListId);
                    setImmediate(callback2Done);
                } else {

                    setImmediate(callback2Done);
                }
            }, function (err) {

                if (err) {

                    callbackDone(err);
                } else {

                    if (picklistIdArray.indexOf(inwardListId) == -1) {

                        var data = {
                            inwardListId: inwardListId,
                            inwardSubListId: temp,
                            name: element.name,
                            hopperSequence: element.hopperSequence,
                            hopperPriority: element.hopperPriority,
                        };
                        updatedArray.push(data);
                        picklistIdArray.push(inwardListId);
                        setImmediate(callbackDone);
                    } else {

                        setImmediate(callbackDone);
                    }
                }
            });

        }, function (err) {

            if (err) {

                flowController.emit('ERROR', err);
            } else {

                flowController.emit('7', updatedArray, resultArray.length);
            }
        });
    });
    // Update device capacity
    flowController.on('7', function (updatedArray, resultArray) {

        (consoleVar) ? console.log('7') : '';
        (consoleVar) ? console.log(updatedArray) : '';
        //(consoleVar) ? console.log(resultArray) : '';

        if (updatedArray.length == 0) {

            flowController.emit('ERROR', {message: 'Currently, No suitable line items matching to your device MHE available for Pick!', status: 'error', 'statusCode': '404'});
        } else {
            //requestfy API SEND
            var requestifyUrl = baseUrl + '/v1/deviceMaster/web/device/configuration/update/target-capacity/picklist/';

            requestify.post(requestifyUrl, {'inwardListArray': updatedArray, inwardSubListCount: resultArray, 'deviceId': deviceId, 'userId': userId}).then(function (response) {

                var result = response.getBody();

                if (result.status === 'success') {

                    flowController.emit('END', {message: 'Picklist assigned.', status: 'success', 'statusCode': '200'});
                }

                if (result.status === 'error') {

                    flowController.emit('ERROR', result);
                }
            });
        }
    });
    // END
    flowController.on('END', function (result) {

        (consoleVar) ? console.log('END') : '';
        (consoleVar) ? console.log(result) : '';
        global.lockAssignment = 'NO';
        servicecallback(result);
    });
    // ERROR
    flowController.on('ERROR', function (error) {

        (consoleVar) ? console.log('ERROR') : '';
        (consoleVar) ? console.log(error) : '';

        global.lockAssignment = 'NO';
        servicecallback(error);
    });
    // Initialize
    flowController.emit('START');
};
//
//
module.exports = inwardListService;