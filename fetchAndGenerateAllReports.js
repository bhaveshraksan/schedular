var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;
var constant = require('./constants.js');
// import moment from 'moment';
var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl, ["smtCompanies","smtCompaniesDivison","smtCompaniesUsers","smtCompanyLocations","users",
    "smtReportsGeneration","smtReportsTemplateAlias","smtFormTemplateCompanyAlias",
    "smtReportsTemplateAlias","smtReportsTemplateCompanyAlias","smtReportDetails",
    "smtNotifications","smtCompanyDepartments","smtReportTransactions","smtCompanySubDepartments",
    "smtReportsData"]);


var featchAllReports = function(){
    db.smtCompaniesDivison.find({"isActive":true}, function(err, companyDivs){
        var allDivs  = [];
        allDivs = _.map(companyDivs,function(divRec){
            return divRec._id;
        });
        if(allDivs &&  allDivs.length>0){
            db.smtReportsTemplateAlias.find({"status": "ASSIGNED","companyDivisionId":{$in: allDivs}}, function(err, smtReportsTemplateAlias){
                _.each(smtReportsTemplateAlias, function (reportAlias) {
                    db.smtReportsTemplateCompanyAlias.findOne({_id: reportAlias.reportId}, function(err, reportCompanyAlias){
                        if (reportCompanyAlias && reportCompanyAlias.isActive) {
                            _.each(reportAlias.autoGenerate, function (autoObj) {
                                var generationTime = getReportGenerationDate(autoObj);
                                if (generationTime) {
                                    var expected = moment(generationTime).format("MM-DD-YYYY h:mm A");
                                    var current = moment().format("MM-DD-YYYY h:mm A");
                                    if(expected === current){
                                        var type = autoObj.type;
                                        generateReportsEnterForUser(current, reportAlias.reportName, reportAlias.reportCode, type, reportAlias.hierarchyCode, reportAlias.companyId, reportAlias.companyDivisionId, reportAlias._id, reportAlias.hierarchyApproveBy, reportAlias.hierarchyViewedBy);
                                    }
                                }   
                            });    
                        }   
                    });
                });  
            });
        }    
    });
}

function getReportGenerationDate(autoGenerate) {
    var triggerTime = moment().format();
    if (autoGenerate && autoGenerate.type == "DAILY" && autoGenerate.value == true) {
        triggerTime = moment(autoGenerate.time, "h:mm A", true).format();
    } else if (autoGenerate && autoGenerate.type == "WEEKLY" && autoGenerate.value == true) {
        var todayDay = moment().format("ddd").toUpperCase();
        if (autoGenerate.day != todayDay) {
            return false;
        }
        triggerTime = moment(autoGenerate.time, "h:mm A", true).format();
    } else if (autoGenerate && autoGenerate.type == "MONTHLY" && autoGenerate.value == true) {
        var today = new Date();
        var lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        triggerTime = moment(lastDayOfMonth, "h:mm A", true).format();
        // bellow is correct as per the UX but now generate at the end of the month only
        // var todayDay = moment().format("ddd").toUpperCase();
        // if (autoGenerate.day != todayDay) {
        //     return false;
        // }
        // if (autoGenerate.week != getThisWeek()) {
        //     return false;
        // }
        // triggerTime = moment(autoGenerate.time, "h:mm A", true).format();
    }
    else return false;
    return triggerTime;
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
            })
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
                        var approveBy = getLocationParentLocations(u, approvedByLevels, true);
                        var viewedBy = getLocationParentLocations(u, viewedByLevel, false);
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
                            }
                            else{
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
                                        console.log(reportInsertedDetailsId);
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
                                            db.smtNotifications.insert(notificationObj, function(err, doc){});
                                        }
                                        var department = getDepartmentDocumentByUserId(u._id) || {};
                                        var subDep = getSubDepartmentDocumentByUserId(u._id) || {};
                                        db.smtReportTransactions.insert({
                                            companyId: companyId,
                                            companyDivisionId: companyDivisionId,
                                            departmentId: department._id,
                                            subDepartmentId: subDep._id,
                                            reportId: reportId,
                                            reportDetailsId: reportInsertedDetailsId,
                                            reportCode: reportCode,
                                            fromUserId: u._id,
                                            fromUserIdRole: getSelectedUserRole(u._id),
                                            toUserDetails: approveBy
                                        }, function(err, _id){
                                            if (err) {
                                                console.log(err);
                                            }else {
                                                    // To save the report data.
                                                updateReportsData({"_id":reportInsertedDetailsId},"SYSTEM","REPORT_GENERATION");

                                                db.smtReportDetails.update({_id: reportInsertedDetailsId}, {$set: {transactionId: _id}}, (error, doc) => {
                                                    if (error) {
                                                        console.log(error);
                                                    }
                                                });
                                            }
                                        });
                                        return u._id;
                                    });
                                }else {
                                    console.log("Report already exist for- " + "user :" + u._id + ", report: " + reportCode + ", date: " + current + "; ID is:" + isReportExist._id);
                                }    
                            });
                        });
                    });
                    db.smtReportsGeneration.insert({
                        reportCode: reportCode,
                        type: type,
                        levelCode: levelCode,
                        companyId: companyId,
                        companyDivisionId: companyDivisionId,
                        reportId: reportId,
                        userIds: userIds,
                        approvedByLevels: approvedByLevels
                    }, function(err, doc){});
                    return reportsGenerated;    
                });
            })
    });
}

