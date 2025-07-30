const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

/**
 * Business Process Test Suite
 * 
 * Tests based on real-world business processes to ensure
 * the BPL parser creates meaningful and correct connections.
 */

class BusinessProcessTester {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, bpl, assertions) {
    const parser = new BpmnLiteParser();
    const ast = parser.parse(bpl);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test: ${name}`);
    console.log('='.repeat(60));
    
    // Map task names to IDs
    const taskMap = {};
    Object.values(parser.tasks).forEach(task => {
      taskMap[task.name] = task.id;
    });
    
    let testPassed = true;
    const results = [];
    
    assertions.forEach(assertion => {
      let result;
      
      if (assertion.type === 'connection_exists') {
        const exists = ast.connections.some(conn => 
          conn.sourceRef === taskMap[assertion.from] && 
          conn.targetRef === taskMap[assertion.to]
        );
        result = exists === assertion.should_exist;
        results.push({
          passed: result,
          message: `${assertion.from} → ${assertion.to}: ${assertion.should_exist ? 'should exist' : 'should NOT exist'} (${exists ? 'exists' : 'missing'})`
        });
      } else if (assertion.type === 'connection_count') {
        const count = ast.connections.filter(conn => 
          conn.sourceRef === taskMap[assertion.task]
        ).length;
        result = count === assertion.expected;
        results.push({
          passed: result,
          message: `${assertion.task} should have ${assertion.expected} outgoing connections (has ${count})`
        });
      } else if (assertion.type === 'no_orphans') {
        // Check that all tasks (except Start) have at least one incoming connection
        const orphans = [];
        Object.values(parser.tasks).forEach(task => {
          if (task.type !== 'event' || task.eventType !== 'start') {
            const hasIncoming = ast.connections.some(conn => 
              conn.targetRef === task.id
            );
            if (!hasIncoming && !assertion.except?.includes(task.name)) {
              orphans.push(task.name);
            }
          }
        });
        result = orphans.length === 0;
        results.push({
          passed: result,
          message: orphans.length > 0 ? `Orphaned tasks: ${orphans.join(', ')}` : 'No orphaned tasks'
        });
      }
      
      if (!result) testPassed = false;
    });
    
    // Print results
    console.log('\nBPL:');
    console.log(bpl.split('\n').map(l => '  ' + l).join('\n'));
    
    console.log('\nAssertions:');
    results.forEach(r => {
      console.log(`  ${r.passed ? '✅' : '❌'} ${r.message}`);
    });
    
    if (testPassed) {
      this.passed++;
      console.log('\n✅ TEST PASSED');
    } else {
      this.failed++;
      console.log('\n❌ TEST FAILED');
    }
    
    this.tests.push({ name, passed: testPassed });
  }
  
  summary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total: ${this.tests.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    
    if (this.failed > 0) {
      console.log('\nFailed tests:');
      this.tests.filter(t => !t.passed).forEach(t => {
        console.log(`  - ${t.name}`);
      });
    }
  }
}

const tester = new BusinessProcessTester();

// Test 1: E-commerce Order Fulfillment
tester.test('E-commerce Order Fulfillment', 
`:Order Fulfillment Process
@Customer
  place order
  send: Order Details
  make payment
  receive: Shipping Notification

@Warehouse
  receive: Order Details
  ?In Stock
    +pick items
    -order from supplier
  pack order
  ship order
  send: Shipping Notification

@Supplier
  receive supply request
  ship to warehouse`,
[
  // Customer flow
  { type: 'connection_exists', from: 'place order', to: 'send: Order Details', should_exist: true },
  { type: 'connection_exists', from: 'send: Order Details', to: 'make payment', should_exist: true },
  { type: 'connection_exists', from: 'make payment', to: 'receive: Shipping Notification', should_exist: true },
  
  // Warehouse flow - correct gateway behavior
  { type: 'connection_exists', from: 'receive: Order Details', to: 'In Stock', should_exist: true },
  { type: 'connection_exists', from: 'receive: Order Details', to: 'pack order', should_exist: false }, // Should NOT skip gateway
  { type: 'connection_exists', from: 'In Stock', to: 'pick items', should_exist: true },
  { type: 'connection_exists', from: 'In Stock', to: 'order from supplier', should_exist: true },
  { type: 'connection_exists', from: 'pick items', to: 'pack order', should_exist: true },
  { type: 'connection_exists', from: 'order from supplier', to: 'pack order', should_exist: false }, // Negative branch shouldn't continue
  { type: 'connection_exists', from: 'pack order', to: 'ship order', should_exist: true },
  
  // Message flows
  { type: 'connection_count', task: 'send: Order Details', expected: 2 }, // Sequential + message
  { type: 'connection_count', task: 'send: Shipping Notification', expected: 1 }, // Just message
  
  // No orphans except supplier lane start
  { type: 'no_orphans', except: ['receive supply request'] }
]);

// Test 2: Insurance Claim Processing
tester.test('Insurance Claim Processing',
`:Insurance Claim Process
@Customer
  file claim
  send: Claim Details
  receive: Decision
  ?Approved
    +receive payment
    -file appeal

@Adjuster
  receive: Claim Details
  investigate claim
  ?Valid Claim
    +calculate payout
    -prepare rejection
  send: Decision

@Finance
  process payment
  send payment`,
[
  // Claim must go through investigation
  { type: 'connection_exists', from: 'receive: Claim Details', to: 'investigate claim', should_exist: true },
  { type: 'connection_exists', from: 'investigate claim', to: 'Valid Claim', should_exist: true },
  { type: 'connection_exists', from: 'receive: Claim Details', to: 'send: Decision', should_exist: false }, // Can't skip investigation
  { type: 'connection_exists', from: 'investigate claim', to: 'send: Decision', should_exist: false }, // Can't skip validation
  
  // Only valid claims lead to payout
  { type: 'connection_exists', from: 'calculate payout', to: 'send: Decision', should_exist: true },
  { type: 'connection_exists', from: 'prepare rejection', to: 'send: Decision', should_exist: false }, // Rejection doesn't continue
  
  // Customer response to decision
  { type: 'connection_exists', from: 'receive: Decision', to: 'Approved', should_exist: true },
  { type: 'connection_exists', from: 'Approved', to: 'receive payment', should_exist: true },
  { type: 'connection_exists', from: 'Approved', to: 'file appeal', should_exist: true },
  
  // Gateway connection counts
  { type: 'connection_count', task: 'Valid Claim', expected: 2 }, // Two branches
  { type: 'connection_count', task: 'Approved', expected: 2 } // Two branches
]);

// Test 3: Software Release Process
tester.test('Software Release Process',
`:Software Release Pipeline
@Developer
  commit code
  send: Code Review Request
  receive: Review Feedback
  ?Review Passed
    +merge to main
    -fix issues
  run tests

@Reviewer
  receive: Code Review Request
  review code
  ?Code Quality OK
    +approve PR
    -request changes
  send: Review Feedback

@CI/CD
  detect merge
  build application
  ?Build Success
    +deploy to staging
    -notify failure
  run integration tests
  ?Tests Pass
    +deploy to production
    -rollback changes`,
[
  // Developer flow with gateway
  { type: 'connection_exists', from: 'receive: Review Feedback', to: 'Review Passed', should_exist: true },
  { type: 'connection_exists', from: 'Review Passed', to: 'merge to main', should_exist: true },
  { type: 'connection_exists', from: 'Review Passed', to: 'fix issues', should_exist: true },
  { type: 'connection_exists', from: 'merge to main', to: 'run tests', should_exist: true },
  { type: 'connection_exists', from: 'fix issues', to: 'run tests', should_exist: false }, // Failed review doesn't continue
  { type: 'connection_exists', from: 'receive: Review Feedback', to: 'run tests', should_exist: false }, // Must go through gateway
  
  // CI/CD pipeline with multiple gateways
  { type: 'connection_exists', from: 'build application', to: 'Build Success', should_exist: true },
  { type: 'connection_exists', from: 'Build Success', to: 'deploy to staging', should_exist: true },
  { type: 'connection_exists', from: 'deploy to staging', to: 'run integration tests', should_exist: true },
  { type: 'connection_exists', from: 'notify failure', to: 'run integration tests', should_exist: false }, // Build failure stops flow
  { type: 'connection_exists', from: 'run integration tests', to: 'Tests Pass', should_exist: true },
  { type: 'connection_exists', from: 'build application', to: 'run integration tests', should_exist: false }, // Can't skip deployment
  
  // Each gateway controls its flow
  { type: 'connection_count', task: 'Build Success', expected: 2 },
  { type: 'connection_count', task: 'Tests Pass', expected: 2 }
]);

// Test 4: HR Recruitment Process
tester.test('HR Recruitment Process',
`:Recruitment Process
@Candidate
  submit application
  receive: Interview Invitation
  attend interview
  receive: Decision

@HR
  screen applications
  ?Qualified
    +schedule interview
    -send rejection
  ---
  check references
  make decision
  send: Decision

@Manager
  conduct interview
  ?Good Fit
    +recommend hire
    -recommend reject
  send feedback to HR`,
[
  // Screening process
  { type: 'connection_exists', from: 'screen applications', to: 'Qualified', should_exist: true },
  { type: 'connection_exists', from: 'Qualified', to: 'schedule interview', should_exist: true },
  { type: 'connection_exists', from: 'Qualified', to: 'send rejection', should_exist: true },
  
  // Connection break isolation
  { type: 'connection_exists', from: 'schedule interview', to: 'check references', should_exist: false }, // Broken by ---
  { type: 'connection_exists', from: 'send rejection', to: 'check references', should_exist: false }, // Broken by ---
  { type: 'connection_exists', from: 'check references', to: 'make decision', should_exist: true },
  
  // Manager interview process
  { type: 'connection_exists', from: 'conduct interview', to: 'Good Fit', should_exist: true },
  { type: 'connection_exists', from: 'Good Fit', to: 'recommend hire', should_exist: true },
  { type: 'connection_exists', from: 'Good Fit', to: 'recommend reject', should_exist: true },
  { type: 'connection_exists', from: 'recommend hire', to: 'send feedback to HR', should_exist: true },
  { type: 'connection_exists', from: 'recommend reject', to: 'send feedback to HR', should_exist: false } // Negative branch ends
]);

// Test 5: Customer Support Escalation
tester.test('Customer Support Escalation',
`:Support Ticket Process
@Customer
  create ticket
  describe issue
  receive: Resolution
  ?Satisfied
    +close ticket
    -escalate complaint

@L1Support
  receive ticket
  ?Can Resolve
    +provide solution
    -escalate to L2
  send: Resolution

@L2Support
  receive escalation
  investigate deeply
  ?Root Cause Found
    +fix issue
    +document solution
    -escalate to engineering
  notify L1

@Engineering
  receive critical escalation
  debug issue
  deploy fix`,
[
  // L1 support flow
  { type: 'connection_exists', from: 'receive ticket', to: 'Can Resolve', should_exist: true },
  { type: 'connection_exists', from: 'Can Resolve', to: 'provide solution', should_exist: true },
  { type: 'connection_exists', from: 'Can Resolve', to: 'escalate to L2', should_exist: true },
  { type: 'connection_exists', from: 'provide solution', to: 'send: Resolution', should_exist: true },
  { type: 'connection_exists', from: 'escalate to L2', to: 'send: Resolution', should_exist: false }, // Escalation doesn't send resolution
  
  // L2 support with multiple positive branches
  { type: 'connection_exists', from: 'investigate deeply', to: 'Root Cause Found', should_exist: true },
  { type: 'connection_exists', from: 'Root Cause Found', to: 'fix issue', should_exist: true },
  { type: 'connection_exists', from: 'Root Cause Found', to: 'document solution', should_exist: true },
  { type: 'connection_exists', from: 'fix issue', to: 'notify L1', should_exist: true },
  { type: 'connection_exists', from: 'document solution', to: 'notify L1', should_exist: true }, // Both positive branches continue
  { type: 'connection_exists', from: 'escalate to engineering', to: 'notify L1', should_exist: false }, // Engineering escalation doesn't notify
  
  // Customer satisfaction check
  { type: 'connection_exists', from: 'receive: Resolution', to: 'Satisfied', should_exist: true },
  { type: 'connection_count', task: 'Satisfied', expected: 2 }
]);

// Run summary
tester.summary();

// Final recommendations
console.log('\n\n=== BUSINESS PROCESS TEST CONCLUSIONS ===\n');
console.log('The tests show that meaningful business processes require:');
console.log('\n1. GATEWAY INTEGRITY');
console.log('   - Gateways must control flow, not be bypassed');
console.log('   - Tasks before gateways cannot skip to tasks after branches');
console.log('\n2. BRANCH SEMANTICS');
console.log('   - Positive branches (+) continue the main process');
console.log('   - Negative branches (-) typically end or require special handling');
console.log('   - Multiple positive branches can converge (e.g., parallel tasks)');
console.log('\n3. PROCESS ISOLATION');
console.log('   - Connection breaks (---) create isolated sections');
console.log('   - Different lanes have independent flows');
console.log('   - Message flows connect specific send/receive pairs only');
console.log('\n4. BUSINESS LOGIC PRESERVATION');
console.log('   - Failed validations don\'t lead to success actions');
console.log('   - Escalations follow different paths than resolutions');
console.log('   - Quality gates actually gate the process');
console.log('\nThe current parser implementation violates these principles,');
console.log('making it unsuitable for real business process modeling.');