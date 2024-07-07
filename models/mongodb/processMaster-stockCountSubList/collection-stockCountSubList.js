var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

// Out of a particular product, what we required & how we required, This schema will define it
var stockCountSubListSchema = mongoose.Schema({
    stockCountListId: String, // MongoId of the picklist collection record
    locationStoreId: String, // Location where the item 
    itemMasterId: String, // MongoId of the item master collection where that item with the respective item code has been stored 
    itemCode: String, // Item code from UI.
    type: String, // ITEM/LOCATION ITEM - Itemwise (1 item multiple location(records)) || Locationwise (1 location multiple items(records))
    virtualItemStoreId: [], // MongoId of the items from virtualItemStore where the item kept initially before placing it to location 
    requiredQuantity: Number, // Quantity provided by server to be picked from location
    scannedQuantity: String, // android user input to make sure the quantity picked is same as that of required from that location
    sequence: Number, // The sequence would keep incrementing w.r.t the number of items keep adding to the picklist and after autoroute or manual route the sequencing would change
    syncStatus: Number, // 1 - Created But not send to mobile, 2 - Created and sent to mobile, 3 - Has new update to send
    status: { type: Number, default: 0 }, // 0 - PENDING, 1 - INPROGRESS, 2 - MATCHED, 3 - MISMATCHED, 4 - STOPPED(If pick order came), 5 - Backlog
    skipReason: String, // Reason to skip the process
    uniqueId: String, // Unique id for checking the update status of android device for receiving update (MQTT side)
    acknowledgement: String, // If android side uniqueId and this uniqueId matches then acknowledgement would be YES
    timeCreated: { type: Number, default: timeInInteger },
    createdBy: String, // MongoId of the person created the putlist
    timeAssigned: { type: Number, default: 0 }, // Time the picklist assigned to resource
    assignedBy: String, // MongoId of the person completed the putlist
    timeStarted: { type: Number, default: 0 }, // Time the picklist work started or work in progress
    startedBy: String, // MongoId of the person completed the putlist
    timeEnded: { type: Number, default: 0 }, // Time the picklist work ended with last status or picklist
    endedBy: String, // MongoId of the person completed the putlist
    timeBacklogged: String, // If the activity not completed on that day then the time activity backloged
    backloggedBy: String, // MongoId of the user who will update status as backlog | SYSTEM if by system script 
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("transactionalData-stockCountSubList", stockCountSubListSchema, 'transactionalData-stockCountSubLists'); // Object - Its modeling - Its collection name