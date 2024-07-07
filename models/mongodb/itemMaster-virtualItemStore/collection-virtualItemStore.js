//This collection will store the items with their quantity that got missed out from inventory of the warehouse
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var virtualItemStoreSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    itemMasterId: String, // Incremental address assigned by system against which the item to be tracked in the warehouse
    previousLocationStoreId: String, // The location where this item stored previously in system
    virtualLocationStoreId: String, // The VirtualLocationStoreId where the item virtually stored because it has got missed out from inventory/ is arrived into warehouse from manufacturing line & not placed at itemStore 
    lotAddress: String, // Unique lot address for item box ddmmyyAA0000 
    palletNumber: String, // If the holdingType of item in item master is pallet then the pallet number must be specified.
    inTransit: String, // If the item quantity broken and new lot address for quantity of SALE assigned, then new record will be created in itemStore with all these fields and just the lotAddress will change & that lot will be in transit state till it reaches to drop location	
    itemQuantity: Number, // It will define the number of item that is coming in a box
    allowAssignOpenLocation: String, // YES/NO if allowed to assign open location then it will follow the algorithm to assign location & if no the it will ask to reserve location for item and then assign it
    itemSerialNumber: Number, // This is unique serial number that differentiats two items of same model which are different physically
    manufacturingDate: String, //Date when it is manufactured (Specially required when dispatch rule is FMFO)
    randomFields: [{// Extra fields required by client/ that comes with SAP Report

        }],
    expiryDate: String, // Date if expiry (Specially required when dispatch rule is FEFO)
    alertDate: String, // Date after which or before which he wants alert for the product (Alert if product is in warehouse for more than 200days)
    timeCreated: Number, // time Record added
    createdBy: String, // 
    stockCount: String, // YES/NO stockcount done or not. If done the update all the records
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1}
});

module.exports = connections[dbConfName].model("itemMaster-virtualItemStore", virtualItemStoreSchema, 'itemMaster-virtualItemStores'); // Object - Its modeling - Its collection name