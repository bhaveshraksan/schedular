var conFig = require("../../config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;


var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtPrimarySalesErr"]);

var removeOldSalesErrs = function () {
    var yesterdayDate = new Date(moment().add(-1, "day"));
    console.log(yesterdayDate);
    db.smtPrimarySalesErr.remove({'audit:createdAt': {$lt: yesterdayDate}})
}

module.exports = {
	removeOldSalesErrs: removeOldSalesErrs
}