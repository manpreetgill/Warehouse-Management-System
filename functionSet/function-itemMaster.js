var itemStoresModel = require('../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var itemMasterModel = require('../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');

var itemCategoryModel = require('../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategoryModel = require('../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');

//var locationStoreModel = require('../models/mongodb/locationMaster-locationStore/collection-locationStore.js');

var function_itemMaster = {

    getCategoryCombinationsOfItem: function (category, subcategory, callback) {

        var combinationArray = [];

        itemCategoryModel.findOne({'_id': category, 'activeStatus': 1}, function (err, itemCategoryRow) {

            combinationArray.push(itemCategoryRow.name);

            if (subcategory.length != 0) {

                subcategory.forEach(function (element) {

                    itemSubCategoryModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemSubCategoryRow) {

                        if (combinationArray.length === (subcategory.length + 1)) {

                            callback(null, combinationArray);
                        }
                    });
                });
            } else {

                callback(null, combinationArray);
            }
        });
    }

};


module.exports = function_itemMaster;
