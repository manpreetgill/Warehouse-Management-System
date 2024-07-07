var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var locationSchema = mongoose.Schema({
    clientId: String, // MongoId of client to which this warehouse belongs
    numberOfArea: {type: Number, default: 0},
    name: String, // Name of the warehouse
    configName: String,
    type: String, // MTW/OTW MTW-Manufacturingline to warehouse, OTW-Outside location to warehouse(To be configured at the time of warehouse configuration)
    endOfWorkAlert: Number, // Time on minutes before which the alert : the work time is about to end & do all activity within the given time 
    timeCreated: Number,
    createdBy: String,
    timeModified: Number,
    modifiedBy: String,
    autoBackLogTimeHours: String,
    autoBackLogTimeMinutes: String,
    manualBacklog: String, // YES/NO
    autoBacklog: String, // YES/NO
    cronActivated: String, //Activated Cron 
    warehouseKPI_alert_interval:Number,
    userTarget_alert_interval:Number,
    activityOverdue_alert_buffer:Number,
    warehouseKPI_alert_time:Number,
    userTarget_alert_time:Number,
    activityOverdue_alert_interval:Number,
    activityOverdue_alert_time:Number,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    targetBackOrder: {type: Number, default: 0},
    targetInventoryHandPrice: {type: Number, default: 0},
    targetInventoryHandWeight: {type: Number, default: 0},
    targetOrderCompletion: {type: Number, default: 0},
    targetOrderCycleTime: {type: Number, default: 0},
    targetOrderFillRate: {type: Number, default: 0},
    targetPickLines: {type: Number, default: 0},
    targetPutLines: {type: Number, default: 0},
    targetWarehouseUtilization: {type: Number, default: 0},
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});
module.exports = connections[dbConfName].model("locationMaster-warehouseMaster", locationSchema, 'locationMaster-warehouseMasters'); // Object - Its modeling - Its collection name