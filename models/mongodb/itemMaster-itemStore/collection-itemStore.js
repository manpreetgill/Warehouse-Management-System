// This collection will store the items with their quantity that entered into the warehouse
// When master configured the fields required to be their at the time this item arrives to warehouse. we get this infoemation or we
// need this information as per master direction
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var itemStoreSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    itemMasterId: {type: String, index: true}, // MongoId of the item in itemmaster
    locationStoreId: {type: String, index: true}, // The location where this item stored in system
    previousLocationStoreId: String, // The location where this item stored previously in system
    virtualLocationStoreId: String, // The VirtualLocationStoreId where the item virtually stored because it has got missed out from inventory/ is arrived into warehouse from manufacturing line & not placed at itemStore 
    lotAddress: {type: String, index: true}, // Unique lot address for item box ddmmyyAA0000   
    date: String,
    salesOrderNumber: Number, // No of the sales order against which the tracking of all the items against that sales order done
    timeSalesOrderAssigned: Number, // Time when sales order assigned to item
    customPalletNumber: {type: String, index: true}, // In case where pallet doesnot have barcode, system will provide number to it(Put Outer)
    palletNumber: {type: String, index: true}, // If the holdingType of item in item master is pallet then the pallet number must be specified.
    inTransit: String, // If the item quantity broken and new lot address for quantity of SALE assigned, then new record will be created in itemStore with all these fields and just the lotAddress will change & that lot will be in transit state till it reaches to drop location
    itemQuantity: Number, // It will define the number of item that is coming in a box
    flags: [], // Flags applicable to item while under visual inspection. If no flags then item is good to go/dispatch 
    overflowAutoAssign: String, // YES/NO if allowed to assign open location then it will follow the algorithm to assign location & if no the it will ask to reserve location for item and then assign it
    exclusiveStorage: String, // From master
    itemSerialNumber: {type: String, index: true}, // This is unique serial number that differentiats two items of same model which are different physically
    manufacturingDate: String, //Date when it is manufactured (Specially required when dispatch rule is FMFO)
    randomFields: [], // Extra fields required by client/ that comes with SAP Report
    expiryDate: String, // Date if expiry (Specially required when dispatch rule is FEFO)
    alertDate: String, // Date after which or before which he wants alert for the product (Alert if product is in warehouse for more than 200days) (Need to calculate based on inputs)
    timeCreated: Number, // time Record added
    stockCount: {type: Number, default: 0}, // Count of number of times stockcount done for this item
    currentActivityStatus: String, // Status of the current activity of that item INWARD/INWARD COMPLETED likewise for each process
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-itemStore", itemStoreSchema, 'transactionalData-itemStores'); // Object - Its modeling - Its collection name