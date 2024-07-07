var APIRoutes = [
    {
        // Virtual Machine
        'route': '/avancer',
        'path': './routes/v1/system/systemSettings-shutDown.js'
    }, {
        // Auto API
        'route': '/avancer',
        'path': './routes/v1/auto-config/routes-autoapi.js'
    }, {
        // Cron jobs
        'route': '/avancer',
        'path': './routes/v1/cron-jobs/routes-cronjobs-warehouseUtilisation.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/cron-jobs/routes-cronjobs-alertOnWarehouseKPI.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/cron-jobs/routes-cronjobs-alertOnUserTargetMismatch.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/cron-jobs/routes-cronjobs-alertOnActivityOverdue.js'
    }, {
        // Barcode print API
        'route': '/avancer',
        'path': './routes/v1/web/routes-printMaster-barcodePrinter.js'
    }, {
        // Reason Master
        'route': '/avancer',
        'path': './routes/v1/web/routes-reasonMaster-reasonMaster.js'
    }, {
        // Location Master
        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-client.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-capacityCalculation.js'
    },
    {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-warehouseMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-areaMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-zoneMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-lineMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-levelMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-sideMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-locationStore.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-functionArea.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-locationProperties.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-locationMaster-virtualLocationStore.js'
    }, {
        // Item Master
        'route': '/avancer',
        'path': './routes/v1/web/routes-materialHandlingMaster-materialHandlingMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-itemCategory.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-itemSubCategory.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-measurementUnits.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-holdingTypes.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-flags.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-alerts.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-inwardRules.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-dispatchRules.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-itemMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-itemStore.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-inventory.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-itemMaster-virtualItemStore.js'
    }, {
        // Process Master
        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-processMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-inwardList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-inwardSubList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-pickList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-pickSubList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-putList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-putSubList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-processMaster-stockCountList.js'
    }, {
        /*                
         'route': '/avancer',
         'path': './routes/v1/web/routes-processMaster-stockCountSubList.js'
         }, {*/
        // Device Master   
        'route': '/avancer',
        'path': './routes/v1/web/routes-deviceMaster-deviceMaster.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-deviceMaster-deviceAllocation.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-deviceMaster-deviceAreaAllocation.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-deviceMaster-deviceTracking.js'
    }, {
        // Feedback
        'route': '/avancer',
        'path': './routes/v1/web/routes-settings-feedback.js'
    }, {
        // User Master
        'route': '/avancer',
        'path': './routes/v1/web/routes-userMaster-users.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-userMaster-userType.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-userMaster-userCategory.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-userMaster-licenseManager.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-userMaster-hoursTracking.js'
    },
    // Interface
    {

        'route': '/avancer',
        'path': './routes/v1/monitoring-interface/routes-interface-putList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/monitoring-interface/routes-interface-pickList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/monitoring-interface/routes-interface-reprocess.js'
    },
    // Document Master
    {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-inventory.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-item.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-location.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-inwardList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-pickList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-putList.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/web/routes-excelMaster-ruleEngine.js'
    },
    // AUTHENTICATION 
    {

        'route': '/avancer',
        'path': './routes/v1/authentication/routes-web.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/authentication/routes-mobile.js'
    },
    // List & Sublist Mobile
    {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-inwardListMobile.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-inwardSubListMobile.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-pickListMobile.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-pickSubListMobile.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-putListMobile.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-putSubListMobile.js'
    },
    // Get All lists 
    {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-allList.js'
    },
    // Get All footers
    {

        'route': '/avancer',
        'path': './routes/v1/mobile/routes-processMaster-allFooters.js'
    },
    // TEST 
    {

        'route': '/avancer',
        'path': './routes/test/test.js'
    },
    //Reports
    {

        'route': '/avancer',
        'path': './routes/v1/reports/routes-reportMaster-reports'
    }, {

        'route': '/avancer',
        'path': './routes/v1/reports/routes-reportMaster-exportReports'
    },
    //dashboard
    {

        'route': '/avancer',
        'path': './routes/v1/dashboard/routes-detailedDashboard.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/dashboard/routes-homeDashboard.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/dashboard/routes-operatorDashboard.js'
    }, {

        'route': '/avancer',
        'path': './routes/v1/dashboard/routes-orderDashboard.js'
    },
    //Dayend
    {

        'route': '/avancer',
        'path': './routes/v1/day-end/routes-dayend.js'
    }
];

module.exports = APIRoutes;