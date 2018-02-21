var conFig = require("../config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var util = require('./saveNotification');
var constant = require('../constants.js');
// var MJ = require('mongo-fast-join'),
//     mongoJoin = new MJ();
var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtCompanies","smtAllowanceTypesAlias","smtCustomerAppointments",
                         "smtCustomerAppointmentsMeetings","smtCompaniesUsers",
                         "smtCompanyLocations","smtMrDayReports","users",
                         "smtReportsGeneration","smtReportsTemplateAlias","smtReportDetails","smtNotifications",
                         "smtCompanyDepartments","smtCompanySubDepartments","serialNumbers",
                         "smtReportTransactions"]);



function getTheUserHavingAppointmentInThisDateRange(dateRange, companyId, callback){
	var appointmentQuery = {
        companyId: companyId,
        status: 'APPROVED',
        appointmentEndFlag: true,
        appointmentDate: {$gte: dateRange.startDate, $lte: dateRange.endDate}
    };
    db.smtCustomerAppointments.find(appointmentQuery, function(err, appointments){
    	var meetingQuery = {
            companyId: companyId,
            status: 'APPROVED',
            appointmentEndFlag: true,
            meetingDate: {$gte: dateRange.startDate, $lte: dateRange.endDate}
        };
        db.smtCustomerAppointmentsMeetings.find(meetingQuery, function(err, meetings){
        	var salesOfficerIdsUserAppointment = _.map(appointments, function (appointment) {
	            return appointment.salesOfficerId
	        });
	        var salesOfficerIdsUserMeeting = _.map(meetings, function (meeting) {
	            return meeting.salesOfficerId
	        });
	        salesOfficerIds = _.union(salesOfficerIdsUserAppointment, salesOfficerIdsUserMeeting);
            callback(salesOfficerIds);
        });
    });

}

function getAllowanceUsersBaseStation(userIds, allowances, dateRange, companyId, frequencyType, callback) {
    _.each(userIds, function (userId) {
        allowanceAsPerUserUserId(userId, allowances, function(allowanceListObj){
            let newAllowance = [];
            _.each(allowanceListObj, function (obj) {
                var otherDataObj = {};
                otherDataObj.allowanceTypeId = obj.allowanceTypeId;
                otherDataObj.value = obj.value;
                otherDataObj.allowedStatus = "STANDARD";
                otherDataObj.allowanceTypeCode = obj.allowanceTypeId;
                otherDataObj.frequencyType = frequencyType;
                otherDataObj.audit = {};
                otherDataObj.audit.createdBy = 'SYSTEM'; /// its important
                otherDataObj.audit.createdOn = new Date();
                newAllowance.push(otherDataObj);
                if (newAllowance && newAllowance.length > 0) {
                    var startOfDay = moment(dateRange.endDate).startOf('day').toDate();
                    var endOfDay = moment(dateRange.endDate).endOf('day').toDate();
                    var options = {
                            companyId: companyId,
                            salesOfficerId: userId,
                            reportDate: {$gte: startOfDay, $lte: endOfDay}
                        };
                        //console.log(options);
                    db.smtMrDayReports.findOne(options, function(err, smtMrDayReports){
                        if (smtMrDayReports && smtMrDayReports.reportValues) {
                            var index = smtMrDayReports.reportValues.findIndex(function (r) {
                                if(r.userId === userId){
                                   return r; 
                                }
                            });
                            let reportValues = [];
                            if (index >= 0) {
                                reportValues = smtMrDayReports.reportValues;
                                var newAllowanceValue = reportValues[index].allowanceValues;
                                newAllowanceValue = newAllowanceValue.concat(newAllowance);
                                reportValues[index].allowanceValues = newAllowanceValue
                                reportValues[index].audit = _.extend(reportValues[index].audit, {
                                    updatedBy: 'SYSTEM',
                                    updatedOn: new Date()
                                });
                            }else{
                                var audit = {};
                                audit.createdBy = 'SYSTEM'; /// its important
                                audit.createdOn = new Date();
                                reportValues = smtMrDayReports.reportValues;
                                reportValues.push({
                                    userId: userId,
                                    audit: audit,
                                    allowanceValues: newAllowance
                                });    
                            }
                           db.smtMrDayReports.update({_id: smtMrDayReports._id}, {$set: {reportValues: reportValues}}, function(err, doc){
                                if(err == null){ 
                                    callback("updated done:"+  smtMrDayReports._id);
                                }
                           });    
                        }else{
                            var reportObj = {};
                            db.users.findOne({_id: userId}, function(err, userInfo){
                                reportObj.companyId = userInfo.profile.companyId;
                                reportObj.companyDivisionId = userInfo.profile.companyDivisionId;
                                reportObj.salesOfficerId = userId;
                                reportObj.reportDate = dateRange.endDate;
                                var audit = {};
                                audit.createdBy = 'SYSTEM'; /// its important
                                audit.createdOn = new Date();
                                reportObj.reportValues = [];
                                reportObj.reportValues.push({userId: userId, audit: audit, allowanceValues: newAllowance});
                                db.smtMrDayReports.insert(reportObj, function(err, doc){
                                    if(err == null){ 
                                        callback("inserted done");
                                    }
                                });
                            });
                        }    
                    });    
                }    
            });    
        });
    });
}

