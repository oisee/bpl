:IT Incident Management Process

@End User
  !Start
  experience issue
  send: Incident Report
  receive: Ticket Number
  receive: Status Update
  ?Issue Resolved
    +confirm resolution
    +rate service
    +!End
    -provide more info
    -send: Additional Details

@Service Desk
  receive: Incident Report
  log incident
  send: Ticket Number
  categorize issue
  ?Severity Level
    +|Critical| escalate immediately
    +|High| assign to L2
    +|Medium| assign to L1
    -|Low| add to queue
  send: Initial Response
  receive: Resolution Details
  verify resolution
  send: Status Update
  close ticket

@L1 Support
  receive incident
  analyze issue
  ?Can Resolve
    +apply fix
    +test solution
    +send: Resolution Details
    -escalate to L2
    -send: Escalation Note

@L2 Support
  receive escalation
  investigate root cause
  ?Known Issue
    +apply known fix
    +update knowledge base
    -research solution
    -test workaround
  implement solution
  send: Resolution Details
  
@L3 Support
  receive critical escalation
  perform deep analysis
  ?System Issue
    +fix system
    +deploy patch
    -vendor escalation
    -await vendor fix
  document solution
  send: Resolution Details

@Monitoring System
  detect anomaly
  ?Critical Alert
    +send: Auto Incident
    +page on-call
    -log warning
    -update dashboard

^Report @End User.send: Incident Report -> @Service Desk.receive: Incident Report
^Ticket @Service Desk.send: Ticket Number -> @End User.receive: Ticket Number
^L1 Assignment @Service Desk.assign to L1 -> @L1 Support.receive incident
^L2 Escalation @L1 Support.escalate to L2 -> @L2 Support.receive escalation
^L1 Resolution @L1 Support.send: Resolution Details -> @Service Desk.receive: Resolution Details
^L2 Resolution @L2 Support.send: Resolution Details -> @Service Desk.receive: Resolution Details
^Status @Service Desk.send: Status Update -> @End User.receive: Status Update
^Auto Alert @Monitoring System.send: Auto Incident -> @Service Desk.receive: Incident Report

#IncidentData Incident Report
#ResolutionData Resolution Details