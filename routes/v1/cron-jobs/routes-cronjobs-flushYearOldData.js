var express = require('express'); // MVC Framework
var router = express.Router();
var events = require('events');
var EventEmitter = events.EventEmitter;
var moment = require('moment'); //timestamp
var momenttimezone = require('moment-timezone');//timestamp zone
var cron = require('node-cron');
var async = require('async');
var round10 = require('round10').round10;
//------------------------------------------------------------------------------------------------------------------------
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts');
var transactionalLogsModel = require('../../../models/transactionalLogs/collection-transactionalLogs');
var customPalletNumbersModel = require('../../../models/mongodb/processMaster-customPalletNumber/collection-customPalletNumber');
var technicalDetailsModel = require('../../../models/mongodb/deviceMaster-technicalDetails/collection-technicalDetails.js')
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var alertService = require('../../../service-factory/alertService');
var areaAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation.js');
var deviceAllocationsModel = require('../../../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var warehouseUtilizationModel = require('../../../models/mongodb/locationMaster-warehouseUtilization/collection-warehouseUtilization');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
var measurementUnitModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var areaMasterModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMasterModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMasterModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var sideMastersModel = require('../../../models/mongodb/locationMaster-sideMaster/collection-sideMaster.js');
var virtualLocationsModel = require('../../../models/mongodb/locationMaster-virtualLocationStore/collection-virtualLocationStore.js');
var excelPathStoreModel = require('../../../models/mongodb/locationMaster-excelPathStore/collection-excelPathStore.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var dispatchRuleModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var inventoryComparisonModel = require('../../../models/mongodb/locationMaster-inventoryComparison/collection-inventoryComparison');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var userCategorysModel = require('../../../models/mongodb/userMaster-userCategory/collection-userCategory.js');

var cyberneticFilesModel = require('../../../models/mongodb/processMaster-cyberneticFiles/collection-cyberneticFiles.js');
var reasonMasterModel = require('../../../models/mongodb/reasonMaster-reasonMaster/collection-reasonMaster.js');
//---------------------------------------------------------------------------------------------------------------------------------
var functions_flushYearOldDataService = require('../../../service-functions/functions-flushYearOldData.js');
//---------------------------------------------------------------------------------------------------------------------------------
// # ┌────────────── second (optional)
// # │ ┌──────────── minute
// # │ │ ┌────────── hour
// # │ │ │ ┌──────── day of month
// # │ │ │ │ ┌────── month
// # │ │ │ │ │ ┌──── day of week
// # │ │ │ │ │ │
// # │ │ │ │ │ │
// # *  *  *  * *  *
//----------------------------------------------------------------------------------------------------------------------------
// Running task every minutes
//----------------------------------------------------------------------------------------------------------------------------
var task = cron.schedule('* * * * *', function () {

    var consoleLog = 1;
    console.log("hii");
    var flowController = new EventEmitter();

    // Get One year before timeStamp
    flowController.on('START', function () {

        (consoleLog) ? console.log('START') : '';

        var startTime = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
        var endTime = startTime - 31536000;

        flowController.emit('1', endTime);

    });

    // delete deviceAllocations data
    flowController.on('1', function (endTime) {

        (consoleLog) ? console.log('1') : '';
        console.log("endTime "+endTime);
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(deviceAllocationsModel,endTime,query);
        flowController.emit('2',endTime);
    });

    // delete areaAllocation data
    flowController.on('2', function (endTime) {

        (consoleLog) ? console.log('2') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(areaAllocationModel,endTime,query);
        flowController.emit('3',endTime);

    });

    // delete technicalDetails data
    flowController.on('3', function (endTime) {

        (consoleLog) ? console.log('3') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(technicalDetailsModel,endTime,query);
        flowController.emit('4',endTime);

    });

    // delete alerts data
    flowController.on('4', function (endTime) {

        (consoleLog) ? console.log('4') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(alertsModel,endTime,query);
        flowController.emit('5',endTime);

    });

    // delete holdingType data
    flowController.on('5', function (endTime) {

        (consoleLog) ? console.log('5') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(holdingTypeModel,endTime,query);
        flowController.emit('6',endTime);

    });

    // delete itemCategorys data
    flowController.on('6', function (endTime) {

        (consoleLog) ? console.log('6') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(itemCategorysModel,endTime,query);
        flowController.emit('7',endTime);

    });

    // delete itemMaster data
    flowController.on('7', function (endTime) {

        (consoleLog) ? console.log('7') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(itemMasterModel,endTime,query);
        flowController.emit('8',endTime);

    });

    // delete itemSubCategorys data
    flowController.on('8', function (endTime) {

        (consoleLog) ? console.log('8') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(itemSubCategorysModel,endTime,query);
        flowController.emit('9',endTime);

    });

    // delete areaMaster data
    flowController.on('9', function (endTime) {

        (consoleLog) ? console.log('9') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(areaMasterModel,endTime,query);
        flowController.emit('10',endTime);

    });

    // delete excelPathStore data
    flowController.on('10', function (endTime) {

        (consoleLog) ? console.log('10') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(excelPathStoreModel,endTime,query);
        flowController.emit('11',endTime);

    });

    // delete levelMaster data
    flowController.on('11', function (endTime) {

        (consoleLog) ? console.log('11') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(levelMasterModel,endTime,query);
        flowController.emit('12',endTime);

    });

    // delete lineMaster data
    flowController.on('12', function (endTime) {

        (consoleLog) ? console.log('12') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(lineMasterModel,endTime,query);
        flowController.emit('13',endTime);

    });

    // delete sideMasters data
    flowController.on('13', function (endTime) {

        (consoleLog) ? console.log('13') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(sideMastersModel,endTime,query);
        flowController.emit('14',endTime);

    });

    // delete virtualLocations data
    flowController.on('14', function (endTime) {

        (consoleLog) ? console.log('14') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(virtualLocationsModel,endTime,query);
        flowController.emit('15',endTime);

    });

    // delete warehouseUtilization data
    flowController.on('15', function (endTime) {

        (consoleLog) ? console.log('15') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(warehouseUtilizationModel,endTime,query);
        flowController.emit('16',endTime);

    });

    // delete measurementUnit data
    flowController.on('16', function (endTime) {

        (consoleLog) ? console.log('16') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(measurementUnitModel,endTime,query);
        flowController.emit('17',endTime);

    });

    // delete reasonMaster data
    flowController.on('17', function (endTime) {

        (consoleLog) ? console.log('17') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(reasonMasterModel,endTime,query);
        flowController.emit('18',endTime);

    });

    // delete cyberneticFiles data
    flowController.on('18', function (endTime) {

        (consoleLog) ? console.log('18') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(cyberneticFilesModel,endTime,query);
        flowController.emit('19',endTime);

    });

    // delete deviceMasters data
    flowController.on('19', function (endTime) {

        (consoleLog) ? console.log('19') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(deviceMastersModel,endTime,query);
        flowController.emit('20',endTime);

    });

    // delete devicesTracking data
    flowController.on('20', function (endTime) {

        (consoleLog) ? console.log('20') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(devicesTrackingModel,endTime,query);
        flowController.emit('21',endTime);

    });

    // delete locationStore data
    flowController.on('21', function (endTime) {

        (consoleLog) ? console.log('21') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(locationStoreModel,endTime,query);
        flowController.emit('22',endTime);

    });

    // delete materialHandlingMaster data
    flowController.on('22', function (endTime) {

        (consoleLog) ? console.log('22') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(materialHandlingMasterModel,endTime,query);
        flowController.emit('23',endTime);

    });

    // delete users data
    flowController.on('23', function (endTime) {

        (consoleLog) ? console.log('23') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(usersModel,endTime,query);
        flowController.emit('24',endTime);

    });

    // delete userCategorys data
    flowController.on('24', function (endTime) {

        (consoleLog) ? console.log('24') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(userCategorysModel,endTime,query);
        flowController.emit('25',endTime);

    });

    
   
    // delete itemStore data
    flowController.on('25', function (endTime) {

        (consoleLog) ? console.log('25') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(itemStoreModel,endTime,query);
        flowController.emit('26',endTime);

    });

    // delete deviceAllocations data
    flowController.on('26', function (endTime) {

        (consoleLog) ? console.log('26') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(pickListModel,endTime,query);
        flowController.emit('27',endTime);

    });

    // delete deviceAllocations data
    flowController.on('27', function (endTime) {

        (consoleLog) ? console.log('27') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(pickSubListModel,endTime,query);
        flowController.emit('28',endTime);

    });

    // delete deviceAllocations data
    flowController.on('28', function (endTime) {

        (consoleLog) ? console.log('28') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(putListModel,endTime,query);
        flowController.emit('29',endTime);

    });

    // delete deviceAllocations data
    flowController.on('29', function (endTime) {

        (consoleLog) ? console.log('29') : '';
        var query = {'activeStatus':2};
        functions_flushYearOldDataService.direct(putSubListModel,endTime,query);
        flowController.emit('31',endTime);

    });

//    // delete deviceAllocations data
//    flowController.on('30', function (endTime) {
//
//        (consoleLog) ? console.log('30') : '';
//        var query = {'activeStatus':2};
//        functions_flushYearOldDataService.direct(transactionalLogsModel,endTime,query);
//        flowController.emit('31',endTime);
//
//    });
       
    //----------------------------------------------------------------
    //IndirectService call -  delete customPalletNumbers data
    flowController.on('31', function (endTime) {

        (consoleLog) ? console.log('31') : '';
        var query = {'activeStatus':1};
        functions_flushYearOldDataService.customPalletNumber(customPalletNumbersModel,endTime,query);
        flowController.emit('32',endTime);

    });


    // delete dispatch item data
    flowController.on('32', function (endTime) {

        (consoleLog) ? console.log('32') : '';
        var query = {'activeStatus':4};
        functions_flushYearOldDataService.itemStore(itemStoreModel,endTime,query);
        flowController.emit('33',endTime);

    });

    // Get warehouse details
    flowController.on('33', function (endTime) {

        (consoleLog) ? console.log('33') : '';
        var query = {'activeStatus':4};
        functions_flushYearOldDataService.pickList(pickListModel,endTime,query);
        flowController.emit('34',endTime);

    });

    // Get warehouse details
    flowController.on('34', function (endTime) {

        (consoleLog) ? console.log('34') : '';
        var query = {'activeStatus':4};
        functions_flushYearOldDataService.pickSubList(pickListModel,endTime,query);
        flowController.emit('35',endTime);

    });

    // Get warehouse details
    flowController.on('35', function (endTime) {

        (consoleLog) ? console.log('35') : '';
        var query = {'activeStatus':4};
        functions_flushYearOldDataService.putList(putListModel,endTime,query);
        flowController.emit('36',endTime);

    });

    // Get warehouse details
    flowController.on('36', function (endTime) {

        (consoleLog) ? console.log('36') : '';
        var query = {'activeStatus':4};
        functions_flushYearOldDataService.putSubList(putSubListModel,endTime,query);
        flowController.emit('37',endTime);

    });

    // Get warehouse details
    flowController.on('37', function (endTime) {

        (consoleLog) ? console.log('37') : '';
        var query = {'activeStatus':1};
        functions_flushYearOldDataService.transactionalLog(transactionalLogsModel,endTime,query);
        flowController.emit('END',{message:"All Operation completed"});

    });

    // Get warehouse details
    flowController.on('38', function (endTime) {

        (consoleLog) ? console.log('38') : '';

    });

    // Get warehouse details
    flowController.on('43', function (endTime) {

        (consoleLog) ? console.log('39') : '';

    });

    // Get warehouse details
    flowController.on('39', function (endTime) {

        (consoleLog) ? console.log('40') : '';

    });

    // End
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('END') : '';

        (consoleLog) ? console.log(response) : '';
    });

    // Error
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('ERROR') : '';

        (consoleLog) ? console.log(error) : '';
    });

    // START
    flowController.emit('START');
});
//task.start();
task.stop();

module.exports = router;