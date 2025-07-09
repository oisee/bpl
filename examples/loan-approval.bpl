:Bank Loan Approval Process

@Customer
  !Start
  apply for loan
  send: Loan Application
  send: Financial Documents
  receive: Document Request
  send: Additional Documents
  receive: Approval Decision
  ?Loan Approved
    +sign agreement
    +send: Signed Agreement
    +receive: Loan Disbursement
    +!End
    -receive: Rejection Reason
    -!End

@Loan Officer
  receive: Loan Application
  review application
  ?Application Complete
    +verify identity
    +send: Credit Check Request
    -send: Document Request
    -receive: Additional Documents
  receive: Credit Report
  calculate risk score
  ?Risk Acceptable
    +prepare loan terms
    +send: Approval Request
    -prepare rejection
    -send: Rejection Decision

@Credit Bureau
  receive: Credit Check Request
  pull credit history
  analyze payment history
  calculate credit score
  generate report
  send: Credit Report

@Underwriting
  receive: Approval Request
  review financials
  assess collateral
  ?Meets Criteria
    +|Approve| approve loan
    +set interest rate
    +send: Final Approval
    -|Reject| reject application
    -document reasons
    -send: Final Rejection

@Legal Department
  receive approved loan
  prepare agreement
  add terms and conditions
  send: Draft Agreement
  receive: Signed Agreement
  verify signatures
  finalize contract

@Finance Department
  receive disbursement request
  verify account details
  process payment
  send: Loan Disbursement
  update accounting

^Application @Customer.send: Loan Application -> @Loan Officer.receive: Loan Application
^Documents @Customer.send: Financial Documents -> @Loan Officer.receive: Financial Documents
^Doc Request @Loan Officer.send: Document Request -> @Customer.receive: Document Request
^Additional Docs @Customer.send: Additional Documents -> @Loan Officer.receive: Additional Documents
^Credit Check @Loan Officer.send: Credit Check Request -> @Credit Bureau.receive: Credit Check Request
^Credit Report @Credit Bureau.send: Credit Report -> @Loan Officer.receive: Credit Report
^Approval Req @Loan Officer.send: Approval Request -> @Underwriting.receive: Approval Request
^Final Decision @Underwriting.send: Final Approval -> @Customer.receive: Approval Decision
^Agreement @Customer.send: Signed Agreement -> @Legal Department.receive: Signed Agreement
^Disbursement @Finance Department.send: Loan Disbursement -> @Customer.receive: Loan Disbursement

#ApplicationData Loan Application
#CreditData Credit Report
#AgreementData Signed Agreement