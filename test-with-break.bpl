:Order Process

@Customer
  place order
  send: Payment Information
  "Customer waits for confirmation
  receive: Order Confirmation
  wait for confirmation
  ---
@System
  receive: Payment Information
  process order
  validate payment
  ?Payment successful
    +post payment
    -stop order processing
  ship order
  send: Order Confirmation

^Order @Customer.place order -> @System.process order
#OrderData place order