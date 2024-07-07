var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var zoneMasterSchema = mongoose.Schema({
    areaId: {type: String, index: true}, // MongoId of the Area under whom the zone present
    numberOfLine: { type: Number, default: 0 },
    isReservedForCategory: { type: String, default: 'NO' }, // YES,NO
    reservedCategoryId: String, //mongoId
    isReservedForSubCategory: { type: String, default: 'NO' }, // YES,NO
    reservedSubCategoryId: [], //mongoId
    isReservedForItem: { type: String, default: 'NO' }, // YES,NO
    reservedItemId: [], //MongoId
    reservedBy: String,
    timeReserved: Number,
    zone: String, // User defined zone name
    zoneCode: Number, // System defined zone code 01
    zoneCodeString: String, // System defined zone code 01
    availability: { type: String, default: 'A' }, // B,A 
    function: String, // DOCK/RMA/SCRAP/BLOCK(Blocked)
    comments: String, // If blocked, the reaon for blocked
    timeCreated: Number,
    createdBy: String,
    timeModified: Number,
    modifiedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-zoneMaster", zoneMasterSchema, 'locationMaster-zoneMasters'); // Object - Its modeling - Its collection name