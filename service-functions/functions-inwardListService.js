var async = require('async');
var requestify = require('requestify');

var inwardListModel = require('../models/mongodb/processMaster-inwardList/collection-inwardList');
var inwardSubListModel = require('../models/mongodb/processMaster-inwardSubList/collection-inwardSubList');

var function_inwardListService = {};

// Get picklist details
function_inwardListService.getPicklistData = function (inwardListId, callback) {

    inwardListModel.findOne({'_id': inwardListId, 'activeStatus': 1}, function (err, inwardListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (inwardListRow == null) {

            callback({message: 'Data missing! Picklist modified/deleted from the system!', status: 'error', statusCode: '304'});
        } else {

            callback(null, inwardListRow);
        }
    });
};

// Get picklist data by date (For date based picklists only)
function_inwardListService.getPicklistDataByDate = function (inwardListId, callback) {

    inwardListModel.findOne({'_id': inwardListId, '$or': [{'status': 1}, {'status': 5}], 'activeStatus': 1}, function (err, inwardListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (inwardListRow == null) {

            callback({message: 'Data missing! Picklist modified/deleted from the system!', status: 'error', statusCode: '304'});
        } else {

            callback(null, inwardListRow);
        }
    });
};

// Check if initial lot already assgned to device
function_inwardListService.checkIfInitialLotAlreadyAssigned = function (deviceId, baseUrl, callback) {

    var url = baseUrl + '/v1/processMaster/web/inwardList/configuration/get/description/' + deviceId + '/';

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
function_inwardListService.getAllPicklistDataByActivatedSequenceAscending = function (callback) {

    var inwardListHighPriority = [];

    inwardListModel.find({'status': {$in: [5, 11]}, 'activeStatus': 1}).sort({'hopperPriority': 1, 'hopperSequence': 1}).exec(function (err, inwardListRow) {

        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (inwardListRow.length == 0) {

            callback({message: 'There are no activated picklist\'s available.', status: 'error', statusCode: '404'});
        } else {

            async.eachSeries(inwardListRow, function (element, asynccallback) {

                var data = {
                    inwardListId: element._id,
                    name: element.name,
                    hopperSequence: element.hopperSequence,
                    hopperPriority: element.hopperPriority
                };
                inwardListHighPriority.push(data);
                setImmediate(asynccallback);

            }, function (err) {
                if (err)
                    callback(err);
                else
                    callback(null, inwardListHighPriority);
            });
        }
    });
};

// Get all picklist data by activated sequence
function_inwardListService.getAllPicklistDataByActivatedSequence = function (callback) {

    var activatedArray = [];

    inwardListModel.find({'status': 11, 'activeStatus': 1}).sort({'hopperSequence': -1}).exec(function (err, inwardListRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (inwardListRow.length == 0) {

            callback(null, activatedArray);
        } else {

            async.eachSeries(inwardListRow, function (element, asynccallback) {

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
function_inwardListService.getTotalPendingPickSubListByDeviceId = function (deviceId, callback) {

    var totalUnassignedLineItems = 0;

    inwardListModel.find({'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'status': {$nin: [31, 35]}}}, 'activeStatus': 1}, {'name': 1, 'pickRate': 1, 'resourceAssigned.$': 1, 'timeCreated': 1}).sort({'timeCreated': 1}).exec(function (err, inwardListModelRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (inwardListModelRow.length == 0) {

            callback(null, 0);
        } else {

            async.eachSeries(inwardListModelRow, function (element2, callback2) {

                var resourceAssigned = element2.resourceAssigned;

                async.eachSeries(resourceAssigned, function (element, callback3) {

                    inwardSubListModel.find({'inwardListId': String(element2._id), 'resourceAssigned.deviceId': deviceId, 'resourceAssigned.lot': element.lot, 'status': {$nin: [31, 35]}, 'reasonToForceDone': {$exists: false}, 'activeStatus': 1}, function (err, inwardSubListModelRow) {
                        if (err) {

                            callback3(err);
                        } else {

                            totalUnassignedLineItems = totalUnassignedLineItems + inwardSubListModelRow.length;
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
function_inwardListService.updatePicklistStatusToActivated = function (inwardListId, newSequence, callback) {

    var query = {'_id': inwardListId, 'activeStatus': 1};
    var update = {'$set': {'status': 11, 'hopperSequence': parseInt(newSequence)}};

    inwardListModel.update(query, update, function (err) {
        if (err) {
            // error while adding records
            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else {

            callback(null, newSequence);
        }
    });
};

// Update picklist to in progress
function_inwardListService.updatePicklistStatusToInProgress = function (inwardListId, inwardListRecord, timeInInteger, startedBy, callback) {

    inwardSubListModel.find({'inwardListId': inwardListId, 'status': {'$lt': 25}, 'activeStatus': 1}, function (err, inwardSubListRecords) {

        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else {

            var query = {'_id': inwardListId, 'activeStatus': 1};
            var update = '';

            if (inwardSubListRecords.length == 0) {// No line items pending for be in progress

                if ('timeStarted' in inwardListRecord && inwardListRecord.timeStarted != undefined) {// Time started not present 

                    update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};
                } else {

                    update = {'$set': {'status': 25}};
                }
            } else {// Line items still to be in progress

                if ('timeStarted' in inwardListRecord && inwardListRecord.timeStarted != undefined) {// Time started not present 

                    update = {'$set': {'timeStarted': timeInInteger, 'startedBy': startedBy}};
                }
            }

            if (update == '') {

                callback(null);
            } else {

                inwardListModel.update(query, update, function (err) {
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
function_inwardListService.updateResourceStartTimeToPicklist = function (inwardListId, deviceId, lot, timeInInteger, startedBy, callback) {

    inwardListModel.findOne({'_id': inwardListId, 'resourceAssigned.deviceId': deviceId, 'resourceAssigned.lot': lot}, function (err, inwardListRecord) {

        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (inwardListRecord == null) {

            callback({message: "No picklist found.", status: 'error', statusCode: '404'});
        } else {

            var query = {'_id': inwardListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
            var update = {'$set': {'resourceAssigned.$.status': 25, 'resourceAssigned.$.timeStarted': timeInInteger, 'resourceAssigned.$.startedBy': startedBy}};

            inwardListModel.update(query, update, function (err) {
                if (err) {

                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else {

                    callback(null);
                }
            });
        }
    });
};

module.exports = function_inwardListService;