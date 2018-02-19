var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var isObject = require('isobject');
var utils = require('./commonJS/saveNotification');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtReportsTemplateAlias","smtReportsTemplateCompanyAlias",
						  "smtReportDetails","smtCompanies","users","smtCompanyLocations",
						  "smtCustomerAppointmentsMeetings","smtCustomerAppointments",
						  "smtMRTripDetails","smtCustomerAppointmentsSummary","smtReportTransactions"]);

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
		                       if (expected === current && reportDetailDate === firstDay && report && report.approveBy && report.approveBy.length > 0) {
		                        	console.log("Auto Approval ReportId", report._id);
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
			                            db.users.findOne({_id: report.userId}, function(err, user){
			                            	if (user && user.profile && user.profile.locationId) {
			                            		var approveObj = _.findWhere(approveBy, {locationId: user.profile.immediateParentId});
			                            		var to = [];
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
				                                }
				                                utils.saveNotification(notificationObj, from, to);
				                                db.smtReportDetails.update({_id: report._id}, {
				                                    $set: {
				                                        statusAudit: report.statusAudit,
				                                        status: report.status
				                                    }
				                                }, function(err, doc){});
				                                const date = new Date();
				                                
				                                if (approveBy && approveBy[0]) {
				                                    approveBy[0].status = "SUBMITTED";
				                                    approveBy[0].receivedAt = date;
				                                }
				                                approveBy.push({
				                                    locationId: "SYSTEM",
				                                    status: "SUBMITTED",
				                                    hierarchyCode: "SYSTEM",
				                                    receivedAt: date
				                                });
				                                db.smtReportTransactions.update({
				                                	 _id: report.transactionId,
				                                }, {$set: {toUserDetails: approveBy, overallReportStatus: "SUBMITTED"}
				                                }, function(err, doc){})
			                            	}	
			                            });
		                            });
		                        }		
		                	}	
		                }
					});
					db.smtReportDetails.find({
						companyId: repo.companyId,
		                companyDivisionId: repo.companyDivisionId,
		                reportCode: repo.reportCode,
		                hierarchyId: repo.hierarchyCode,
		                status: {$nin: ["DRAFT"]},
		                statusAudit: {$elemMatch: {status: {$in: ["SUBMITTED", "APPROVED"]}}},
		                "approveBy.status": {$in: ["DRAFT"]}
					}, function(err, submittedReports){
						_.each(submittedReports, function (report) {
							if (report && report.autoApprovedByManager) {
                    			if (report.autoApprovedByManager.value) {
                    				var days;
			                        var time;
			                        var reportTime;
			                        var expected;
			                        days = report.autoApprovedByManager.noOfDays || 0;
			                        time = report.autoApprovedByManager.time || "00:00 AM";
			                        reportTime = moment(time, "h:mm A", true).toDate();
			                        expected = moment(reportTime).format("MM-DD-YYYY h:mm A");
			                        var submitDate = moment().add((-1 * days), "days").toDate();
			                        var startDay = moment(submitDate).startOf("day").toDate().getTime();
			                        var canApproveReport = false;

			                        _.each(report.statusAudit, function (obj) {
			                            if (obj && (obj.status == "SUBMITTED" || obj.status == "APPROVED" ) && obj.createdOn) {
			                                if (startDay == moment(obj.createdOn).startOf("day").toDate().getTime()) {
			                                    canApproveReport = true;
			                                }
			                            }
			                        });
			                        if (expected == current && canApproveReport) {
			                        	console.log("Auto submitted manager reportId", report._id);
			                        	if (report.approveBy && report.approveBy.length > 0) {
			                        		report.statusAudit.sort(function (a, b) {
			                                    return b.createdOn - a.createdOn
			                                });
			                                if (report.status == "SUBMITTED" || report.statusAudit[0].status == "SUBMITTED") {
			                                    report.approveBy[0].status = "APPROVED"

			                                } else if (report.status == "APPROVED" && report.statusAudit[0].status == "APPROVED") {
			                                    var index = report.approveBy.findIndex(function (d) {
			                                        if (d.status == "DRAFT") {
			                                            return d
			                                        }
			                                    });
			                                    if (index >= 0) {
			                                        report.approveBy[index].status = "APPROVED"
			                                    }
			                                }
			                                var statusAudit = {};
			                                statusAudit.userId = "SYSTEM";
			                                statusAudit.status = "APPROVED";
			                                statusAudit.username = "SYSTEM";
			                                statusAudit.createdOn = new Date();
			                                report.statusAudit.push(statusAudit);
			                                db.smtCompanies.findOne({_id: report.companyId}, function(err, company){
			                                	 //send the notifiction to user about system approval
				                                var notificationObj = {};
				                                notificationObj.companyId = report.companyId;
				                                notificationObj.companyDivisionId = report.companyDivisionId;
				                                notificationObj.countryId = company.basicInfo.countryId;
				                                notificationObj.type = "ASM-REPORT-APPROVED";
				                                notificationObj.payLoad = {
				                                    "REPORT": repo.reportCode,
				                                    "CREATEDAT": moment(new Date()).format("DD MMM"),
				                                    "CREATEDDATE": moment(repo.audit.createdAt).toDate(),
				                                    "VERSION": "1.1"
				                                }
				                                notificationObj.baseId = report._id;
				                                notificationObj.isActive = true;
				                                var from = "SYSTEM";
				                                var to = [report.userId];
				                                utils.saveNotification(notificationObj, from, to);
				                                db.smtReportDetails.update({_id: report._id}, {
				                                    $set: {
				                                        statusAudit: report.statusAudit,
				                                        status: "APPROVED",
				                                        approveBy: report.approveBy
				                                    }
				                                }, function(err, doc){});
				                                const date = new Date();
				                                let toUserDetails = report.approveBy.map(obj => {
				                                    obj.status = "APPROVED";
				                                    obj.respondedAt = date;
				                                    return obj;
				                                });
				                                toUserDetails.push({
				                                    locationId: "SYSTEM",
				                                    hierarchyCode: "SYSTEM",
				                                    respondedAt: date,
				                                    status: "APPROVED"
				                                });
				                                db.smtReportTransactions.update({reportDetailsId: report._id}, {
				                                    $set: {
				                                        toUserDetails: toUserDetails,
				                                        overallRequestStatus: "CLOSED",
				                                        overallReportStatus: "APPROVED",
				                                        overallRequestPercentage: 100
				                                    }
				                                }, function(err, doc){});
			                                });
			                        	}	
			                        }
                    			}
                    		}	
						});	
					});
				});
			});
		});	
	});
};


