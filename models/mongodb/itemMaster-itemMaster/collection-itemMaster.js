//This collection will contain the Master Configuration for the item coming to warehouse in future
// When that item arrives to warehouse then we basically have all the parameters against which we can check the item
// This configuration helps UI to show fields in the template as per the configuration given
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var itemMasterSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    category: String, // Category to which the item belongs to! Their can be multiple categories (It will store mongoId's of categories)
    subCategory: [], // Could be multiple in numbers MongoId of subcategory
    categoryCombinations: [], // Not decided yet
    measurementUnit: String, // Unit of measurement
    overflowAutoAssign: String, // YES/NO
    exclusiveStorage: String, // YES/NO location will be reserved for specific item only
    holdingType: String, // Type of holding PALLET/BAG(considered as box)/BOX/BARREL/BIN
    itemSpecification: String, // Basic specification of product 
    itemSystemSpecification: [],
    /* Item system specification */
    inwardRule: [],
    /* Array given below this schema */
    dispatchRule: String, //MongoId of rule from outwardRules collection
    itemCode: {type: String, index: true}, //  This is the part number which can be barcode of the product
    itemSerialNumber: String, // YES/NO This is unique serial number that differentiats two items of same model which are different physically
    barcode: String, // barcode is the sticker barcode number or it can be same as itemCode (Checkbox available in frontend to make it same)
    itemDescription: String, // Item description it's basically a textarea of text about item
    image: String, // Photo of the product
    priceValue: Number, // Price of item
    priceCurrency: String, // Currency of the price
    manufacturingDate: String, // YES/NO Date dropdown must be shown or not (Specially required when dispatch rule is FMFO)
    expiryDate: String, //  YES/NO Date dropdown must be shown or not (Specially required when dispatch rule is FEFO)
    alertDate: String, //  YES/NO Date dropdown must be shown or not Date after which or before which he wants alert for the product (Alert if product is in warehouse for more than 200days)
    alertDays: Number, // if alert date=YES then Alert from how many days?
    from: Number, // 1 - Manufacturing date, 2 - Expiry Date, 3 - Date of Inward
    handlingUnit: [], //How the product should be handled physically, by forktruck or by machine or by hands 
    pickAlert: String, // Handling instructions for that item like if glass - then alert will be "Handle with care"
    timeCreated: Number, // time Record added
    timeModified: Number, // Time the product arrived to warehouse
    createdBy: String,
    modifiedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("itemMaster-itemMaster", itemMasterSchema, 'itemMaster-itemMasters'); // Object - Its modeling - Its collection name

//Inward rules nested array
//{The innser object specification has nothing to do with schema 	
//inwardRuleId:String,// Rule Id of the Inward rule
//name:String,// name of the inward rule
//description:String,// description provided specific to this item
//samplingRate:String,// Rate of sampling for this item
//}

//Item system speciification
//{
//type:String, // Solid or cylindrical
//weight:Number, // In meter  (If type is solid)
//length:Number, // In meter (If type is solid)
//width:Number, // In meter (If type is solid)
//height:Number, // In meter (If type is solid)
//volume:Number, // volume (If type is cylindrical)
//diameter:Number, // Diameter (If type is cylindrical)
//minInventoryAlert:Number, // It will define the Minimum stock count alert after which he my ask for more samples to add in warehouse 
//maxInventoryAlert:Number, // It will define the Maximum stock count alert after which he may ask to stop adding samples to warehouse
//supersededItemNumber:Number, // If the item model is same but the version is newer then the new item will replace the position of old item in the same database by its serial number
//stockCountFrequency:Number, // Number of days in terms of frequency for making stock count
//stockCountQuantity:Number, // Quantity of auto stock count
//autoStockCount:{ type : Boolean, default: false}// Should the stock of this product be autocounted for inventory purposes or not?
//}