function allowanceAsPerUserUserId(userId, allowances, callback){
    var allowanceListobj = [];
    getUserBaseStationId(userId, function(baseStationId){
        if (baseStationId && baseStationId !== '') {
            db.smtCompanyLocations.findOne({_id: baseStationId}, function(err, location){
                if (location && location.allowanceSettings && location.allowanceSettings.isApplicable) {
                    var allowanceValues = location.allowanceSettings.allowanceValues;
                    if (allowanceValues && allowanceValues.length > 0) {
                        _.each(allowanceValues, function (allowanceValue) {
                            if (allowanceValue.isActive) {
                                _.each(allowanceValue.list, function (list) {
                                    //console.log(allowances.indexOf(list.allowanceTypeId));
                                    if (list.isActive && allowances.indexOf(list.allowanceTypeId) >= 0) {
                                        let obj = {};
                                        obj.value = list.sameStationTravel.value;
                                        obj.allowanceTypeId = list.allowanceTypeId;
                                        allowanceListobj.push(obj);
                                        callback(allowanceListobj);
                                    }
                                });    
                            }  
                        });    
                    }  
                };    
            }); 
        }    
    });
}

function getUserBaseStationId(userId, callback) {
    if(typeof userId == 'string'){
    }else{
        console.log("userId must be a string");
        return false;
    }
    var baseStId = '';
    db.smtCompaniesUsers.findOne({"companyAssignedUserInfo.userId": userId}, function(err, usersRecs){
        if(usersRecs){
            var companyInfo = usersRecs.companyAssignedUserInfo;
            _.each(companyInfo, function (recs) {
                if (recs.userId == userId) {
                    baseStId = recs.baseStationId;
                }
            }); 
        }
        callback(baseStId);
    });
}

function getCustomerMrIds(stationIds, callback){
    var reqData = {};
    var reqData = {_id: {$in: stationIds}};
    db.smtCompanyLocations.find({
        locationType: "LEVEL-0",
        _id: {$in: stationIds},
    }, function(err, stations){
        db.smtCompanyLocations.find({
            locationType: "LEVEL-1",
            _id: {$in: stationIds},
        }, function(err, headQuarter){
            var hqIds = _.map(stations, function (obj) {
                return obj.immediateParentId;
            }) || [];
             if (headQuarter && headQuarter.length > 0) {
                var hq = _.map(headQuarter, function (obj) {
                    return obj._id;
                })
                hqIds = _.union(hqIds, hq);
            }
            db.users.find({
                "roles.company-group": "LEVEL-1",
                "profile.locationId": {$in: hqIds}
            }, function(err, companyUsers){
                var ids = _.map(companyUsers, function (obj) {
                    return obj._id;
                });
                callback(ids);
            });
        });
    })
}

function SendNotificationForBirthdayAnn(mrIds, isAnniversary, customerName, callback) {
    if (mrIds && mrIds.length > 0) {
        var notificationObj = {};
        db.users.findOne({_id: mrIds[0]}, function(err, user){
            notificationObj.companyId = user.profile.companyId;
            notificationObj.companyDivisionId = user.profile.companyDivisionId;
            notificationObj.countryId = user.profile.countryId;
            notificationObj.from = "SYSTEM";
            notificationObj.to = mrIds;
            notificationObj.type = "CUSTOMER-BIRTHDAY";
            if (isAnniversary) {
                notificationObj.type = "CUSTOMER-ANNIVERSARY";
            }
            notificationObj.payLoad = {
                "CUSTOMER": customerName
            };
            //console.log(notificationObj);
            util.saveNotification(notificationObj, notificationObj.from, notificationObj.to, function(result){
                callback(result);
            });
       })
    }    
}

