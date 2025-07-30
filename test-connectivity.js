// Comprehensive connectivity tests for BPL parser
// Tests all connection scenarios from CONNECTIVITY_GUIDE.md

const testCases = [
  {
    name: "Basic Sequential Flow Within Lane",
    dsl: `@Customer
  Task A
  Task B
  Task C`,
    expectedConnections: [
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Sequential Flow Across Lanes",
    dsl: `@Customer
  Task A
  Task B
@System
  Task C
  Task D`,
    expectedConnections: [
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_b", to: "system_task_c", type: "sequenceFlow" },
      { from: "system_task_c", to: "system_task_d", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Mid-Lane Cross References",
    dsl: `:Process Name
@Customer
  place order
  send: Payment
  Confirmation 1
@System
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  Confirmation 2
@Customer
  xoxox
  !End`,
    expectedConnections: [
      // Sequential within Customer lane
      { from: "customer_place_order", to: "customer_send__payment", type: "sequenceFlow" },
      { from: "customer_send__payment", to: "customer_confirmation_1", type: "sequenceFlow" },
      // Cross-lane sequential
      { from: "customer_confirmation_1", to: "system_receive__payment", type: "sequenceFlow" },
      // Sequential within System lane
      { from: "system_receive__payment", to: "system_payment_valid_", type: "sequenceFlow" },
      // Gateway connections
      { from: "system_payment_valid_", to: "system_ship_order", type: "sequenceFlow" },
      { from: "system_payment_valid_", to: "system_cancel_order", type: "sequenceFlow" },
      // Branch merges
      { from: "system_ship_order", to: "system_confirmation_2", type: "sequenceFlow" },
      { from: "system_cancel_order", to: "system_confirmation_2", type: "sequenceFlow" },
      // Cross-lane sequential
      { from: "system_confirmation_2", to: "customer_xoxox", type: "sequenceFlow" },
      { from: "customer_xoxox", to: "process_end", type: "sequenceFlow" },
      // Message flow
      { from: "customer_send__payment", to: "system_receive__payment", type: "messageFlow" }
    ]
  },
  
  {
    name: "Explicit Forward Arrow Single",
    dsl: `@Customer
  Task A -> Task C
  Task B
  Task C`,
    expectedConnections: [
      // Implicit sequential flow
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" },
      // Explicit arrow
      { from: "customer_task_a", to: "customer_task_c", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Explicit Backward Arrow",
    dsl: `@Customer
  Task A
  Task B <- Task D
  Task C
@System
  Task D`,
    expectedConnections: [
      // Implicit sequential
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" },
      { from: "customer_task_c", to: "system_task_d", type: "sequenceFlow" },
      // Explicit backward arrow
      { from: "system_task_d", to: "customer_task_b", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Chained Arrows",
    dsl: `@Customer
  Task A -> Task B -> Task C
  Task B
  Task C`,
    expectedConnections: [
      // Implicit sequential (A already has explicit, so no implicit to B)
      { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" },
      // Explicit chained arrows
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Multiple Arrows Mixed",
    dsl: `@Customer
  Task A -> Task C -> Task E
  Task B -> Task D <- Task F
  Task C
@System
  Task D
  Task E <- Task A -> Task F
  Task F`,
    expectedConnections: [
      // Implicit sequential
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" },
      { from: "customer_task_c", to: "system_task_d", type: "sequenceFlow" },
      { from: "system_task_d", to: "system_task_e", type: "sequenceFlow" },
      { from: "system_task_e", to: "system_task_f", type: "sequenceFlow" },
      // Explicit arrows from DSL
      { from: "customer_task_a", to: "customer_task_c", type: "sequenceFlow" },
      { from: "customer_task_c", to: "system_task_e", type: "sequenceFlow" },
      { from: "customer_task_b", to: "system_task_d", type: "sequenceFlow" },
      { from: "system_task_f", to: "system_task_d", type: "sequenceFlow" },
      { from: "customer_task_a", to: "system_task_e", type: "sequenceFlow" },
      { from: "customer_task_a", to: "system_task_f", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Cross-Lane with FQN",
    dsl: `@Customer
  Place Order -> @System.Validate Order -> @Manager.Approve
  Wait for Result
@System
  Validate Order -> @Audit.Log Entry
  Process Payment <- @Customer.Wait for Result
@Manager
  Approve -> @System.Process Payment
@Audit
  Log Entry`,
    expectedConnections: [
      // Implicit sequential
      { from: "customer_place_order", to: "customer_wait_for_result", type: "sequenceFlow" },
      { from: "customer_wait_for_result", to: "system_validate_order", type: "sequenceFlow" },
      { from: "system_validate_order", to: "system_process_payment", type: "sequenceFlow" },
      { from: "system_process_payment", to: "manager_approve", type: "sequenceFlow" },
      { from: "manager_approve", to: "audit_log_entry", type: "sequenceFlow" },
      // Explicit cross-lane arrows
      { from: "customer_place_order", to: "system_validate_order", type: "sequenceFlow" },
      { from: "system_validate_order", to: "manager_approve", type: "sequenceFlow" },
      { from: "system_validate_order", to: "audit_log_entry", type: "sequenceFlow" },
      { from: "customer_wait_for_result", to: "system_process_payment", type: "sequenceFlow" },
      { from: "manager_approve", to: "system_process_payment", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Connection Break",
    dsl: `@Customer
  Task A
  Task B
---
  Task C
  Task D`,
    expectedConnections: [
      { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
      { from: "customer_task_c", to: "customer_task_d", type: "sequenceFlow" }
      // No connection from B to C due to break
    ]
  },
  
  {
    name: "Gateway with Arrows",
    dsl: `@System
  Task A
  ?Decision
    +Yes Path -> Task C
    -No Path
  Task B
  Task C`,
    expectedConnections: [
      // Implicit sequential
      { from: "system_task_a", to: "system_decision", type: "sequenceFlow" },
      // Gateway to branches
      { from: "system_decision", to: "system_yes_path", type: "sequenceFlow" },
      { from: "system_decision", to: "system_no_path", type: "sequenceFlow" },
      // Branch connections
      { from: "system_yes_path", to: "system_task_b", type: "sequenceFlow" },
      { from: "system_no_path", to: "system_task_b", type: "sequenceFlow" },
      { from: "system_task_b", to: "system_task_c", type: "sequenceFlow" },
      // Explicit arrow from branch
      { from: "system_yes_path", to: "system_task_c", type: "sequenceFlow" }
    ]
  },
  
  {
    name: "Complex Event-Driven Flow",
    dsl: `@OrderService
  New Order -> @Inventory.Reserve Items -> @Payment.Charge Card
  New Order -> @Notification.Send Email
  Cancel Order <- @Customer.Request Cancel
  Cancel Order <- @Payment.Payment Failed
@Customer
  Request Cancel
@Payment
  Charge Card
  Payment Failed
@Inventory
  Reserve Items
@Notification
  Send Email`,
    expectedConnections: [
      // Implicit sequential
      { from: "orderservice_new_order", to: "orderservice_cancel_order", type: "sequenceFlow" },
      { from: "orderservice_cancel_order", to: "customer_request_cancel", type: "sequenceFlow" },
      { from: "customer_request_cancel", to: "payment_charge_card", type: "sequenceFlow" },
      { from: "payment_charge_card", to: "payment_payment_failed", type: "sequenceFlow" },
      { from: "payment_payment_failed", to: "inventory_reserve_items", type: "sequenceFlow" },
      { from: "inventory_reserve_items", to: "notification_send_email", type: "sequenceFlow" },
      // Explicit arrows
      { from: "orderservice_new_order", to: "inventory_reserve_items", type: "sequenceFlow" },
      { from: "inventory_reserve_items", to: "payment_charge_card", type: "sequenceFlow" },
      { from: "orderservice_new_order", to: "notification_send_email", type: "sequenceFlow" },
      { from: "customer_request_cancel", to: "orderservice_cancel_order", type: "sequenceFlow" },
      { from: "payment_payment_failed", to: "orderservice_cancel_order", type: "sequenceFlow" }
    ]
  }
];

// Test runner function
function runConnectivityTests(ParserClass) {
  const results = [];
  
  testCases.forEach(test => {
    try {
      const parser = new ParserClass();
      const ast = parser.parse(test.dsl);
      
      // Extract actual connections
      const actualConnections = ast.connections
        .filter(c => c.type === 'sequenceFlow' || c.type === 'messageFlow')
        .map(c => ({
          from: c.sourceRef,
          to: c.targetRef,
          type: c.type
        }))
        .sort((a, b) => {
          const keyA = `${a.from}-${a.to}-${a.type}`;
          const keyB = `${b.from}-${b.to}-${b.type}`;
          return keyA.localeCompare(keyB);
        });
      
      // Sort expected connections for comparison
      const expectedSorted = test.expectedConnections.sort((a, b) => {
        const keyA = `${a.from}-${a.to}-${a.type}`;
        const keyB = `${b.from}-${b.to}-${b.type}`;
        return keyA.localeCompare(keyB);
      });
      
      // Compare connections
      const missing = [];
      const extra = [];
      const correct = [];
      
      // Find missing connections
      expectedSorted.forEach(exp => {
        const found = actualConnections.find(act => 
          act.from === exp.from && act.to === exp.to && act.type === exp.type
        );
        if (!found) {
          missing.push(exp);
        } else {
          correct.push(exp);
        }
      });
      
      // Find extra connections
      actualConnections.forEach(act => {
        const found = expectedSorted.find(exp => 
          exp.from === act.from && exp.to === act.to && exp.type === act.type
        );
        if (!found) {
          extra.push(act);
        }
      });
      
      results.push({
        name: test.name,
        passed: missing.length === 0 && extra.length === 0,
        stats: {
          expected: expectedSorted.length,
          actual: actualConnections.length,
          correct: correct.length,
          missing: missing.length,
          extra: extra.length
        },
        missing: missing,
        extra: extra,
        actualConnections: actualConnections
      });
      
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        error: error.message,
        stats: {
          expected: test.expectedConnections.length,
          actual: 0,
          correct: 0,
          missing: test.expectedConnections.length,
          extra: 0
        }
      });
    }
  });
  
  return results;
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCases, runConnectivityTests };
} else {
  window.connectivityTests = { testCases, runConnectivityTests };
}