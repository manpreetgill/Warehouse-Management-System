var async = require('async');

var itemStoreModel = require('../models/mongodb/itemMaster-itemStore/collection-itemStore');
var pickSubListModel = require('../models/mongodb/processMaster-pickSubList/collection-pickSubList');

var function_itemStoreService = {};

function_itemStoreService.checkPickActivityByCustomPalletNumber = function (pickListId, customPalletNumber, callback) {

    itemStoreModel.find({'customPalletNumber': customPalletNumber, 'activeStatus': 1}).distinct('palletNumber', function (err, palletNumberArray) {
        if (err) {

            callback({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
        } else if (palletNumberArray.length == 0) {

            callback({message: 'Item store does not have items with this custom pallet number', status: 'error', statusCode: '304'});
        } else {

        //console.log(palletNumberArray);

            async.eachSeries(palletNumberArray, function (element, asynccallback) {
                //console.log(JSON.stringify({'pickListId': pickListId, 'itemType': 'PALLET', 'itemValue': element, 'status': {'$lte': 5}}));
                pickSubListModel.find({'pickListId': pickListId, 'itemType': 'PALLET', 'itemValue': element, 'status': {'$lte': 5}}, function (err, pickSubListRow) {
                    if (err) {

                        asynccallback({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow.length == 0) {
                        //console.log(element);
                        asynccallback({message: 'All OUTER pallets must belongs to same Picklist & should picked together! Partial PICK for OUTER pallets not allowed.', status: 'error', statusCode: '304'});
                    } else {

                        setImmediate(asynccallback);
                    }
                });
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }
    });
};

module.exports = function_itemStoreService;