function generateReportsEnterForUser(current, reportName, reportCode, type, levelCode, companyId, companyDivisionId, reportId, approvedByLevels, viewedByLevel){
    var gte = current;
    var lte = current;
    if (type === "MONTHLY") {
        gte = moment(current, "MM-DD-YYYY h:mm A").startOf('month').toDate();
        lte = moment(current, "MM-DD-YYYY h:mm A").endOf('month').toDate()
    } else if (type === "DAILY") {
        gte = moment(current, "MM-DD-YYYY h:mm A").startOf('day').toDate();
        lte = moment(current, "MM-DD-YYYY h:mm A").endOf('day').toDate();
    } else if (type === "WEEKLY") {
        gte = moment(current, "MM-DD-YYYY h:mm A").startOf('week').toDate();
        lte = moment(current, "MM-DD-YYYY h:mm A").endOf('week').toDate()
    }

    db.smtReportsGeneration.find({
            reportCode: reportCode,
            type: type,
            levelCode: levelCode,
            companyId: companyId,
            companyDivisionId: companyDivisionId,
            "audit.createdAt": {$gte: gte, $lte: lte}
    }, function(err, alreadyGenerated){
        var userExistingArray = _.map(alreadyGenerated, function (data) {
            return data.userIds
        });
        userExistingArray = _.flatten(userExistingArray, true);
        db.users.find({_id: {$nin: userExistingArray},
                "profile.companyId": companyId,
                "profile.companyDivisionId": companyDivisionId,
                "roles.company-group": {$in: [levelCode]},
                "isActive": true
            }, function(err, users){
            var reportsGenerated = [];
            db.smtReportsTemplateAlias.findOne({
                "status": "ASSIGNED",
                "reportCode": reportCode,
                "hierarchyCode": levelCode,
                companyId: companyId,
                companyDivisionId: companyDivisionId
            }, function(err, smtReportsTemplateAlias){
                var userIds = _.map(users, function (u) {
                    getLocationParentLocations(u, approvedByLevels, true, function(approveBy){
                        getLocationParentLocations(u, viewedByLevel, false, function(viewedBy){
                            var email = u.emails[0].address;
                            db.smtCompanies.findOne({_id: companyId}, function(err, company){
                                var autoSubmitByUser;
                                var autoApprovedByManager;
                                if (smtReportsTemplateAlias) {
                                    autoSubmitByUser = smtReportsTemplateAlias.autoSubmitByUser;
                                    autoApprovedByManager = smtReportsTemplateAlias.autoApprovedByManager;
                                }
                                    /**
                                 * If no user to approve the report,then default 'status' is 'APPROVED' and 'userId' is 'SYSTEM'.
                                 */
                                var reportObj = {};
                                if(approveBy && approveBy.length>0){
                                    reportObj.status = "DRAFT";
                                    reportObj.statusAudit = [{
                                        userId: u._id,
                                        username: email,
                                        status: 'DRAFT'
                                    }];
                                }else{
                                    reportObj.status = "APPROVED";
                                    reportObj.statusAudit = [{
                                        userId: "SYSTEM",
                                        username: email,
                                        status: 'APPROVED'
                                    }];
                                }
                                db.smtReportDetails.findOne({createdOn: {$gte: gte, $lte: lte},
                                        reportCode: reportCode,
                                        rangeType: type,
                                        reportId: reportId,
                                        companyId: companyId,
                                        companyDivisionId: companyDivisionId,
                                        hierarchyId: levelCode,
                                        userId: u._id
                                }, function(err, isReportExist){
                                    if (!isReportExist) {
                                        reportObj = _.extend(reportObj,{
                                            createdOn: current,
                                            approveBy: approveBy,
                                            viewedBy: viewedBy,
                                            displayName: reportName,
                                            reportCode: reportCode,
                                            rangeType: type,
                                            reportId: reportId,
                                            companyId: companyId,
                                            companyDivisionId: companyDivisionId,
                                            hierarchyId: levelCode,
                                            userId: u._id,
                                            autoSubmitByUser: autoSubmitByUser,
                                            autoApprovedByManager: autoApprovedByManager
                                        });
                                        db.smtReportDetails.insert(reportObj, function(err, reportInsertedDetailsId){
                                            reportsGenerated.push(reportInsertedDetailsId);
                                            if (company && company.basicInfo && company.basicInfo.countryId) {
                                                var notificationObj = {};
                                                notificationObj.companyId = companyId;
                                                notificationObj.companyDivisionId = companyDivisionId;
                                                notificationObj.countryId = company.basicInfo.countryId;
                                                notificationObj.from = "SYSTEM";
                                                notificationObj.to = u._id;
                                                notificationObj.isActive = true;
                                                notificationObj.payLoad = {
                                                    "REPORT": reportCode,
                                                    "FREQUENCY": type,
                                                    "CREATEDAT": moment(new Date(current)).format("DD MMM")
                                                };
                                                var settingObj = _.findWhere(constant.smtNotificationMessage, {code: "SYSTEM-REPORT-GENERATED"});
                                                if (settingObj) {
                                                    notificationObj.type = settingObj.code;
                                                }
                                                db.smtNotifications.insert(notificationObj, function(err, doc){
                                                    if(err == null){
                                                    }
                                                });
                                            }
                                            getDepartmentDocumentByUserId(u._id, function(department){
                                                getSubDepartmentDocumentByUserId(u._id, function(subDep){
                                                    getSelectedUserRole(u._id, function(uid){
                                                        uniqueIdGenService(companyId, companyDivisionId, function(uniqId){
                                                            db.smtReportTransactions.insert({
                                                                companyId: companyId,
                                                                companyDivisionId: companyDivisionId,
                                                                departmentId: department._id,
                                                                subDepartmentId: subDep._id,
                                                                reportId: reportId,
                                                                reportDetailsId: reportInsertedDetailsId,
                                                                reportCode: reportCode,
                                                                fromUserId: u._id,
                                                                fromUserIdRole: uid,
                                                                toUserDetails: approveBy,
                                                                requestId: uniqId
                                                            }, function(err, doc){
                                                                if (err) {
                                                                    console.log(err);
                                                                }else{
                                                                    updateReportsData({"_id":reportInsertedDetailsId._id},"SYSTEM","REPORT_GENERATION", function(result){

                                                                    });
                                                                }
                                                            });    
                                                        });
                                                        
                                                    });
                                                    
                                                });
                                            });
                                        });    
                                    }else {
                                        console.log("Report already exist for- " + "user :" + u._id + ", report: " + reportCode + ", date: " + current + "; ID is:" + isReportExist._id);
                                    }    
                                });    
                            });    
                        });
                    });
                });
            });  
        });        
    }); 
}

