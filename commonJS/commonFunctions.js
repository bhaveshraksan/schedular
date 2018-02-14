var conFig = require("../config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var util = require('./saveNotification');
// var MJ = require('mongo-fast-join'),
//     mongoJoin = new MJ();
var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtCompanies","smtAllowanceTypesAlias","smtCustomerAppointments",
                         "smtCustomerAppointmentsMeetings","smtCompaniesUsers",
                         "smtCompanyLocations","smtMrDayReports","users"]);



function getTheUserHavingAppointmentInThisDateRange(dateRange, companyId){
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
	        var salesOfficerIds = _.union(salesOfficerIdsUserAppointment, salesOfficerIdsUserMeeting);
	        return salesOfficerIds;
        });
    });
}

function getAllowanceUsersBaseStation(userIds, allowances, dateRange, companyId, frequencyType) {
    _.each(userIds, function (userId) {
        let allowanceListObj = allowanceAsPerUserUserId(userId, allowances);
        let newAllowance = []
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
                db.smtMrDayReports.findOne({
                    companyId: companyId,
                    salesOfficerId: userId,
                    reportDate: {$gte: startOfDay, $lte: endOfDay}
                }, function(err, smtMrDayReports){
                    if (smtMrDayReports && smtMrDayReports.reportValues) {
                        var index = smtMrDayReports.reportValues.findIndex(function (r) {
                            if (r.userId === userId)
                            return r;
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
                        db.smtMrDayReports.update({_id: smtMrDayReports._id}, {$set: {reportValues: reportValues}}, function(err, doc){});
                    }else{
                        var reportObj = {};
                        var userInfo = Meteor.users.findOne({_id: userId});
                        reportObj.companyId = userInfo.profile.companyId;
                        reportObj.companyDivisionId = userInfo.profile.companyDivisionId;
                        reportObj.salesOfficerId = userId;
                        reportObj.reportDate = dateRange.endDate;
                        var audit = {};
                        audit.createdBy = 'SYSTEM'; /// its important
                        audit.createdOn = new Date();
                        reportObj.reportValues = [];
                        reportObj.reportValues.push({userId: userId, audit: audit, allowanceValues: newAllowance});
                        db.smtMrDayReports.insert(reportObj, function(err, doc){});
                    }   
                });
            }   
        }); 
    });
    return  
}

function allowanceAsPerUserUserId(userId, allowances){
    var allowanceListobj = [];
    var baseStationId = getUserBaseStationId(userId);
    if (baseStationId && baseStationId !== '') {
        db.smtCompanyLocations.findOne({_id: baseStationId}, function(err, location){
            if (location && location.allowanceSettings && location.allowanceSettings.isApplicable) {
                var allowanceValues = location.allowanceSettings.allowanceValues;
                if (allowanceValues && allowanceValues.length > 0) {
                    _.each(allowanceValues, function (allowanceValue) {
                        if (allowanceValue.isActive) {
                            _.each(allowanceValue.list, function (list) {
                                if (list.isActive && allowances.indexOf(list.allowanceTypeId) >= 0) {
                                    let obj = {};
                                    obj.value = list.sameStationTravel.value;
                                    obj.allowanceTypeId = list.allowanceTypeId;
                                    allowanceListobj.push(obj)
                                }   
                            }); 
                        }   
                    }); 
                }   
            }   
        })
    }
    return allowanceListobj;    
}

function getUserBaseStationId(userId) {
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
        return baseStId;
    });
}

function getCustomerMrIds(stationIds){
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
                return _.map(companyUsers, function (obj) {
                    return obj._id;
                });
            });
        });
    })
}

function SendNotificationForBirthdayAnn(mrIds, isAnniversary, customerName) {
    if (mrIds && mrIds.length > 0) {
        var notificationObj = {};
        db.users.findOne(mrIds[0], function(err, user){
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
            console.log("Sending " + notificationObj.type + "to " + notificationObj.to);
            util.saveNotification(notificationObj, notificationObj.from, notificationObj.to);
        })
    }    
}

module.exports = {
  getTheUserHavingAppointmentInThisDateRange: getTheUserHavingAppointmentInThisDateRange,
  getAllowanceUsersBaseStation: getAllowanceUsersBaseStation,
  getCustomerMrIds: getCustomerMrIds,
  SendNotificationForBirthdayAnn: SendNotificationForBirthdayAnn
};