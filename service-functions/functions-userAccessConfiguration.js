var function_roleBasedAccessService = {};

var avancerRoleArray = [
    'PROCESS-BACKLOG-CONFIGURATION', 'RULEENGINE-EDIT'
];

var superAdminRoleArray = [
    'INVENTORY-IMPORT', 'INVENTORY-ADD', 'INVENTORY-EDIT', 'INVENTORY-DELETE',
    'PROCESS-BACKLOG', 'PROCESS-TARGET',
    'ITEMMASTER-ADD', 'ITEMMASTER-EDIT', 'ITEMMASTER-DELETE', 'ITEMMASTER-IMPORT',
    'MATERIALHANDLINGUNIT-ADD', 'MATERIALHANDLINGUNIT-EDIT', 'MATERIALHANDLINGUNIT-DELETE',
    'LOCATIONMASTER', 'CREATE-LOCATION',
    'REPORTS-ITEMMASTER', 'REPORTS-DEVICEMASTER', 'REPORTS-USERMASTER', 'REPORTS-LOCATIONMASTER',
    'DEVICEMASTER-EDIT', 'DEVICEMASTER-DELETE',
    'LOGS',
    'LICENSEMANAGER-ADD',
    'ITEMCODE-EXPORT', 'LOCATION-STORE-EXPORT', 'SERIAL-NUMBER-EXPORT',
    'VIRTUALINVENTORY-MOVETOSTORE', 'VIRTUALINVENTORY-ADD', 'VIRTUALINVENTORY-EDIT', 'VIRTUALINVENTORY-DELETE', 'VIRTUALINVENTORY-IMPORT',
    'FLAGMASTER-ADD', 'FLAGMASTER-EDIT', 'FLAGMASTER-DELETE',
    'ADMINISTRATION-BACKUPSETTING', 'ADMINISTRATION-ALERTSCONFIGURATION',
    'RULEENGINE-VIEW', 'RULEENGINE-ADD', 'RULEENGINE-EXPORT', 'ALERTS-INTERVAL',
    'PICKSUBLIST-FORCEFULLY-DONE'
];

var adminRoleArray = [
    'INVENTORY-EXPORT',
    'BARCODE-ITEMCODE', 'BARCODE-PALLETNUMBER', 'BARCODE-LOCATIONADDRESS', 'BARCODE-PRINT',
    'ITEMMASTER-SEARCH', 'ITEMMASTER-SHOW',
    'MATERIALHANDLINGUNIT-SEARCH', 'MATERIALHANDLINGUNIT-SHOW',
    'DEVICEMASTER-CONFIGURATION', 'DEVICEMASTER-SHOW', 'DEVICEMASTER-SEARCH',
    'REPORTS-PUTLIST', 'REPORTS-PUTSUBLIST', 'REPORTS-PICKLIST', 'REPORTS-PICKSUBLIST', 'REPORTS-ALERTS',
    'LICENSEMANAGER-VIEW',
    'VIRTUALINVENTORY-EXPORT', 'VIRTUALINVENTORY-SEARCH', 'VIRTUALINVENTORY-VIEW',
    'ADMINISTRATION-INVENTORYCOMPARE'
];

function_roleBasedAccessService.validateAccessRights = function (loggedInUserRole, module, callback) {

    if (loggedInUserRole == 'AVANCER') {
        // Avancer have access to all modules
        callback(null);
    }

    if (loggedInUserRole == 'SUPERADMIN') {

        var allowedRightsArray = superAdminRoleArray.concat(adminRoleArray);

        if (allowedRightsArray.indexOf(module) == -1) {

            var err = {message: 'You are not allowed to access or do modification here!', status: 'error', statusCode: '404'};

            callback(err);
        } else {

            callback(null);
        }
    }

    if (loggedInUserRole == 'ADMIN') {

        var allowedRightsArray = adminRoleArray

        if (allowedRightsArray.indexOf(module) == -1) {

            var err = {message: 'You are not allowed to access or do modification here!', status: 'error', statusCode: '404'};

            callback(err);
        } else {

            callback(null);
        }
    }

    if (loggedInUserRole == 'OPERATOR') {

        var err = {message: 'You are not allowed to access Web Portal!', status: 'error', statusCode: '404'};

        callback(err);
    }
};

module.exports = function_roleBasedAccessService;