function getLocationParentLocations(user, levels, isApprovals){
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
                            if (userExists(obj.locationId))// is user is active in that location
                                parentLocations.push(obj);
                        }
                    });
                });
                if ((isApprovals && parentOne && parentOne.parentLocations && parentOne.parentLocations.length > 0) && (!parentLocations || parentLocations.length === 0) && levels.length > 0) {
                    let i = parentOne.parentLocations.length - 1;
                    let locations = parentOne.parentLocations;
                    if (locations && locations.length) {
                        locations = _.sortBy(locations, 'code');
                        while (i && parentLocations.length === 0) {
                            let obj = {
                                hierarchyCode: locations[i].code,
                                locationId: locations[i].locationId,
                                status: 'DRAFT',
                                approveDate: ''
                            };
                            if (userExists(obj.locationId))
                                parentLocations.push(obj);
                            i--;
                        }
                    }
                }    
            }    
        });
    }    
}

function updateReportsData(reportsUpdateQuery,userId, cronRecId){
    // check(reportsUpdateQuery,Match.OneOf(Object,String));
    // check(userId,String);
    // check(cronRecId, Match.OneOf(null,String));

    var updatedReports = [];
    var updateRepsQuery = {};

    //console.log(reportsUpdateQuery);

    if(reportsUpdateQuery){
       updateRepsQuery = _.extend({"updateCronId": {$nin:[cronRecId]}},reportsUpdateQuery);
    }
    db.smtReportDetails.find(updateRepsQuery,{sort:{"audit.createdAt":-1}}, function(err, reportsDt){
        //console.log(err);
        _.each(reportsDt,(reportRec)=>{
             if(reportRec && reportRec.reportCode && reportRec.rangeType){
                 var reportTabName = _.findWhere(constants.SmtReportsTabNames, {reportCode: reportRec.reportCode}).tabName
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
                 db.smtReportsData.findOne({reportDetailsId:reportRec._id}, function(err, ifExist){
                    var reportDataCurr = [];
                    reportDataCurr = repResult.reportDetails;

                    var newRecRes = '';
                    if(ifExist){
                        var existAudit = ifExist.audit;
                        existAudit.updatedAt = new Date();
                        existAudit.updatedBy = userId;
                        ifExist.audit = existAudit;
                        ifExist.reportData = reportDataCurr;
                        db.smtReportsData.update({"_id":ifExist._id},{$set:ifExist}, function(err, doc){});
                    } 
                    else {
                        var rec = {};
                        rec.reportData = reportDataCurr;
                        rec.reportDetailsId = reportRec._id;
                        rec.audit ={};
                        rec.audit.createdAt = new Date();   
                        rec.audit.createdBy = userId;
                         
                        db.smtReportsData.insert(rec, function(err, doc){});
                    }

                    if(newRecRes){
                        db.smtReportDetails.update({"_id":reportRec._id},{$set:{"updateCronId": cronRecId}});
                        console.log("Data Save done for:"+reportRec._id);
                        updatedReports.push(reportRec._id);
                    }
                });
             }
        });
    });
   return updatedReports; 
};

