var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var commonjs = require('./commonJS/commonFunctions');


var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtCompanies","smtAllowanceTypesAlias","smtCustomerAppointments",
						 "smtCustomerAppointmentsMeetings","smtCompaniesUsers",
						 "smtCompanyLocations","smtMrDayReports"]);

var workForTheMonthlyAllowance = function() {
	db.smtCompanies.find({isActive: true}, function(err, companiesList){
		_.each(companiesList, function (company) {
			let companyId = company._id;
			//if(moment().startOf('day').isSame(moment().startOf('month'))){
				//console.log("it is workForTheMonthlyAllowance")
                var dateRange = {
                    startDate: moment().add(-1, 'day').startOf('month').toDate(),
                    endDate: moment().add(-1, 'day').endOf('month').toDate()
                }
                var query = {
                    'additionalSettings.frequency': 'MONTHLY',
                    companyId: companyId
                }
                commonjs.getTheUserHavingAppointmentInThisDateRange(dateRange, companyId, function(userIds){
                    db.smtAllowanceTypesAlias.find(query, {_id: 1}, function(err, monthlyAllowances){
                        var monthAllIds = _.map(monthlyAllowances, function (all) {
                            return all._id
                        }); 
                        commonjs.getAllowanceUsersBaseStation(userIds, monthAllIds, dateRange, companyId, "MONTHLY", function(result){
                            console.log(result);
                        });   
                    });    
                });
			//}
		});	
	});
}
module.exports = {
    workForTheMonthlyAllowance: workForTheMonthlyAllowance
}
