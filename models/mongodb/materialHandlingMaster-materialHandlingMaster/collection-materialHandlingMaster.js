var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var materialHandlingMasterSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    name: {type: String, index: true}, // Name of material handling unit
    quantity: Number, // Available quantity of material handling unit
    availableQuantity: Number, // Once assigned to areas/zone the quantity will get decreased
    timeCreated: Number, //
    createdBy: String,
    modifiedBy: String,
    timeModified: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("transactionalData-materialHandlingMaster", materialHandlingMasterSchema, 'transactionalData-materialHandlingMasters'); // Object - Its modeling - Its collection name