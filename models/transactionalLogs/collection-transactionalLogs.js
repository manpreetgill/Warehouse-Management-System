//This collection will store all the avtivity logs for even a single change that occurs into system's existing database
var mongoose = require('mongoose');
var connections = require('../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var transactionalLogsSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    itemMasterId: String, // Master configuration of item against which the quantity of item arrived to warehouse
    itemCode: String,
    itemType: String,
    itemValue: String,
    lotAddress: [],
    activity: String,
    listId: String,
    subListId: String,
    activityType: String, // pick completed/put completed
    date: String, // Date in dd/mm/yyyy format
    processCode: String, // Code with which the log has entered
    timeCreated: Number,
    activeStatus: { type: Number, default: 1 },
    version: { type: String, default: 'v1' }
});

module.exports = connections[dbConfName].model("transactionalLog", transactionalLogsSchema, 'transactionalLogs'); // Object - Its modeling - Its collection name