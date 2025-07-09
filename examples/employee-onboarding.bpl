:Employee Onboarding Process

@HR Department
  !Start
  receive job acceptance
  create employee record
  send: Welcome Email
  send: Onboarding Schedule
  prepare paperwork
  send: Document Request
  receive: Completed Documents
  verify documents
  ?Documents Valid
    +approve documents
    +send: IT Request
    +send: Facilities Request
    -request corrections
    -send: Document Corrections
  schedule orientation
  send: Orientation Invite
  conduct orientation
  complete onboarding
  !End

@New Employee
  send job acceptance
  receive: Welcome Email
  receive: Onboarding Schedule
  receive: Document Request
  complete paperwork
  send: Completed Documents
  receive: Document Corrections
  receive: Account Credentials
  receive: Workspace Assignment
  receive: Orientation Invite
  attend orientation
  complete training

@IT Department
  receive: IT Request
  create user account
  setup email
  configure permissions
  prepare equipment
  ?Equipment Ready
    +install software
    +send: Account Credentials
    -order equipment
    -wait for delivery
  setup workstation

@Facilities
  receive: Facilities Request
  assign workspace
  prepare desk
  order supplies
  create access badge
  send: Workspace Assignment

@Payroll
  receive employee data
  setup payroll account
  configure benefits
  send: Benefits Enrollment
  process first payment

^Welcome @HR Department.send: Welcome Email -> @New Employee.receive: Welcome Email
^Schedule @HR Department.send: Onboarding Schedule -> @New Employee.receive: Onboarding Schedule
^Documents @HR Department.send: Document Request -> @New Employee.receive: Document Request
^Submission @New Employee.send: Completed Documents -> @HR Department.receive: Completed Documents
^Corrections @HR Department.send: Document Corrections -> @New Employee.receive: Document Corrections
^IT Setup @HR Department.send: IT Request -> @IT Department.receive: IT Request
^Facilities Setup @HR Department.send: Facilities Request -> @Facilities.receive: Facilities Request
^Credentials @IT Department.send: Account Credentials -> @New Employee.receive: Account Credentials
^Workspace @Facilities.send: Workspace Assignment -> @New Employee.receive: Workspace Assignment
^Orientation @HR Department.send: Orientation Invite -> @New Employee.receive: Orientation Invite

#EmployeeData employee record
#DocumentData Completed Documents
#ITRequestData IT Request