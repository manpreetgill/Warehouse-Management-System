var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var pickSubListSchema = mongoose.Schema({
    pickListId: {type: String, index: true}, // MongoId of the picklist collection record
    reasonToForceDone: String, //forceFully done reason
    itemStoreId: [], // MongoId of the items from itemStore collection.
    pickedItemStoreId: [], // Items that are picked
    itemCode: {type: String, index: true}, // Item code from UI.
    palletType: {type: String, index: true}, // Required if itemType is PALLET
    palletSize: {type: String, index: true}, // Required if itemType is PALLET
    orderNumber: String,
    itemType: {type: String, index: true}, // ITEMCODE/PALLET/SERIALNUMBER
    itemValue: {type: String, index: true}, // valuse correspnding to above series
    customPalletNumber: String, // For outer case
    itemDescription: String,
    pickActivity: String, // PARTIAL/FULL
    hopperSequence: Number, //hopper sequence
    hopperPriority: Number, //hopper priority
    transactionalLogId: String, // Array of lot address
    serialNumberArray: [], // Applicable for ITEMCODE & SERIALNUMBER
    requiredQuantity: Number, // Quantity provided by server to be picked from location
    pickedQuantity: {type: Number, default: 0}, // android user input to make sure the quantity picked is same as that of required from that location
    pickLocationId: String, // Location MongoId from location store from where item to be picked
    pickLocationAddress: {type: String, index: true}, // Customer address of location where item kept
    dropLocationId: String, // Location MongoId where item to be put
    dropLocationAddress: {type: String, index: true}, // Customer address of location where item needs to be dropped
    sequence: Number, // The sequence would keep incrementing w.r.t the number of items keep adding to the picklist and after autoroute or manual route the sequencing would change
    resourceAssigned: [{
            deviceId: String,
            lot: Number
        }], // MongoId of the resource who is going to complete the task
    syncStatus: {type: Number, default: 1}, // 1 - Created But not send to mobile, 2 - Created and sent to mobile, 3 - Has new update to send
    status: {type: Number, default: 1}, // 1 - Unassigned,5 - Withdrawn (Retrive),11 - Activated,21 - Assigned (pending),25 - In progress,27 - Pending for drop,31 - Done,35 - Done - Skipped,37 - Done - Partial,41 - Backlog
    skipReason: String, // Reason to skip the process
    manualOverrideReason: [{
            dropLocation: String,
            reason: String,
            step: Number,
            time: Number
        }], // Manually overriding reason
    uniqueId: String, // Unique id for checking the update status of android device for receiving update (MQTT side)
    acknowledgement: String, // If android side uniqueId and this uniqueId matches then acknowledgement would be YES
    timeCreated: Number,
    createdBy: String, // MongoId of the person created the putlist
    timeModified: Number, // MongoId of the person modified the picklist
    modifiedBy: String, // MongoId of the person modified the putlist
    timeAssigned: Number, // Time the picklist assigned to resource
    assignedTo: String, // MongoId of the person completed the putlist
    timeStarted: Number, // Time the picklist work started or work in progress
    startedBy: String, // MongoId of the person completed the putlist
    timeEnded: Number, // Time the picklist work ended with last status or picklist
    endedBy: String, // MongoId of the person completed the putlist
    timeBacklogged: String, // If the activity not completed on that day then the time activity backloged
    backloggedBy: String, // MongoId of the user who will update status as backlog | SYSTEM if by system script 
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-pickSubList", pickSubListSchema, 'transactionalData-pickSubLists'); // Object - Its modeling - Its collection name