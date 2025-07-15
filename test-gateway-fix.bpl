:Process Name
  !Start
@Customer
  place order
  send: Payment
  receive: Confirmation
@System  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order -> !End
  send: Confirmation
  !End