function getLocationParentLocations(user, levels, isApprovals, callback){
    var parentId = "";
    var parentLocations = [];
    if (user && user.profile && user.profile.locationId) {
        parentId = user.profile.locationId;
        db.smtCompanyLocations.findOne({_id: parentId, isActive: true}, function(err, parentOne){
            if (parentOne) {
                _.each(parentOne.parentLocations, function (locationObj) {
                    let obj = {
                        hierarchyCode: locationObj.code,
                        locationId: locationObj.locationId,
                        status: 'DRAFT',
                        approveDate: ''
                    };
                    _.each(levels, function (l) {
                        if (l === obj.hierarchyCode) {
                            userExists(obj.locationId, function(isExists){
                                if(isExists){
                                    parentLocations.push(obj);
                                    callback(parentLocations);
                                }
                            });
                        }
                    });
                });
                if ((isApprovals && parentOne && parentOne.parentLocations && parentOne.parentLocations.length > 0) && (!parentLocations || parentLocations.length === 0) && levels.length > 0) {
                    let i = parentOne.parentLocations.length - 1;
                    let locations = parentOne.parentLocatiapprovedByLevelsons;
                    if (locations && locations.length) {
                        locations = _.sortBy(locations, 'code');
                        while (i && parentLocations.length === 0) {
                            let obj = {
                                hierarchyCode: locations[i].code,
                                locationId: locations[i].locationId,
                                status: 'DRAFT',
                                approveDate: ''
                            };
                            userExists(obj.locationId, function(isExists){
                                if(isExists){
                                    parentLocations.push(obj);
                                    callback(parentLocations);
                                }
                            });
                            i--;
                        }
                    }
                }
            }    
        });
    }

}

