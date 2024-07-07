var roleBasedAccessService = {};
//
var function_roleBasedAccessService = require('../service-functions/functions-userAccessConfiguration');
//
roleBasedAccessService.checkAccessToModules = function (dataObject, servicecallback) {

    var loggedInUserRole = dataObject.loggedInUserRole;
    var module = dataObject.module;

    function_roleBasedAccessService.validateAccessRights(loggedInUserRole, module, function (err, response) {
        if (err) {

            servicecallback(err);
        } else {

            servicecallback(null, response);
        }
    });
};
//
//
module.exports = roleBasedAccessService;