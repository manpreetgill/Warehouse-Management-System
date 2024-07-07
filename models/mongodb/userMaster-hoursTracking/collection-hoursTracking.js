var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var hoursTrackingSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    date: String,
    userId: String,
    timeCreated:Number,
    activeTime: { type: Number, default: 0 },
    idleTime: { type: Number, default: 0 },
    version: { type: String, default: 'v1' },
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("transactionalData-hoursTracking", hoursTrackingSchema, 'transactionalData-hoursTrackings'); // Object - Its modeling - Its collection name