var async = require('async');
var requestify = require('requestify');

var pickListModel = require('../models/mongodb/processMaster-pickList/collection-pickList');
var pickSubListModel = require('../models/mongodb/processMaster-pickSubList/collection-pickSubList');

var function_pickListService = {};

// Get picklist details
function_pickListService.getPicklistData = function (pickListId, callback) {

    pickListModel.findOne({'_id': pickListId, 'activeStatus': 1}, function (err, pickListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickListRow == null) {

            callback({message: 'Data missing! Picklist modified/deleted from the system!', status: 'error', statusCode: '304'});
        } else {

            callback(null, pickListRow);
        }
    });
};

// Get picklist data by date (For date based picklists only)
function_pickListService.getPicklistDataByDate = function (pickListId, callback) {

    pickListModel.findOne({'_id': pickListId, '$or': [{'status': 1}, {'status': 5}], 'activeStatus': 1}, function (err, pickListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickListRow == null) {

            callback({message: 'Data missing! Picklist modified/deleted from the system!', status: 'error', statusCode: '304'});
        } else {

            callback(null, pickListRow);
        }
    });
};

// Check if initial lot already assgned to device
function_pickListService.checkIfInitialLotAlreadyAssigned = function (deviceId, baseUrl, callback) {

    var url = baseUrl + '/v1/processMaster/web/pickList/configuration/get/description/' + deviceId + '/';

    requestify.get(url).then(function (response) {

        var result = response.getBody();

        if (result.status === 'success') {
            console.log('Picklist length: ' + result.data.length);
            if (result.data.length === 0) {

                callback(null, 'NOTASSIGNED');
            } else {

                callback(null, 'ASSIGNED');
            }
        }

        if (result.status === 'error') {

            callback(null, 'NOTASSIGNED');
        }
    });
};

// Get all picklist data by activated sequence in ascending order
function_pickListService.getAllPicklistDataByActivatedSequenceAscending = function (callback) {

    var pickListHighPriority = [];

    pickListModel.find({'status': {$in: [5, 11]}, 'activeStatus': 1}).sort({'hopperPriority': 1, 'hopperSequence': 1}).exec(function (err, pickListRow) {

        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickListRow.length == 0) {

            callback({message: 'There are no activated picklist\'s available.', status: 'error', statusCode: '404'});
        } else {

            async.eachSeries(pickListRow, function (element, asynccallback) {

                var data = {
                    pickListId: element._id,
                    name: element.name,
                    hopperSequence: element.hopperSequence,
                    hopperPriority: element.hopperPriority
                };
                pickListHighPriority.push(data);
                setImmediate(asynccallback);

            }, function (err) {
                if (err)
                    callback(err);
                else
                    callback(null, pickListHighPriority);
            });
        }
    });
};

// Get all picklist data by activated sequence
function_pickListService.getAllPicklistDataByActivatedSequence = function (callback) {

    var activatedArray = [];

    pickListModel.find({'status': 11, 'activeStatus': 1}).sort({'hopperSequence': -1}).exec(function (err, pickListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickListRow.length == 0) {

            callback(null, activatedArray);
        } else {

            async.eachSeries(pickListRow, function (element, asynccallback) {

                activatedArray.push(element.hopperSequence);
                setImmediate(asynccallback);

            }, function (err) {
                if (err)
                    callback(err);
                else
                    callback(null, activatedArray);
            });
        }
    });
};

// Get pending pick line items count specific to device 
function_pickListService.getTotalPendingPickSubListByDeviceId = function (deviceId, callback) {

    var totalUnassignedLineItems = 0;

    pickListModel.find({'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'status': {$nin: [31, 35]}}}, 'activeStatus': 1}, {'name': 1, 'pickRate': 1, 'resourceAssigned.$': 1, 'timeCreated': 1}).sort({'timeCreated': 1}).exec(function (err, pickListModelRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickListModelRow.length == 0) {

            callback(null, 0);
        } else {

            async.eachSeries(pickListModelRow, function (element2, callback2) {

                var resourceAssigned = element2.resourceAssigned;

                async.eachSeries(resourceAssigned, function (element, callback3) {

                    pickSubListModel.find({'pickListId': String(element2._id), 'resourceAssigned.deviceId': deviceId, 'resourceAssigned.lot': element.lot, 'status': {$nin: [31, 35]}, 'reasonToForceDone': {$exists: false}, 'activeStatus': 1}, function (err, pickSubListModelRow) {
                        if (err) {

                            callback3(err);
                        } else {

                            totalUnassignedLineItems = totalUnassignedLineItems + pickSubListModelRow.length;
                            setImmediate(callback3);
                        }
                    });
                }, function (err) {
                    if (err) {

                        callback2(err);
                    } else {

                        setImmediate(callback2);
                    }
                });
            }, function (err) {
                if (err) {

                    callback(err);
                } else {

                    callback(null, totalUnassignedLineItems);
                }
            });
        }
    });
};

// Update picklist status to activated
function_pickListService.updatePicklistStatusToActivated = function (pickListId, newSequence, callback) {

    var query = {'_id': pickListId, 'activeStatus': 1};
    var update = {'$set': {'status': 11, 'hopperSequence': parseInt(newSequence)}};

    pickListModel.update(query, update, function (err) {
        if (err) {
            // error while adding records
            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else {

            callback(null, newSequence);
        }
    });
};

// Update picklist to in progress
function_pickListService.updatePicklistStatusToInProgress = function (pickListId, pickListRecord, timeInInteger, startedBy, callback) {

    pickSubListModel.find({'pickListId': pickListId, 'status': {'$lt': 25}, 'activeStatus': 1}, function (err, pickSubListRecords) {

        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else {

            var query = {'_id': pickListId, 'activeStatus': 1};
            var update = '';

            if (pickSubListRecords.length == 0) {// No line items pending for be in progress

                if ('timeStarted' in pickListRecord && pickListRecord.timeStarted != undefined) {// Time started not present 

                    update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};
                } else {

                    update = {'$set': {'status': 25}};
                }
            } else {// Line items still to be in progress

                if ('timeStarted' in pickListRecord && pickListRecord.timeStarted != undefined) {// Time started not present 

                    update = {'$set': {'timeStarted': timeInInteger, 'startedBy': startedBy}};
                }
            }

            if (update == '') {

                callback(null);
            } else {

                pickListModel.update(query, update, function (err) {
                    if (err) {

                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        callback(null);
                    }
                });
            }
        }
    });
};

// Update resource start time to picklist
function_pickListService.updateResourceStartTimeToPicklist = function (pickListId, deviceId, lot, timeInInteger, startedBy, callback) {

    pickListModel.findOne({'_id': pickListId, 'resourceAssigned.deviceId': deviceId, 'resourceAssigned.lot': lot}, function (err, pickListRecord) {

        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (pickListRecord == null) {

            callback({message: "No picklist found.", status: 'error', statusCode: '404'});
        } else {

            var query = {'_id': pickListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
            var update = {'$set': {'resourceAssigned.$.status': 25, 'resourceAssigned.$.timeStarted': timeInInteger, 'resourceAssigned.$.startedBy': startedBy}};

            pickListModel.update(query, update, function (err) {
                if (err) {

                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else {

                    callback(null);
                }
            });
        }
    });
};

module.exports = function_pickListService;