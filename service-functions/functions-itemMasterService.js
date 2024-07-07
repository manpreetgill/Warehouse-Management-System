var async = require('async');

var itemMasterModel = require('../models/mongodb/itemMaster-itemMaster/collection-itemMaster');

var function_pickSubListService = {};

function_pickSubListService.getItemMasterDataByItemCode = function (itemCode, callback) {

    itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {
        if (err) {

            callback({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
        } else if (itemMasterRow == null) {

            callback({message: 'Item master missing!', status: 'error', statusCode: '304'});
        } else {

            callback(null, itemMasterRow);
        }
    });
};




module.exports = function_pickSubListService;