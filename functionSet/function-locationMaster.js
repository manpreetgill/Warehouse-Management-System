var itemStoresModel = require('../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var itemMasterModel = require('../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');

var locationStoreModel = require('../models/mongodb/locationMaster-locationStore/collection-locationStore.js');

var function_locationMaster = {
    combine: function (a, min) {
        var fn = function (n, src, got, all) {
            if (n == 0) {
                if (got.length > 0) {
                    all[all.length] = got;
                }
                return;
            }
            for (var j = 0; j < src.length; j++) {
                fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
            }
            return;
        };
        var all = [];
        for (var i = min; i < a.length; i++) {
            fn(i, a, [], all);
        }
        all.push(a);
        return all;
    },

    getCategoryCombinationsOfItem: function (itemStoreId) {

        itemStoresModel.findOne({'_id': itemStoreId, 'activeStatus': 1}, function (err, itemStoreRow) {

            itemMasterId = itemStoreRow.itemMasterId;

            itemMasterModel.findOne({'_id': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRow) {

                var combinationArray = [];
                combinationArray.push(itemMasterModel.category);
                combinationArray.concat(itemMasterModel.subCategory);

                return combinationArray;
            });
        });
    },

    getCategoryCombinations: function (category, subCategoryArray) {

        var combinationArray = [];
        combinationArray.push(category);
        combinationArray.concat(subCategoryArray);

        return combinationArray;
    },

    getLocationStoreData: function (locationStoreId) {

    var customObj = {};

        var locationStoreRow = locationStoreModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {

            customObj.zoneId = locationStoreRow.zoneId;

            return customObj;
        });
    }
};


module.exports = function_locationMaster;
