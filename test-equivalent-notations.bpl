:Test Equivalent Notations

// Test 1: Reference task in same lane later
@Customer
  place order
  send: Payment
  kokoko <- place order
  receive: Confirmation

// Test 2: Reference task with fully qualified name
@System  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation 
  kokoko <- @Customer.place order

// Test 3: Forward reference to task in another lane
@Customer2
  place order -> @System2.kokoko
  send: Payment
  receive: Confirmation

@System2  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation 
  kokoko 

// Test 4: Forward reference to task not yet defined (implicit creation)
@Customer3
  place order -> kokoko
  send: Payment
  receive: Confirmation

@System3  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation 
  kokoko 

// All four should create equivalent connections:
// - place order connects to kokoko
// - kokoko is resolved to the correct lane
// - If not found, kokoko is created in Customer3 lane