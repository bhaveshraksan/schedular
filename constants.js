const lodash = require('lodash');

exports.smtNotificationMessage = [
    {
        code: "MR-SUBMITTED",
        text: "Waiting for the approval",
        title: "Approval",
        //path:"smtAsmTourPlans"
        path: "smtLocationHeadTourPlans"
    },
    {
        code: "ASM-APPROVED",
        text: "Approved",
        title: "Approval",
        //path:"smtTourPlans"
        path: "smtTourPlansMobNew"
    },
    {
        code: "ASM-REJECTED",
        text: "Rejected By ASM",
        title: "Approval",
        path: "smtTourPlansMobNew"
    },
    {
        code: "ASM-MR-JOINTWORK",
        text: "Jointwork with ASM",
        title: "Joint work",
        path: "smtJointWorkNotifications"
    },
    {
        code: "STATION-LEVEL-REMINDER",
        text: "Add appointment to station level appointment",
        title: "Station level appointment",
        path: "smtTourPlansMobNew"
    },
    {
        code: "FORM-SUBMITTED",
        text: "Waiting for the approval",
        title: "Approval",
        //path:"smtAsmTourPlans"
        //path: "smtLocationHeadTourPlans"
    },
    {
        code: "FORM-WITHDRAWN",
        text: "Form WithDrawn",
        title: "Approval",
        //path:"smtAsmTourPlans"
        //path: "smtLocationHeadTourPlans"
    },
    {
        code: "FORM-APPROVED",
        text: "Form Approved",
        title: "Approval",
        //path:"smtAsmTourPlans"
        //path: "smtLocationHeadTourPlans"
    },
    {
        code: "FORM-REJECTED",
        text: "Form Rejected",
        title: "Approval",
        //path:"smtAsmTourPlans"
        //path: "smtLocationHeadTourPlans"
    },
    {
        code: "MR-REPORT-SUBMITTED",
        text: "Report Submitted by MR",
        title: "Submission",
        path: "smtIndividualReports"
    },
    {
        code: "MR-REPORT-WITHDRAWN",
        text: "Report Withdrawn by MR",
        title: "Withdrawal",
        path: "smtIndividualReports"
    },
    {
        code: "ASM-REPORT-APPROVED",
        text: "Report Approved by ASM",
        title: "Approval",
        path: "smtASMReportsApproval"
    },
    {
        code: "ASM-REPORT-REJECTED",
        text: "Report Rejected by ASM",
        title: "Approval",
        path: "smtASMReportsApproval"
    },
    {
        code: "SYSTEM-REPORT-GENERATED",
        text: "Report generated",
        title: "Generation",
        path: "smtIndividualReports"
    },
    {
        code: "ASM-REPORT-RESUBMITTED",
        text: "Report asked to resubmit by ASM",
        title: "Generation",
        path: "smtIndividualReports"
    },

];

exports.SmtReportsTabNames = [
    {
        reportCode  : "DAILY-EXPENSES" ,
        tabName : "DAILY-EXPENSES"
    },
    {
        reportCode  : "CALLS-WORKDETAILS" ,
        tabName : "callAndWorkDetails"
    },
    {
        reportCode  : "BRAND-REMAINDER-DETAILS" ,
        tabName : "brandRemainder"
    },
    {
        reportCode  : "DOCTOR-DETAILS" ,
        tabName : "doctorDetailsReport"
    },
    {
        reportCode  : "STATION-WISE-DETAILS" ,
        tabName : "stationWiseDetails"
    },
    {
        reportCode  : "MISSED-DOCTOR-CALLS" ,
        tabName : "missedDoctorsAndCalls"
    }, {
        reportCode  : "EMPLOYEE-CALL-AVERAGES" ,
        tabName : "employeeCallAverages"
    },
    {
        reportCode  : "VISITS" ,
        tabName : "Visits"
    },
    {
        reportCode  : "WORK-DETAILS" ,
        tabName : "workDetailsReport"
    },
    {
        reportCode  : "EXPENSES" ,
        tabName : "expensesReports"
    },
    {
        reportCode  : "APPOINTMENTS" ,
        tabName : "appointmentReportDetails"
    },
    {
        reportCode  : "SPECIALITY-WISE-CALLS" ,
        tabName : "specialityWiseCalls"
    },
    {
        reportCode  : "CUSTOMER-COVERAGE" ,
        tabName : "customerCoverageTab"
    },
    {
        reportCode  : "LEAVE-REPORT" ,
        tabName : "leaveReportDetails"
    }
];