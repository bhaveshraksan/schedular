var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var isObject = require('isobject');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtFormsTemplateAlias","smtFormTemplateCompanyAlias","smtUserFormsAlias",
	                     "smtCompanies","smtNotifications"]);

var sendNotificationToFillForm = function(){
	db.smtFormsTemplateAlias.find({"status": "ASSIGNED"}, function(err, templateAlias){
		_.each(templateAlias, function (tempAl) {
			db.smtFormTemplateCompanyAlias.findOne({_id: tempAl.formId}, function(err, companyAlias){
				if (tempAl && tempAl.autoApprovedByManager) {
	                approveByManager(tempAl._id);
	            }
			});
		});	
	});     	
}

function approveByManager(tempAlId){
	db.smtFormsTemplateAlias.findOne({_id: tempAlId}, function(err, templateAlias){
		var companyId = templateAlias.companyId;
        var companyDivisionId = templateAlias.companyDivisionId;
        var hierarchyCode = templateAlias.hierarchyCode;
        var formCode = templateAlias.formCode;
        var days = templateAlias.autoApprovedByManager.noOfDays || 0;
        var time = templateAlias.autoApprovedByManager.time || "00:00 AM";
        var reportTime = moment(time, "h:mm A", true).toDate();
        var expected = moment(reportTime).format("MM-DD-YYYY h:mm A");
        var current = moment().format("MM-DD-YYYY h:mm A");
        if (expected === current && templateAlias.autoApprovedByManager.value === true) {
        	var formDate = moment().add((-1 * days), "days").toDate();
            var firstDay = moment(formDate).startOf("day").toDate();
            var lastDay = moment(formDate).endOf("day").toDate();
            db.smtUserFormsAlias.find({
            	companyId: companyId,
                companyDivisionId: companyDivisionId,
                formCode: formCode,
                hierarchyCode: hierarchyCode,
                "approveBy.status": {$in: ["GENERATED"]},
                "statusAudit.status": "SUBMITTED",
                "statusAudit.createdOn": {
                    $gte: firstDay,
                    $lt: lastDay
                }
            }, function(err, existingForm){
            	//console.log(existingForm);
            	_.each(existingForm, function (formAlias) {
            		var formAliasId = formAlias._id;
            		if (formAlias && formAlias.approveBy) {
            			_.each(formAlias.approveBy, function (obj) {
	                        if (obj.status === "GENERATED") {
	                            return obj.status = "APPROVED", obj.approveDate = new Date();
	                        }
	                    });
	                    var statusAudit = {};
	                    statusAudit.userId = "SYSTEM";
	                    statusAudit.status = "APPROVED";
	                    statusAudit.username = "SYSTEM";
	                    statusAudit.createdOn = new Date();
	                    formAlias.statusAudit.push(statusAudit);
	                    db.smtCompanies.findOne({_id: formAlias.companyId}, function(err, company){
	                    	var notificationObj = {};
		                    notificationObj.companyId = formAlias.companyId;
		                    notificationObj.companyDivisionId = formAlias.companyDivisionId;
		                    notificationObj.countryId = company.basicInfo.countryId;
		                    notificationObj.type = "FORM-APPROVED";
		                    db.smtFormsTemplateAlias.findOne({_id: formAlias.formTypeId}, function(err, formTemplate){
		                    	notificationObj.payLoad = {
			                        "FORMNAME": formTemplate.formName,
			                        "CREATEDAT": moment(new Date()).format("DD MMM"),
			                        "CREATEDDATE": moment(formAlias.audit.createdAt).toDate(),
			                        "VERSION": "1.1"
			                    };
			                    notificationObj.isActive = true;
			                    notificationObj.baseId = formAliasId;
			                    var from = "SYSTEM";
			                    var to = [formAlias.userId];
			                    saveNotification(notificationObj, from, to);
		                    });
	                    });
            		} 	
            	});	
            })
        }
	});
}

function saveNotification(notificationObj,from,to){
    if(typeof notificationObj == 'object'){
	}else{
		console.log('notificationObj must be an object');
		return false;
	} 
	if(Array.isArray(to) == true){
	}else{
		console.log('to must be an array');
		return false;
	}
	if(typeof from == 'string'){
	}else{
		console.log('from must be an string');
		return false;
	}
     if(!from || !to || to.length<=0)
        //throw new Meteor.Error(403,getMessage("problemWithFetchSenderAndReceiver"));
    _.each(to,function (receiver) {
        //globalLogger.info(" Notification Object is ");
        notificationObj.from = from;
        notificationObj.to = receiver;
        notificationObj.isActive =true;
        //globalLogger.info(notificationObj);
        console.log(notificationObj);
        db.smtNotifications.insert(notificationObj, function(err, doc){});
    });
}

sendNotificationToFillForm()

