var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var commonjs = require('./commonJS/commonFunctions');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtCompaniesCustomer"]);
 var sendAnniversaryAndBirthDayNotification = function () {
    var current = moment().format("MM-DD");
    var currentTime = moment().format("HH:mm");
    try{
        db.smtCompaniesCustomer.find({}, function(err, customers){
            if (customers && customers.length > 0) {
                _.each(customers, function (cust) {
                    if (cust && cust.personalDetails && (cust.personalDetails.dateOfBirth || cust.personalDetails.anniversayDate)) {
                        try{
                            var dateOfBirth = cust.personalDetails.dateOfBirth ? moment(cust.personalDetails.dateOfBirth).format("MM-DD") : "";
                            var anniversaryDate = cust.personalDetails.anniversaryDate ? moment(cust.personalDetails.anniversaryDate).format("MM-DD") : "";
                        }catch(e){
                            console.log("while featching dateOfBirth or anniversaryDate ");
                            console.log(e);
                        }
                        if ((current == dateOfBirth || current == anniversaryDate)) {
                            var jobDetails = cust.jobDetails || cust.hospitalBusinessDetails || [];
                            var stationIds = _.map(jobDetails, function (obj) {
                                if (obj.stationId) {
                                    return obj.stationId;
                                }
                                if (obj.headquarterId) {
                                    return obj.headquarterId;
                                }
                            }) || [];
                            var mrIds = commonjs.getCustomerMrIds(stationIds);
                            var isAnniversary = true;
                            if (current == dateOfBirth) {
                                isAnniversary = false;
                            }
                            commonjs.SendNotificationForBirthdayAnn(mrIds, isAnniversary, cust.personalDetails.name);
                        }   
                        
                    }
                }); 
            }   
        });
    }catch(err){
        console.log('PRUDHVI');
        console.log(err.code);
    }
    
};        

sendAnniversaryAndBirthDayNotification();