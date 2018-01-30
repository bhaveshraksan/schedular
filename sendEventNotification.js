var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;
//var sendNotification = require('./sendNotification.js');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtEventList","smtNotifications","smtCompaniesDivison"]);
// db.bind('smtEventList');
// db.bind('SmtNotifications');
var sendEventNotification = function(){
	var currentDate = moment(new Date().toISOString()).format("DD-MM-YY");
	var currentTime = moment(new Date().toISOString()).format("HH:mm");
	db.smtEventList.find({}, function(err, result){
		 _.each(result, function (obj) {
		 	 if (obj && obj.startDate && obj.endDate) {
		 	 	db.smtNotifications.findOne({ type: "EVENT-NOTIFICATION", baseId: obj._id}, function(err, data){
		 	 		var notificationDate = moment(new Date(obj.startDate).toISOString()).add((obj.alertBefore * -1), "day").format("DD-MM-YY");
		 	 		var notificationUsers = [];
		 	 		if (obj.snoozeBefore && obj.snoozeBefore.length > 0) {
		 	 			 _.each(obj.snoozeBefore, function (snoozeObj) {
		 	 			 	if (snoozeObj.hour) {
		 	 			 		var eventDate = moment(new Date(obj.startDate).toISOString()).format("DD-MM-YY");
	                            var eventTime = moment(obj.startTime, "HH:mm").add((snoozeObj.hour * -1), "hours").format("HH:mm");
	                            if (eventDate == currentDate && eventTime == currentTime) {
	                                notificationUsers.push(snoozeObj.userId);
	                            }    
	                        }else if (snoozeObj.day) {
	                            var snoozeDate = moment(new Date(obj.startDate).toISOString()).add((snoozeObj.day * -1), "day").format("DD-MM-YY");
	                            var firstDay = moment(snoozeDate, "DD-MM-YY").startOf('day').toDate();
	                            var lastDay = moment(snoozeDate, "DD-MM-YY").endOf('day').toDate();
	                            db.smtNotifications.findOne({to: snoozeObj.userId, type: "EVENT-NOTIFICATION",baseId: obj._id, "audit.createdAt": {$gte: firstDay, $lte: lastDay}}, function(err, data1){
	                          		var alreadyNotificationSnoozed = data1;
	                            	if (snoozeDate == currentDate && !alreadyNotificationSnoozed) {
		                             	notificationUsers.push(snoozeObj.userId);
		                            }
	                            });
		                    }
		 	 			}); 
		 	 		}
		 	 		var companyDivisions = [];
		 	 		var companyDivisionIds = obj.companyDivisionIds;
		 	 		if (companyDivisionIds.indexOf("ALL") > -1) {
					    db.smtCompaniesDivison.findOne({companyId: obj.companyId}, function(err, divisions){
	     				 	companyDivisions.push(divisions);
	     				});
	                } else {
	     				db.smtCompaniesDivison.findOne({_id: {$in: companyDivisionIds}}, function(err, divisions1){
	     					companyDivisions.push(divisions1);
	     				});
	                }
	                console.log(companyDivisions);
		 	 	});
		 	}		 	
		});	
	});
	
}

function getData(data, companyId){
	if (data.indexOf("ALL") > -1) {
		db.smtCompaniesDivison.find({companyId: companyId}, function(err, divisions){
		 	return divisions;
		});
	}	
}

sendEventNotification()


// var sendEventNotification = function(){	
// 	var currentDate = moment(new Date().toISOString()).format("DD-MM-YY");
// 	var currentTime = moment(new Date().toISOString()).format("HH:mm");
// 	var aggregateQuery = []
// 	collectionAggregate("smtEventList",aggregateQuery)
// 	.then(records)=>{
// 		console.log(records.length)
// 	}
// }