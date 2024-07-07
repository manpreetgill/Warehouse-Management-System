var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var materialHandlingComponentsSchema = mongoose.Schema({
    materialHandlingMasterId: {type: String, index: true}, // MongoId of the material handling master. Configuring will be for phase2 as per structired here
    barcode: Number, // Asset Address of the particular asset
    capacity: String, // The maximum capacity that it can load
    specification: String, // Free text
    maintenanceLog: String, // Maintenence information to be updated 
    workingAreaId: String, // Id of the working area location from area,zone,level etc
    timeCreated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("materialHandlingMaster-materialHandlingComponent", materialHandlingComponentsSchema, 'materialHandlingMaster-materialHandlingComponents'); // Object - Its modeling - Its collection name