function userExists(locationId){
    db.smtCompaniesUsers.findOne({
        locationId: locationId,
        isActive: true,
        'companyAssignedUserInfo.isActive': true
    }, function(err, user){
        if (!user || !user.companyAssignedUserInfo || user.companyAssignedUserInfo.length === 0) return false;
        else return true;
    });
}

function getDepartmentDocumentByUserId(userId) {
    db.users.findOne({_id: userId}, function(err, user){
        let deptDoc = user && user.profile && user.profile.userDepartments ? _.findWhere(user.profile.userDepartments, {isActive: true}) : null;
        return deptDoc && deptDoc.departmentId ? getDepartmentDocumentById(deptDoc.departmentId) : null;
    })
};

function getSubDepartmentDocumentByUserId(userId) {
    db.users.findOne({_id: userId}, function(err, user){
        let deptDoc = user && user.profile && user.profile.userDepartments ? _.findWhere(user.profile.userDepartments, {isActive: true}) : null;
        return deptDoc && deptDoc.subDepartmentId ? getSubDepartmentDocumentById(deptDoc.subDepartmentId) : null;
    });    
};

function getDepartmentDocumentById(deptId) {
    db.smtCompanyDepartments.findOne({_id: deptId}, function(err, data){
        return data;
    });
};
function getSubDepartmentDocumentById(subDeptId) {
    db.smtCompanySubDepartments.findOne({_id: subDeptId}, function(err, data){
        return data;
    });
};

function getSelectedUserRole(userId) {
    // if (userId && userId !== "") {
    // }
    // else {
    //     userId = Meteor.userId()
    // }
    //var userData = Meteor.users.findOne({_id: userId});
    db.users.findOne({_id: userId}, function(err, userData){
        if (userData && userData.roles) {
            if (userData.roles["company-group"]) {
                return userData.roles["company-group"][0];
            }
        }
        else return "";
    });
    
};

function getUniqueId(name,id){
    return "SMT-"+id+"-" + FormatUtil.leadingZeros(getNextSequence(name), 6);
}
function getNextSequence(name) {
    db.serialNumbers.findOne({ _id: name}, function(err, ret){
        ret.seq = ret.seq + 1;
        db.serialNumbers.update({ condition: name }, function(err, doc){});
        return ret.seq;     
    });
}

featchAllReports()

// var promise1 = new Promise(function (resolve, reject) {
//     resolve(db['smtCompaniesDivison'].find({"isActive": true}));//1
// });
// // var p1 = function (query) {//2
// //     return new Promise(function (resolve,rej) {
// //         resolve(db['smtReportsTemplateAlias'].find(query));

// //     })
// // }
// var collection = function (name,query) {//2
//     return new Promise(function (resolve,rej) {
//         resolve(db[name].find(query));

//     })
// }

// // var pp = function (query) {//2
// //     return new Promise(function (resolve,rej) {
// //         resolve(db['smtReportsTemplateAlias'].find(query));

// //     })
// // }

// // var pp1 = function (query) {
// //     return new Promise(function (resolve,rej) {
// //         resolve(db['smtReportsTemplateCompanyAlias'].find(query));
// //     })
// // }
// var promise2 =
//     promise1.then((s) => {
//         return s;//1
//     })
//     .then((divisions) => {
//         if (divisions.length) {
//             var divisionIds = divisions.map(function (d) {
//                 return d._id;
//             });
//             return collection("smtReportsTemplateAlias",{"status": "ASSIGNED", "companyDivisionId": {$in: divisionIds}});//2
//         }
//     })
//     .then((smtReportsTemplateAlias) => {
//         var x = [];
//         _.each(smtReportsTemplateAlias,function(reportAlias,index){
//             collection("SmtReportsTemplateCompanyAlias",{_id: reportAlias.reportId})
//             .then(function(reportCompanyAlias){
//                 console.log(index)
//                 if(reportCompanyAlias.isActive)
//                     x.push(reportAlias);
//                 }) 
//             // if(pp1({_id: reportAlias.reportId,isActive:true}))
//             //     x.push(reportAlias);//3
//         });
//         return x;
//     })
//     .then((reportAlias)=>{
//         console.log(reportAlias);
//     })

