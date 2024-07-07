// These are predefined location properties which if same for two items (item's packaging) then could be fidectly added to their itemStore in embedded area
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var locationPropertiesSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    userDefinedCapacity: Number, // User will define the capacity of location
    maxLength: Number, // Maximum length of location
    maxWidth: Number, // Maximum depth of location
    maxHeight: Number, // Maximum height of location
    maxWeight: Number, // Maximum weight allowed for location
    minLength: Number, // Minimum length of item allowed at location 
    minWidth: Number, // Minimum width of item of location
    minHeight: Number, // Minimum height of object allowed at location
    minWeight: Number, // Minimum weight allowed at location
    diameter: Number, // If only cylindrical objects are allowed in location then diameter can be applicable
    buffer: String, // Percentage of buffer capacity we need not to consider for capacity calculation
    timeCreated: Number, // time Record added
    timeModified: Number, // Time the category modified.
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-locationProperty", locationPropertiesSchema, 'locationMaster-locationProperties'); // Object - Its modeling - Its collection name