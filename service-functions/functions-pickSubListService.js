var async = require('async');
var intersection = require('array-intersection');

var itemStoreModel = require('../models/mongodb/itemMaster-itemStore/collection-itemStore');
var pickSubListModel = require('../models/mongodb/processMaster-pickSubList/collection-pickSubList');
var transactionalLogService = require('../service-factory/transactionalLogService');

var function_pickSubListService = {};

function_pickSubListService.getPickSublistDataById = function (pickListId, callback) {

    pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickSubListRow.length == 0) {

            callback({message: 'No line item available in this Picklist!', status: 'error', statusCode: '304'});
        } else {

            callback(null, pickSubListRow);
        }
    });
};

function_pickSubListService.getAllActivatedPickSublistDataByPicklistId = function (pickListId, callback) {

    pickSubListModel.find({'pickListId': pickListId, 'status': 11, 'activeStatus': 1}).sort({'sequence': 1}).exec(function (err, pickSubListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickSubListRow.length == 0) {

            callback(null, 0);
        } else {

            callback(null, pickSubListRow);
        }
    });
};

function_pickSubListService.getAllPickSublistByCustomPalletNumber = function (pickListId, customPalletNumber, callback) {

    pickSubListModel.find({'pickListId': pickListId, 'itemType': 'PALLET', 'customPalletNumber': customPalletNumber, 'status': {'$lte': 11}, 'activeStatus': 1}, function (err, pickSubListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickSubListRow.length == 0) {

            callback({message: 'All OUTER pallets must belongs to same Picklist & should picked together! Partial PICK for OUTER pallets not allowed.', status: 'error', statusCode: '304'});
        } else {

            callback(null, pickSubListRow);
        }
    });
};

function_pickSubListService.updatePickSublistStatusToActivated = function (pickListId, newSequence, callback) {

    var query = {'pickListId': pickListId, 'status': {$in: [1, 5]}};
    var update = {'$set': {'status': 11, 'hopperSequence': newSequence}};
    var multi = {multi: true};

    pickSubListModel.update(query, update, multi, function (err) {
        if (err) {
            // error while adding records
            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else {

            callback(null);
        }
    });
};

function_pickSubListService.addTransactionalLogAfterActivationPicklist = function (warehouseId, pickListId, functioncallback) {

    pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListRecords) {

        if (err) {

            console.log('Error while getting lot addresses');
        } else {

            pickSubListObject = [];

            async.eachSeries(pickSubListRecords, function (element, callback) {

                var itemMasterId = '';
                var lotAddressArray = [];

                async.eachSeries(element.itemStoreId, function (element2, callback2) {

                    itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                        itemMasterId = itemStoreRow.itemMasterId;
                        lotAddressArray.push(itemStoreRow.lotAddress);
                        callback2();
                    });
                }, function (err) {
                    if (err) {

                        console.log('Error while getting lot addresses');
                    } else {

                        var object = {};
                        object.warehouseId = warehouseId;
                        object.itemMasterId = itemMasterId;
                        object.itemCode = element.itemCode;
                        object.itemType = element.itemType;
                        object.itemValue = element.itemValue;
                        object.lotAddress = lotAddressArray;
                        object.activity = 'PICK Activity, Pick location manually scanned';
                        object.listId = element.pickListId;
                        object.subListId = String(element._id);
                        object.activityType = 'PICK';

                        pickSubListObject.push(object);

                        setImmediate(callback);
                    }
                });

            }, function (err) {
                if (err) {

                    console.log('Error while getting lot addresses');
                } else {

                    transactionalLogService.addTransactionToLogs(2001, pickSubListObject, function (err, logsRecord) {
                        if (err) {

                            console.log('Error while getting lot addresses');
                        } else {

                            functioncallback(null);
                        }
                    });
                }
            });
        }
    });
};

