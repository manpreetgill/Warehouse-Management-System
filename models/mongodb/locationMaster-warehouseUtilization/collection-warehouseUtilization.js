var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var warehouseUtilizationSchema = mongoose.Schema({
 clientId: String,
 warehouseId: String,
 timeCreated: Number,
 date: String,
 orderCycleTimePerHour: Number,
 totalBackOrders: Number,
 onTimeShipment: Number,
 linesPickedPerHour: Number,
 percentageUtilization: Number,
 weightedUtilization: Number,
 warehouseUtilization: [],
 percentageOrderFillRate:Number,
 linesPickedPerHourPerOperator:Number,
 todayProductiveHours:Number,
 productiveHoursPerOperator:Number,
 itemSkipped:Number,
 putAwayPerHour:Number,
 putAwayPerHourPerOperator:Number,
 totalOrderNumber:Number,
 orderShippedPerHour:Number,
 version: {type: String, default: "v1"},
 activeStatus: {type: Number, default: 1}
});

module.exports = connections[dbConfName].model("locationMaster-warehouseUtilization", warehouseUtilizationSchema, 'locationMaster-warehouseUtilizations');
