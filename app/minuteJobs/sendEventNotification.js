var conFig = require("../../config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;
var utils = require('../../commonJS/saveNotification');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtEventList","smtNotifications","smtCompaniesDivison","users"]);
var sendEventNotification = function(){
	var currentDate = moment(new Date().toISOString()).format("DD-MM-YY");
	var currentTime = moment(new Date().toISOString()).format("HH:mm");
	db.smtEventList.find({}, function(err, events){ //get all events list
		_.each(events, function(obj){
		    if (obj && obj.startDate && obj.endDate) {
		    	db.smtNotifications.findOne({ type: "EVENT-NOTIFICATION", baseId: obj._id}, function(err, alreadyNotification){ //get notfication based on type and baseId
		    		var notificationDate = moment(new Date(obj.startDate).toISOString()).add((obj.alertBefore * -1), "day").format("DD-MM-YY");
		    		var notificationUsers = [];
		    		if (obj.snoozeBefore && obj.snoozeBefore.length > 0) {
		    			_.each(obj.snoozeBefore, function (snoozeObj) {
		    				if (snoozeObj.hour) { //snoozobj as hour
		    					var eventDate = moment(new Date(obj.startDate).toISOString()).format("DD-MM-YY");
		    					var eventTime = moment(obj.startTime, "HH:mm").add((snoozeObj.hour * -1), "hours").format("HH:mm");
		    					//if (eventDate == currentDate && eventTime == currentTime) { //dates are matching
		    						notificationUsers.push(snoozeObj.userId);
		    					//}	
		    				}else if (snoozeObj.day) { //snoozobj as day
		    					var snoozeDate = moment(new Date(obj.startDate).toISOString()).add((snoozeObj.day * -1), "day").format("DD-MM-YY");
		    					var firstDay = moment(snoozeDate, "DD-MM-YY").startOf('day').toDate();
		    					var lastDay = moment(snoozeDate, "DD-MM-YY").endOf('day').toDate();
		    					db.smtNotifications.findOne({to: snoozeObj.userId, type: "EVENT-NOTIFICATION",baseId: obj._id, "audit.createdAt": {$gte: firstDay, $lte: lastDay}}, function(err, data1){
		    						var alreadyNotificationSnoozed = data1;

		    						//if (snoozeDate == currentDate && !alreadyNotificationSnoozed) {
		    							notificationUsers.push(snoozeObj.userId);
		    						//}	
		    					});
		    				}	
		    			});
		    		}
		    		var companyId = obj.companyId;
                	var companyDivisionIds = obj.companyDivisionIds;
                	getCompanyDivisions(companyId, companyDivisionIds, function(companyDivision){
                		if ((notificationDate == currentDate && !alreadyNotification) || (notificationUsers && notificationUsers.length > 0)) {
                			var notificationObj = {};
		                    notificationObj.companyId = obj.companyId;
		                    notificationObj.payLoad = {
		                        "EVENTDATE": moment(obj.startDate).format("DD MMM"),
		                        "EVENTNAME": obj.name
		                    };
		                    notificationObj.countryId = obj.countryId;
		                    notificationObj.from = "SYSTEM";
		                    notificationObj.isActive = true;
		                    notificationObj.type = "EVENT-NOTIFICATION";
		                    notificationObj.baseId = obj._id;
		                   //send notification based on division
               				var userQuery = {
	                            "profile.companyDivisionId": companyDivision._id,
	                            "profile.companyId": companyDivision.companyId,
	                            "isActive": true,
	                            "roles.company-group": {$exists: true}
	                        };
	                        if (notificationUsers && notificationUsers.length > 0) {
	                            userQuery = _.extend(userQuery, {_id: {$in: notificationUsers}});
	                        }
	                        db.users.find(userQuery, function(err, users){
	                        	var userIds = _.map(users, function (user) {
	                        		return user._id;
	                        	});
	                        	notificationObj.companyDivisionId = companyDivision._id;
	                       	 	notificationObj.to = userIds;
	                       	 	if (notificationObj.to && notificationObj.to.length > 0) {
	                       	 		utils.saveNotification(notificationObj, notificationObj.from, notificationObj.to, function(result){
	                       	 			console.log(result);
	                       	 		});
	                       	 	}	
	                        });	
                		}	
                	});
		    	});	
		    }	
		});
	});
}

function getCompanyDivisions(companyId, companyDivisionIds, callback){
	var companyDivisions = [];
	if (companyDivisionIds.indexOf("ALL") > -1) {
		db.smtCompaniesDivison.findOne({companyId: companyId}, function(err, divisions){ //get all divisions based on companyId 
			companyDivisions = divisions;
			callback(companyDivisions);
		});	
	}else{
		db.smtCompaniesDivison.findOne({_id: {$in: companyDivisionIds}}, function(err, divisions){ //get all divisions based on company divisionIDs
			companyDivisions = divisions;
			callback(companyDivisions);
		});
	}
}

module.exports = {
	sendEventNotification: sendEventNotification
}
