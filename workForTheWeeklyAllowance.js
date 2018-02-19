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

var workForTheWeeklyAllowance = function(){
	db.smtCompanies.find({isActive: true}, function(err, companiesList){
		_.each(companiesList, function (company) {
			let weekStart = 'MON';
            let companyId = company._id;
            if (company && company.basicInfo && company.basicInfo.firstWorkingDayOfWeek && company.basicInfo.firstWorkingDayOfWeek !== "") {
                weekStart = company.basicInfo.firstWorkingDayOfWeek || 'MON';
            }
            if (moment().startOf('day').format('ddd').toUpperCase() === weekStart) {
            	var dateRange = {
                    startDate: moment().add(-7, 'day').startOf('day').toDate(),
                    endDate: moment().add(-1, 'day').endOf('day').toDate()
                }
                commonjs.getTheUserHavingAppointmentInThisDateRange(dateRange, companyId, function(userIds){
                    var query = {
                        isActive: true,
                        'additionalSettings.frequency': 'WEEKLY'
                    }
                    db.smtAllowanceTypesAlias.find(query, function(err, weeklyAllowances){
                        var weekAllIds = _.map(weeklyAllowances, function (all) {
                            return all._id
                        });
                        commonjs.getAllowanceUsersBaseStation(userIds, weekAllIds, dateRange, companyId, "WEEKLY", function(result){
                            console.log(result);
                        });
                    });  
                });
            }
		});
	});
};

module.exports = {
    workForTheWeeklyAllowance : workForTheWeeklyAllowance  
}
