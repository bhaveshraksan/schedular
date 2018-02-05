var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var isObject = require('isobject');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtReportsTemplateAlias","smtReportsTemplateCompanyAlias",
						  "smtReportDetails","smtCompanies","users","smtCompanyLocations",
						  "smtCustomerAppointmentsMeetings","smtCustomerAppointments"]);

var autoSubmitReports = function(){
	db.smtReportsTemplateAlias.find({"status": "ASSIGNED"}, function(err, reportAlias){
		var current = moment().format("MM-DD-YYYY h:mm A");
		_.each(reportAlias, function (repo) {
			db.smtReportsTemplateCompanyAlias.findOne({_id: repo.reportId}, function(err, companyAlias){
				db.smtReportDetails.find({
					companyId: repo.companyId,
	                companyDivisionId: repo.companyDivisionId,
	                reportCode: repo.reportCode,
	                hierarchyId: repo.hierarchyCode,
	                "status": "DRAFT"
				}, function(err, reports){
					_.each(reports, function (report) {
						var days;
		                var time;
		                var reportTime;
		                var expected;
		                if (report && report.autoSubmitByUser) {
		                	if (report.autoSubmitByUser.value) {
		                		days = report.autoSubmitByUser.noOfDays || 0;
		                        time = report.autoSubmitByUser.time || "00:00 AM";
		                        reportTime = moment(time, "h:mm A", true).toDate();
		                        expected = moment(reportTime).format("MM-DD-YYYY h:mm A");
		                        var reportDate = moment().add((-1 * days), "days").toDate();
		                        var firstDay = moment(reportDate).startOf("day").toDate().getTime();
		                        var reportDetailDate = moment(report.audit.createdAt).startOf("day").toDate().getTime();
		                        //if (expected === current && reportDetailDate === firstDay && report && report.approveBy && report.approveBy.length > 0) {
		                        	//console.log("Auto Approval ReportId", report._id);
		                        	var statusAudit = {};
		                            statusAudit.userId = "SYSTEM";
		                            statusAudit.status = "SUBMITTED";
		                            statusAudit.username = "SYSTEM";
		                            statusAudit.createdOn = new Date();
		                            report.statusAudit.push(statusAudit);
		                            report.status = "SUBMITTED"
		                            db.smtCompanies.findOne({_id: report.companyId}, function(errr, company){
		                            	var notificationObj = {};
			                            notificationObj.companyId = report.companyId;
			                            notificationObj.companyDivisionId = report.companyDivisionId;
			                            notificationObj.countryId = company.basicInfo.countryId;

			                            notificationObj.payLoad = {
			                                "REPORT": repo.reportCode,
			                                "CREATEDAT": moment(new Date()).format("DD MMM"),
			                                "CREATEDDATE": moment(report.audit.createdAt).toDate(),
			                                "VERSION": "1.1",
			                                "USER": report.userId
			                            }
			                            notificationObj.type = "MR-SYSTEM-REPORT-SUBMITTED";
			                            notificationObj.isActive = true;
			                            notificationObj.baseId = report._id;
			                            var from = "SYSTEM";
			                            var approveBy = report.approveBy;
			                            var to = [];
			                            db.users.findOne({_id: report.userId}, function(err, user){
			                            	if (user && user.profile && user.profile.locationId) {
			                            		var approveObj = _.findWhere(approveBy, {locationId: user.profile.immediateParentId});
			                            		if (report && report.approveBy && report.approveBy.length > 0) {
			                            			 _.each(report.approveBy, function (value, index) {
		                            			 		if (user && user.profile && user.profile.locationId) {
		                            			 			db.smtCompanyLocations.findOne({_id: user.profile.locationId}, function(err, location){
		                            			 				if (location && location.parentLocations && location.parentLocations.length > 0) {
		                            			 					var hierarchyLocation = _.findWhere(location.parentLocations, {code: value.hierarchyCode});
		                            			 					if (hierarchyLocation && hierarchyLocation.locationId) {
		                            			 						db.users.find({"profile.locationId": hierarchyLocation.locationId}, function(err, hierarchyUsers){
		                            			 							hierarchyUsers = _.map(hierarchyUsers, function (obj) {
						                                                        return obj._id;
						                                                    });
						                                                    to = to.concat(hierarchyUsers);
		                            			 						});
		                            			 					}		
		                            			 				}	
		                            			 			});
		                            			 		}	
			                            			});	
			                            		}
			                            		to = _.uniq(to);
			                            		if (report.reportCode === "APPOINTMENTS") {
				                                    endDayAppointments(report._id, "SYSTEM");
				                                    //endDayAppointments(report._id);
				                                }
			                            	}	
			                            });
		                            });
		                        // }else{
		                        // 	console.log('not match');
		                        // }		
		                	}	
		                }	
					});	
				});
			});
		});	
	});
};


function endDayAppointments(reportId,createdBy){
	db.smtReportDetails.findOne({_id: reportId}, function(err, report){
		console.log(report.userId);
		if(report.audit){
	        var reportDate = report.audit.createdAt;
	        var startOfDay = moment(reportDate).startOf("day").toDate();
	        var endOfDay = moment(reportDate).endOf("day").toDate();
	    }
	    var currentDate = new Date();
	    updateUnAttendedAppointment(reportDate, report.userId);
	    var completedStatus = ['END', 'SUMMARY-UPDATED', 'REPORT-SUBMITTED'];
	    //console.log('start day'+startOfDay);
	    //console.log(endOfDay);
	    db.smtCustomerAppointments.find({
	    	salesOfficerId: report.userId,
	        appointmentStatus: {$in: completedStatus},
	        appointmentDate: {$gte: startOfDay, $lte: endOfDay}
	    }, function(err, completedAppointments){
	    	//console.log(completedAppointments);
	    });
	});
}

function updateUnAttendedAppointment(tripDate,soId){
	if (tripDate) {
		var currentDate = new Date(tripDate);
        var firstDay = moment(currentDate).startOf("day").toDate();
        var lastDay = moment(currentDate).endOf("day").toDate();
        var firstDayConverted = currentDate.getTimezoneOffset();
        currentDate.setMinutes(currentDate.getMinutes() + (firstDayConverted * -1));
        var newConvertedDateObject = new Date(currentDate);
        var statusAuditObj = {};
        var userId = soId || this.userId;
        statusAuditObj.status = "CANCELLED";
        statusAuditObj.userId = soId || this.userId;
        db.users.findOne({_id:userId}, function(err, createdBy){
        	statusAuditObj.createdOn = new Date();
        	if (createdBy && createdBy.emails && createdBy.emails[0] && createdBy.emails[0].address) {
	            statusAuditObj.username = createdBy.emails[0].address;
	        };
	        db.smtCustomerAppointments.update({
	        	 appointmentStatus: {$in: ['OPEN']},
                    salesOfficerId: userId,
                    "appointmentDate": {
                        $gte: firstDay,
                        $lte: lastDay
                    }
                }, {$set: {appointmentStatus: "CANCELLED"},$push:{statusAudit:statusAuditObj}},{multi: true}, function(err, doc){});
	        db.smtCustomerAppointmentsMeetings.update({
	        	appointmentStatus: {$in: ['OPEN']},
                //"status" : "APPROVED",
                salesOfficerId: userId,
                "meetingDate": {
                    $gte: firstDay,
                    $lte: lastDay
                }
	        },{$set: {meetingStatus: "CANCELLED"},$push:{statusAudit:statusAuditObj}},{multi: true}, function(err, doc){});
        });
	}	
};

autoSubmitReports();