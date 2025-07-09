:E-Commerce Order Fulfillment

@Customer
  !Start
  browse products
  add to cart
  proceed to checkout
  send: Order Details
  send: Payment Information
  receive: Order Confirmation
  receive: Shipment Notification
  receive: Package
  !End

@Payment Gateway
  receive: Payment Information
  validate card
  ?Payment Valid
    +process payment
    +send: Payment Success
    -send: Payment Failed
    -!End
  
@Order Management System
  receive: Order Details
  receive: Payment Success
  create order
  send: Order Confirmation
  send: Inventory Request
  receive: Inventory Confirmed
  send: Fulfillment Request
  receive: Shipment Details
  send: Shipment Notification
  update order status
  
@Inventory System
  receive: Inventory Request
  check stock
  ?Stock Available
    +reserve items
    +send: Inventory Confirmed
    -send: Out of Stock
    -trigger reorder
  
@Fulfillment Center
  receive: Fulfillment Request
  pick items
  pack order
  generate tracking
  ship package
  send: Shipment Details

^Payment Info @Customer.send: Payment Information -> @Payment Gateway.receive: Payment Information
^Order Details @Customer.send: Order Details -> @Order Management System.receive: Order Details
^Payment Result @Payment Gateway.send: Payment Success -> @Order Management System.receive: Payment Success
^Order Confirmation @Order Management System.send: Order Confirmation -> @Customer.receive: Order Confirmation
^Inventory Check @Order Management System.send: Inventory Request -> @Inventory System.receive: Inventory Request
^Inventory Response @Inventory System.send: Inventory Confirmed -> @Order Management System.receive: Inventory Confirmed
^Fulfillment Order @Order Management System.send: Fulfillment Request -> @Fulfillment Center.receive: Fulfillment Request
^Shipment Info @Fulfillment Center.send: Shipment Details -> @Order Management System.receive: Shipment Details
^Shipment Notice @Order Management System.send: Shipment Notification -> @Customer.receive: Shipment Notification

#OrderData Order Details
#PaymentData Payment Information
#ShipmentData Shipment Details