function userExists(locationId, callback){
    db.smtCompaniesUsers.findOne({
        locationId: locationId,
        isActive: true,
        'companyAssignedUserInfo.isActive': true
    }, function(err, user){
        if (!user || !user.companyAssignedUserInfo || user.companyAssignedUserInfo.length === 0)
        callback(false);
        else callback(true);
    });
}

function getDepartmentDocumentByUserId(userId, callback) {
    db.users.findOne({_id: userId}, function(err, user){
        let deptDoc = user && user.profile && user.profile.userDepartments ? _.findWhere(user.profile.userDepartments, {isActive: true}) : null;
        getDepartmentDocumentById(deptDoc.departmentId, function(getDepartmentDocumentById){
            callback(deptDoc && deptDoc.departmentId ? getDepartmentDocumentById : null);
        });
    })
};

function getSubDepartmentDocumentByUserId(userId, callback) {
    db.users.findOne({_id: userId}, function(err, user){
        let deptDoc = user && user.profile && user.profile.userDepartments ? _.findWhere(user.profile.userDepartments, {isActive: true}) : null;
        getSubDepartmentDocumentById(deptDoc.subDepartmentId, function(getSubDepartmentDocumentById){
            callback(deptDoc && deptDoc.subDepartmentId ? getSubDepartmentDocumentById : null);
        });
        
    });    
};

function getDepartmentDocumentById(deptId, callback) {
    db.smtCompanyDepartments.findOne({_id: deptId}, function(err, data){
        callback(data);
    });
};

function getSubDepartmentDocumentById(subDeptId, callback) {
    db.smtCompanySubDepartments.findOne({_id: subDeptId}, function(err, data){
        callback(data);
    });
};
function getSelectedUserRole(userId, callback) {
    db.users.findOne({_id: userId}, function(err, userData){
        if (userData && userData.roles) {
            if (userData.roles["company-group"]) {
                callback(userData.roles["company-group"][0]);
            }
        }
        else callback("");
    });
    
};

function updateReportsData(reportsUpdateQuery,userId, cronRecId){
    var updatedReports = [];
    var updateRepsQuery = {};

    if(reportsUpdateQuery){
       updateRepsQuery = _.extend({"updateCronId": {$nin:[cronRecId]}},reportsUpdateQuery);
    }
    db.smtReportDetails.find(updateRepsQuery).sort({"audit.createdAt":-1}, function(err, reportsDt){
        _.each(reportsDt,(reportRec)=>{
            if(reportRec && reportRec.reportCode && reportRec.rangeType){
                var reportTabName = _.findWhere(constant.SmtReportsTabNames, {reportCode: reportRec.reportCode}).tabName
                 var data = {
                     userId: reportRec.userId,
                     reportCode: reportRec.reportCode,
                     tabName: reportTabName,
                     date: reportRec.audit.createdAt,
                     rangeType: reportRec.rangeType,
                     dateRangeFlag: false,
                     dateRange: reportRec.audit.createdAt,
                     recordId: reportRec._id,
                     requestType : "REPORTS-DATA"
                };
                var repResult = new SmtReportsProcessor(data).processReportCode();
            }    
        });    
    });
}

function uniqueIdGenService(companyId, divisionId, callback){
    var id = "departmentCode"+"_"+companyId+"_"+divisionId;
    db.serialNumbers.findOne({_id: id}, function(err, ret){
        ret.seq = ret.seq + 1;
        db.serialNumbers.update({ _id: id },{$set:{seq:ret.seq}}, function(err, doc){});
        pad(ret.seq, 6, function(u_uid){
            callback("SMT-"+"REPORT"+"-" + u_uid);
        });
    });    
}

function pad(num, size, callback) {
    var s = "000000000" + num;
    callback(s.substr(s.length-size));
}

module.exports = {
  getTheUserHavingAppointmentInThisDateRange: getTheUserHavingAppointmentInThisDateRange,
  getAllowanceUsersBaseStation: getAllowanceUsersBaseStation,
  getCustomerMrIds: getCustomerMrIds,
  SendNotificationForBirthdayAnn: SendNotificationForBirthdayAnn,
  generateReportsEnterForUser: generateReportsEnterForUser
};