function endDayAppointments(reportId,createdBy){
	db.smtReportDetails.findOne({_id: reportId}, function(err, report){
		if(report.audit){
	        var reportDate = report.audit.createdAt;
	        var startOfDay = moment(reportDate).startOf("day").toDate();
	        var endOfDay = moment(reportDate).endOf("day").toDate();
	    }
	    var currentDate = new Date();
	    updateUnAttendedAppointment(reportDate, report.userId);
	    var completedStatus = ['END', 'SUMMARY-UPDATED', 'REPORT-SUBMITTED'];
	    db.smtCustomerAppointments.find({
	    	salesOfficerId: report.userId,
	        appointmentStatus: {$in: completedStatus},
	        appointmentDate: {$gte: startOfDay, $lte: endOfDay}
	    }, function(err, completedAppointments){
	    	var appointmentIds = completedAppointments	.map(function (d) {
		        return d._id
		    });
		    db.smtCustomerAppointments.update({_id: {$in: appointmentIds}},{$set: {summarySubmitted:true}},{multi: true},function(err, doc){});
		    db.smtCustomerAppointmentsSummary.update({appointmentId: {$in: appointmentIds}}, {$set: {summarySubmitted: true}},{multi: true}, function(err, doc){});
		    db.smtMRTripDetails.findOne({
		    	mrId: report.userId,
        		tripStartTime: {$gte: startOfDay, $lte: endOfDay}
		    }, function(err, mrDetails){
		    	if (mrDetails && mrDetails._id) {
		    		var audit= {};
			        audit.updatedAt = new Date();
			        audit.updatedBy = createdBy || report.userId;
			        db.smtMRTripDetails.update({
			        	mrId: report.userId,
			        	tripStartTime: {
			                $gte: startOfDay,
			                $lte: endOfDay
			            }
			        },{$set: {tripEndTime: currentDate,audit:audit}}, function(err, doc){});
		    	}else {
		    		var tripDetails = {};
			        tripDetails.mrId = report.userId;
			        tripDetails.tripStartTime = reportDate;
			        tripDetails.tripEndTime = currentDate;
			        tripDetails.audit = {};
			        tripDetails.audit.createdAt = new Date();
			        tripDetails.audit.createdBy = createdBy || report.userId;
			        db.smtMRTripDetails.insert(tripDetails, function(err, result){});
		    	}	
		    });
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
module.exports = {
	autoSubmitReports: autoSubmitReports
}
