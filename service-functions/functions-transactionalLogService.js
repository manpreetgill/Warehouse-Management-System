var async = require('async');

var transactionalLogsModel = require('../models/transactionalLogs/collection-transactionalLogs');
var putSubListModel = require('../models/mongodb/processMaster-putSubList/collection-putSubList');
var pickSubListModel = require('../models/mongodb/processMaster-pickSubList/collection-pickSubList');

var functions_transactionalLogService = {};

functions_transactionalLogService.initial = function (processCode, date, timeCreated, data, callback) {

    async.eachSeries(data, function (element, asynccallback) {

        var Model = (element.activityType == 'PICK') ? pickSubListModel : putSubListModel;

        transactionalLogModel = new transactionalLogsModel();

        transactionalLogModel.warehouseId = element.warehouseId;
        transactionalLogModel.itemMasterId = element.itemMasterId;
        transactionalLogModel.itemCode = element.itemCode;
        transactionalLogModel.itemType = element.itemType;
        transactionalLogModel.itemValue = element.itemValue;
        transactionalLogModel.activity = element.activity;//
        transactionalLogModel.lotAddress = element.lotAddress;//
        transactionalLogModel.listId = element.listId;
        transactionalLogModel.subListId = element.subListId;
        transactionalLogModel.activityType = element.activityType;
        transactionalLogModel.date = date;// sent via switch
        transactionalLogModel.timeCreated = timeCreated;// sent via switch
        transactionalLogModel.processCode = processCode;//sent via switch

        transactionalLogModel.save(function (err, transactionId) {
            if (err) {
                asynccallback(err);
            } else {

                var query = {'_id': element.subListId};
                var update = {'transactionalLogId': String(transactionId._id)};

                Model.update(query, update, function (err) {
                    if (err) {
                        asynccallback(err);
                    } else {
                        setImmediate(asynccallback);
                    }
                });
            }
        });
    }, function (err) {

        if (err) {
            callback(null);
        } else {
            callback(null);
        }
    });
};

functions_transactionalLogService.clone = function (data, callback) {

    transactionalLogsModel.findOne({'_id': data.transactionalId, 'activeStatus': 1}, function (err, transactionalLogsRecord) {

        if (err) {

            callback(err);
        } else if (transactionalLogsRecord == null) {
            console.log('Transactional log not found');
            callback(null);
        } else {

            transactionalLogModel = new transactionalLogsModel();

            transactionalLogModel.warehouseId = transactionalLogsRecord.warehouseId;
            transactionalLogModel.itemMasterId = transactionalLogsRecord.itemMasterId;
            transactionalLogModel.itemCode = transactionalLogsRecord.itemCode;
            transactionalLogModel.itemType = transactionalLogsRecord.itemType;
            transactionalLogModel.itemValue = transactionalLogsRecord.itemValue;
            transactionalLogModel.activity = data.activity;//
            transactionalLogModel.lotAddress = data.lotAddress;//
            transactionalLogModel.listId = transactionalLogsRecord.listId;
            transactionalLogModel.subListId = transactionalLogsRecord.subListId;
            transactionalLogModel.activityType = transactionalLogsRecord.activityType;
            transactionalLogModel.date = data.date;// sent via switch
            transactionalLogModel.timeCreated = data.timeCreated;// sent via switch
            transactionalLogModel.processCode = data.processCode;//sent via switch

            transactionalLogModel.save(function (err) {
                if (err) {
                    console.log('Error while adding transaction data');
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }
    });
};

module.exports = functions_transactionalLogService;