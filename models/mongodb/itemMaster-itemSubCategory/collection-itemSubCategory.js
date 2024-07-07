//This collection will contain the Master Configuration for the category of the item
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var itemSubCategorySchema = mongoose.Schema({
    itemCategoryId: String, // MongoId of item category
    name: {type: String, index: true}, // Name of the category
    timeCreated: Number, // time Record added
    timeModified: Number, // Time the category modified.
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("itemMaster-itemSubCategory", itemSubCategorySchema, 'itemMaster-itemSubCategories'); // Object - Its modeling - Its collection name