var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

// Out of a particular product, what we required & how we required, This schema will define it
var putSubListSchema = mongoose.Schema({
    putListId: {type: String, index: true}, // MongoId of the picklist collection record
    itemStoreId: [], // MongoId of the items from itemStore where the item kept in inventory initially before placing it to location 
    itemCode: String, // Item code from UI.
    palletNumber: String,
    palletSize: {type: String, index: true},
    palletType: {type: String, index: true},
    orderNumber: String,
    itemDescription: String,
    transactionalLogId: String,
    requiredQuantity: Number, // Quantity provided by server to be picked from location
    //putQuantity: String, // android user input to make sure the quantity picked is same as that of required from that location
    pickLocationId: String, // Location Id from location store
    pickLocationAddress: {type: String, index: true},
    pickedQuantity: Number, // android user input to make sure the quantity picked is same as that of required from that location
    dropLocationId: String, // Location Id where item to be put
    dropLocationAddress: {type: String, index: true}, // Customer address of location where item needs to be dropped
    sequence: Number, // The sequence would keep incrementing w.r.t the number of items keep adding to the picklist and after autoroute or manual route the sequencing would change
    syncStatus: {type: Number, default: 1}, // 1 - Created But not send to mobile, 2 - Created and sent to mobile, 3 - Has new update to send
    status: {type: Number, default: 1}, // 1 - Pending 25 - In progress 27 - Pending for drop 31 - Done 33 - Skip 41 - Backlog
    skipReason: String, // Reason to skip the process
    manualOverrideReason: [{
            dropLocation: String,
            reason: String,
            reasonType: String
        }], // Manually overriding reason
    uniqueId: String, // Unique id for checking the update status of android device for receiving update (MQTT side)
    acknowledgement: String, // If android side uniqueId and this uniqueId matches then acknowledgement would be YES
    timeCreated: Number, // Time put sub list created
    createdBy: String, // MongoId of the person created the putlist
    timeModified: Number, // Time putlist modified
    timeAssigned: Number, // Time the picklist assigned to resource
    assignedBy: String, // MongoId of the person completed the putlist
    timeStarted: Number, // Time the picklist work started or work in progress
    startedBy: String, // MongoId of the person completed the putlist
    timeEnded: Number, // Time the picklist work ended with last status or picklist
    endedBy: String, // MongoId of the person completed the putlist
    timeBacklogged: String, // If the activity not completed on that day then the time activity backloged
    backloggedBy: String, // MongoId of the user who will update status as backlog | SYSTEM if by system script 
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1}
});

module.exports = connections[dbConfName].model("transactionalData-putSubList", putSubListSchema, 'transactionalData-putSubLists'); // Object - Its modeling - Its collection name