//This collection will contain the Master Configuration for the category of the item
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var itemCategorySchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    name: {type: String, index: true}, // Name of the category
    timeCreated: Number, // time Record added
    createdBy: String,
    timeModified: Number, // Time the category modified.
    modifiedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only) 
});

module.exports = connections[dbConfName].model("itemMaster-itemCategory", itemCategorySchema, 'itemMaster-itemCategories'); // Object - Its modeling - Its collection nam