function_pickSubListService.materialHandlingUnitValidationForItemCodeOnSelectedMHE = function (materialHandlingUnit, pickLocationMHE, itemMHE, dropLocationMHE, callback) {

    if (pickLocationMHE.length == 0 && itemMHE.length == 0 && dropLocationMHE.length == 0) {

        callback(null, 'ALL');
    } else if (pickLocationMHE.length == 0 && itemMHE.length == 0) {

        function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, dropLocationMHE, function (err, result) {
            if (result == 'ALL')
                callback(null, 'ALL');

            if (result == 'PARTIAL')
                callback(null, 'PARTIAL');
        });
    } else if (itemMHE.length == 0 && dropLocationMHE.length == 0) {

        function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, pickLocationMHE, function (err, result) {
            if (result == 'ALL')
                callback(null, 'ALL');

            if (result == 'PARTIAL')
                callback(null, 'PARTIAL');
        });
    } else if (pickLocationMHE.length == 0 && dropLocationMHE.length == 0) {

        function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, itemMHE, function (err, result) {
            if (result == 'ALL')
                callback(null, 'ALL');

            if (result == 'PARTIAL')
                callback(null, 'PARTIAL');
        });
    } else if (pickLocationMHE.length == 0) {

        var intersectionMHE = intersection(itemMHE, dropLocationMHE);
        if (intersectionMHE.length != 0) {

            function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, intersectionMHE, function (err, result) {
                if (result == 'ALL')
                    callback(null, 'ALL');

                if (result == 'PARTIAL')
                    callback(null, 'PARTIAL');
            });
        } else {
            callback(null, 'NONE');
        }
    } else if (itemMHE.length == 0) {

        var intersectionMHE = intersection(pickLocationMHE, dropLocationMHE);
        if (intersectionMHE.length != 0) {

            function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, intersectionMHE, function (err, result) {
                if (result == 'ALL')
                    callback(null, 'ALL');

                if (result == 'PARTIAL')
                    callback(null, 'PARTIAL');
            });
        } else {
            callback(null, 'NONE');
        }
    } else if (dropLocationMHE.length == 0) {

        var intersectionMHE = intersection(pickLocationMHE, itemMHE);
        if (intersectionMHE.length != 0) {

            function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, intersectionMHE, function (err, result) {
                if (result == 'ALL')
                    callback(null, 'ALL');

                if (result == 'PARTIAL')
                    callback(null, 'PARTIAL');
            });
        } else {
            callback(null, 'NONE');
        }
    } else {

        var intersectionMHE = intersection(pickLocationMHE, itemMHE, dropLocationMHE);
        if (intersectionMHE.length != 0) {

            function_pickSubListService.materialHandlingUnitValidationForSelectedMHE(materialHandlingUnit, intersectionMHE, function (err, result) {
                if (result == 'ALL')
                    callback(null, 'ALL');

                if (result == 'PARTIAL')
                    callback(null, 'PARTIAL');
            });
        } else {
            callback(null, 'NONE');
        }
    }
};

function_pickSubListService.materialHandlingUnitValidationForItemCode = function (pickLocationMHE, itemMHE, dropLocationMHE, callback) {

    if (pickLocationMHE.length == 0 && itemMHE.length == 0 && dropLocationMHE.length == 0) {

        callback(null, 'ALL');
    } else if ((pickLocationMHE.length == 0 && itemMHE.length == 0) || (itemMHE.length == 0 && dropLocationMHE.length == 0) || (pickLocationMHE.length == 0 && dropLocationMHE.length == 0)) {

        callback(null, 'ALL');
    } else if (pickLocationMHE.length == 0) {

        var intersectionMHE = intersection(itemMHE, dropLocationMHE);
        if (intersectionMHE.length != 0)
            callback(null, 'ALL');
        else
            callback(null, 'NONE');
    } else if (itemMHE.length == 0) {

        var intersectionMHE = intersection(pickLocationMHE, dropLocationMHE);
        if (intersectionMHE.length != 0)
            callback(null, 'ALL');
        else
            callback(null, 'NONE');
    } else if (dropLocationMHE.length == 0) {

        var intersectionMHE = intersection(pickLocationMHE, itemMHE);
        if (intersectionMHE.length != 0)
            callback(null, 'ALL');
        else
            callback(null, 'NONE');
    } else {

        var intersectionMHE = intersection(pickLocationMHE, itemMHE, dropLocationMHE);
        if (intersectionMHE.length != 0)
            callback(null, 'ALL');
        else
            callback(null, 'NONE');
    }
};

function_pickSubListService.materialHandlingUnitValidationForSelectedMHE = function (pickListMHE, intersectionMHE, callback) {

    notInArray = [];

    async.eachSeries(pickListMHE, function (element, asynccallback) {

        if (intersectionMHE.indexOf(element) == -1)
            notInArray.push(element);

        setImmediate(asynccallback);

    }, function () {
        if (notInArray.length == 0)
            callback(null, 'ALL');
        else if (notInArray.length == pickListMHE.length)
            callback(null, 'NONE');
        else
            callback(null, 'PARTIAL');
    });
};

module.exports = function_pickSubListService;