//This collection will store all the avtivity logs for even a single change that occurs into system's existing database
var mongoose = require('mongoose');
var connections = require('../../db_connections/dbConnections');
var dbConfName = 'db-avancer';
var momenttimezone = require('moment-timezone');
var moment = require('moment');

var timezone = momenttimezone().tz(TIMEZONE).format(); // timezone in specific timezone
var time = moment(timezone).unix();
var timeInInteger = parseInt(time);

var systemLogSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    date: String, // Date in dd/mm/yyyy format
    timestamp: Number,
    userId: String, // MongoId of user in the system
    role: String, //Role of the user while doing activity
    processParentId: String, // Id of the document of the process parent collection from which the activity occurred
    processParentCollection: String, // Name of the collection where the activity occurred
    code: Number, // Code whith which the log has entered
    activity: String, // Text to be displayed as part of the activity
    timeCreated: { type: Number, default: timeInInteger },
    timeModified: { type: Number, default: 0 }, // Time the picklist assigned to resource
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("systemLog", systemLogSchema, 'systemLogs'); // Object - Its modeling - Its collection name