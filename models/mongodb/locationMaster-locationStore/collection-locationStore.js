// This collection will store the item and we need to update sequenceId when location delete occurs
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var locationStoreSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, //MongoId of the warehouse
    areaId: {type: String, index: true}, // MongoId of the area.
    zoneId: {type: String, index: true}, // MongoId of the zone.
    lineId: {type: String, index: true}, // MongoId of the line.
    levelId: {type: String, index: true}, // MongoId of the level master where the locations are present.
    sideId: {type: String, index: true}, // MongoId of the side master from where the reference to locations have been taken & locations created subsequently
    materialHandlingUnitId: [], // MongoId of the specific material from Material Handling Master configuration
    systemAddress: {type: String, index: true}, // System will define address by its calculation
    systemAddressCode: Number, // For internal use...check for the last system address while adding one by one location
    customerAddress: {type: String, index: true}, // Customer will define address via excel sheet (It will be treated as location barcode)
    palletNumbers: [], // Pallet numbers present at this location (Currently for Inventory import use only)
    outerPalletNumbers: [], // Outer Pallet numbers present at this location (Currently for Inventory import use only)
    customPalletNumbers: [], // Custom Pallet numbers present at this location (Currently for Inventory import use only)
    locationProperties: [
        {
            userDefinedCapacity: String, // User will define the capacity of location
            maxLength: String, // Maximum length of location
            maxWidth: String, // Maximum depth of location
            maxHeight: String, // Maximum height of location
            maxWeight: String, // Maximum weight allowed for location
            minLength: String, // Minimum length of item allowed at location 
            minWidth: String, // Minimum width of item of location
            minHeight: String, // Minimum height of object allowed at location
            minWeight: String, // Minimum weight allowed at location
            maxDiameter: String,
            minDiameter: String
        }
    ], // Location Properties collection details where the properties of the location defined
    holdingType: String,
    availability: {type: String, default: 'A'}, // B,A
    comments: String, // If availability=B, the reason for blocked
    function: String, // DOCK/RMA/SCRAP
    isReservedForCategory: {type: String, default: 'NO'}, // YES,NO
    reservedCategoryId: String, //mongoId
    isReservedForSubCategory: {type: String, default: 'NO'}, // YES,NO
    reservedSubCategoryId: [], //mongoId
    isReservedForItem: {type: String, default: 'NO'}, // YES,NO
    reservedItemId: [], //MongoId
    reservedBy: String,
    timeReserved: Number,
    assignedItemStoreId: [], // MongoId of the item(MongoId of record from itemStore collection) currently assigned or present
    availableCapacity: Number, // Item quantity available at this location after putting item (User defined capacity)
    sequenceId: Number, // This would be assigned in case user defined sequencing arrives
    timeCreated: Number,
    createdBy: String,
    timeModified: Number,
    modifiedBy: String,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});



module.exports = connections[dbConfName].model("transactionalData-locationStore", locationStoreSchema, 'transactionalData-locationStores'); // Object - Its modeling - Its collection name