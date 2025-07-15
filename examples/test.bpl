:Process Name
@Customer
  !Start
  place order
  send: Payment
  receive: Confirmation
@System
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation
  !End
  