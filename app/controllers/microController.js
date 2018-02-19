'use strict';
var conFig = require("../../config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var str2json = require('string-to-json');
var commonjs = require('../../commonJS/commonFunctions');

var mongoUrl = conFig.mongourl; //"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtReportsTemplateAlias", "smtReportsTemplateCompanyAlias"]);

exports.generateCustomReports = (req, res) => {
	if(typeof req.body.repQuery == "object"){
	}else{
		console.log('repQuery must be an object');
		return false;
	}
	if(typeof req.body.freq == "string"){
	}else{
		console.log('frequency must be an string');
		return false;
	}
	if(typeof req.body.startDateOfReports == "string"){
	}else{
		console.log('startDateOfReports must be an string');
		return false;
	}
	if(typeof req.body.endDateOfReports == "string"){
	}else{
		console.log('endDateOfReports must be an string');
		return false;
	}
	var repQuery = req.body.repQuery;
	var freq = req.body.freq;
	var startDateOfReports = req.body.startDateOfReports;
	var endDateOfReports = req.body.endDateOfReports;
	if(freq && checkIsExistInArray(freq, ["MONTHLY","DAILY","WEEKLY"])){
		var type = freq;
        var newQuery = _.extend(repQuery,{"status": "ASSIGNED"});
        var reportsGenerated = [];
        var selectedDateRanges = getMonthsBetweenDates(moment(startDateOfReports,"YYYY-MM-DD").toDate(),moment(endDateOfReports,"YYYY-MM-DD").toDate())
        var reportsDates  = [];
        if(selectedDateRanges && selectedDateRanges.length>0){
        	if(type === "MONTHLY"){
        		_.each(selectedDateRanges,function(mRec){
                    if(mRec && mRec.startDate && mRec.endDate){
                        reportsDates.push(mRec.endDate);
                    }
                });
        	}else if(type === "DAILY"){
            	_.each(selectedDateRanges,function(mRec){
	                if(mRec && mRec.startDate && mRec.endDate){
	                    for(var st = mRec.startDate; st<=mRec.endDate;){
	                        reportsDates.push(st);
	                        st= moment(st).add(1, "day").toDate();
	                    }
	                }
	            });
	        }else if(type === "WEEKLY"){

            }
            if(reportsDates && reportsDates.length>0){
            	db.smtReportsTemplateAlias.find(newQuery, function(err, smtReportsTemplateAlias){
            		_.each(smtReportsTemplateAlias, function (reportAlias) {
            			db.smtReportsTemplateCompanyAlias.findOne({_id: reportAlias.reportId}, function(err, reportCompanyAlias){
            				if (reportCompanyAlias && reportCompanyAlias.isActive) {
            					_.each(reportAlias.autoGenerate, function (autoObj) {
            					    if(type === autoObj.type){
            					    	_.each(reportsDates,function(dateRec){
            					    		commonjs.generateReportsEnterForUser(dateRec, reportAlias.reportName, reportAlias.reportCode, type, reportAlias.hierarchyCode, reportAlias.companyId, reportAlias.companyDivisionId, reportAlias._id, reportAlias.hierarchyApproveBy, reportAlias.hierarchyViewedBy);
            					    	}); 	
            					 	}	
            					});	
            				}	
            			})
            		});	
            	});
            }	
        }	
	}
};

function checkIsExistInArray(checkWith, checkIn) {
    var isExist = false;
    if (checkWith != '' && checkWith != undefined && checkIn != '' && checkIn != undefined && checkIn.length > 0) {
        var recIndex = checkIn.findIndex(function (chkRec) {
            if (chkRec == checkWith) {
                return chkRec;
            }
        });

        if (recIndex != -1) {
            isExist = true;
        }
    }
    return isExist;
};

function getMonthsBetweenDates(startDate, endDate) {
    var startYear = (startDate).getFullYear();
    var endYear = (endDate).getFullYear();
    var startDate = moment(startDate).add(1, 'seconds').toDate();
    var monthWiseDateRangeArray = [];
    if (startYear === endYear) {
        var firstMonth = (startDate).getMonth();
        var lastMonth = (endDate).getMonth();
        for (var m = firstMonth; m <= lastMonth; m++) {
            var dateRangeObj = {};
            dateRangeObj.startDate = startDate;
            if (m === lastMonth) {
                dateRangeObj.endDate = moment(endDate).endOf("day").toDate();
            } else {
                dateRangeObj.endDate = moment(startDate).endOf("month").toDate();
            }
            monthWiseDateRangeArray.push(dateRangeObj);
            startDate = moment(startDate).add(1, "month").toDate();
            startDate = moment(startDate).startOf("month").toDate();
        }

    } else {
        if (endYear > startYear) {
            for (var y = startYear; y <= endYear; y++) {
                var yearEnd = moment(startDate).endOf("year").toDate()
                var firstMonth = (startDate).getMonth();
                if (y < endYear) {
                    var lastMonth = (yearEnd).getMonth();
                } else {
                    var lastMonth = (endDate).getMonth();
                }
                for (var m = firstMonth; m <= lastMonth; m++) {
                    var dateRangeObj = {};
                    dateRangeObj.startDate = startDate;
                    if (y === endYear && m === lastMonth) {
                        dateRangeObj.endDate = moment(endDate).endOf("day").toDate();
                    } else {
                        dateRangeObj.endDate = moment(startDate).endOf("month").toDate();
                    }
                    monthWiseDateRangeArray.push(dateRangeObj);
                    startDate = moment(startDate).add(1, "month").toDate();
                    startDate = moment(startDate).startOf("month").toDate();
                }
            }
        }
    }
    return monthWiseDateRangeArray;
}

