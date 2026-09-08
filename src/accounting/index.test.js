const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const path = require('node:path');

const {
  DATA_OPERATION,
  INITIAL_BALANCE,
  OPERATION,
  createDataStore,
  displayMenu,
  formatBalance,
  performDataOperation,
  performOperation,
} = require('./index');

const applicationPath = path.join(__dirname, 'index.js');

function captureOutput() {
  const messages = [];
  return {
    messages,
    output: (message) => messages.push(message),
  };
}

function runApplication(input) {
  return spawnSync(process.execPath, [applicationPath], {
    input,
    encoding: 'utf8',
  });
}

test('TC-001: starts a new account with a 1000.00 balance', () => {
  assert.equal(createDataStore().read(), INITIAL_BALANCE);
});

test('TC-002: displays all four account menu options', () => {
  const { messages, output } = captureOutput();
  displayMenu(output);
  assert.deepEqual(messages, [
    '--------------------------------',
    'Account Management System',
    '1. View Balance',
    '2. Credit Account',
    '3. Debit Account',
    '4. Exit',
    '--------------------------------',
  ]);
});

test('TC-003: views the current balance', () => {
  const { messages, output } = captureOutput();
  const balance = performOperation(OPERATION.TOTAL, 0, createDataStore(), output);
  assert.equal(balance, 1000);
  assert.deepEqual(messages, ['Current balance: 1000.00']);
});

test('TC-004: credits an account with a positive decimal amount', () => {
  const store = createDataStore();
  const { messages, output } = captureOutput();
  assert.equal(performOperation(OPERATION.CREDIT, 250.5, store, output), 1250.5);
  assert.equal(store.read(), 1250.5);
  assert.deepEqual(messages, ['Amount credited. New balance: 1250.50']);
});

test('TC-005: credits an account with a whole-number amount', () => {
  const store = createDataStore();
  performOperation(OPERATION.CREDIT, 100, store, () => {});
  assert.equal(store.read(), 1100);
});

test('TC-006: accepts a zero credit and leaves the balance unchanged', () => {
  const store = createDataStore();
  performOperation(OPERATION.CREDIT, 0, store, () => {});
  assert.equal(store.read(), 1000);
});

test('TC-007: preserves the legacy negative-credit behavior', () => {
  const store = createDataStore();
  performOperation(OPERATION.CREDIT, -50, store, () => {});
  assert.equal(store.read(), 950);
});

test('TC-008: debits an account when funds are available', () => {
  const store = createDataStore();
  const { messages, output } = captureOutput();
  assert.equal(performOperation(OPERATION.DEBIT, 250.5, store, output), 749.5);
  assert.equal(store.read(), 749.5);
  assert.deepEqual(messages, ['Amount debited. New balance: 749.50']);
});

test('TC-009: permits a debit equal to the available balance', () => {
  const store = createDataStore();
  performOperation(OPERATION.DEBIT, 1000, store, () => {});
  assert.equal(store.read(), 0);
});

test('TC-010: rejects a debit greater than the available balance', () => {
  const store = createDataStore();
  const { messages, output } = captureOutput();
  performOperation(OPERATION.DEBIT, 1000.01, store, output);
  assert.equal(store.read(), 1000);
  assert.deepEqual(messages, ['Insufficient funds for this debit.']);
});

test('TC-011: applies the insufficient-funds check to the latest balance', () => {
  const store = createDataStore();
  performOperation(OPERATION.CREDIT, 200, store, () => {});
  performOperation(OPERATION.DEBIT, 1200.01, store, () => {});
  assert.equal(store.read(), 1200);
});

test('TC-012: accepts a zero debit and leaves the balance unchanged', () => {
  const store = createDataStore();
  performOperation(OPERATION.DEBIT, 0, store, () => {});
  assert.equal(store.read(), 1000);
});

test('TC-013: preserves the legacy negative-debit behavior', () => {
  const store = createDataStore();
  performOperation(OPERATION.DEBIT, -50, store, () => {});
  assert.equal(store.read(), 1050);
});

test('TC-014: preserves successful transactions across operations', () => {
  const store = createDataStore();
  performOperation(OPERATION.CREDIT, 100, store, () => {});
  assert.equal(performOperation(OPERATION.TOTAL, 0, store, () => {}), 1100);
  performOperation(OPERATION.DEBIT, 25, store, () => {});
  assert.equal(performOperation(OPERATION.TOTAL, 0, store, () => {}), 1075);
});

test('TC-015: leaves the balance unchanged after a rejected debit', () => {
  const store = createDataStore();
  performOperation(OPERATION.DEBIT, 1000.01, store, () => {});
  assert.equal(store.read(), 1000);
});

test('TC-016: reports invalid menu choices and continues', () => {
  const result = runApplication('5\n1\n4\n');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Invalid choice, please select 1-4\./);
  assert.match(result.stdout, /Current balance: 1000\.00/);
});

test('TC-017: exits with the goodbye message', () => {
  const result = runApplication('4\n');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Exiting the program\. Goodbye!/);
});

test('TC-018: preserves the current malformed-amount behavior', () => {
  const result = runApplication('2\nABC\n1\n4\n');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Amount credited\. New balance: NaN/);
  assert.match(result.stdout, /Current balance: NaN/);
});

test('TC-019: reads the stored balance', () => {
  const store = createDataStore(1234.56);
  assert.equal(performDataOperation(DATA_OPERATION.READ, 0, store), 1234.56);
});

test('TC-020: writes and then reads a stored balance', () => {
  const store = createDataStore();
  performDataOperation(DATA_OPERATION.WRITE, 1234.56, store);
  assert.equal(performDataOperation(DATA_OPERATION.READ, 0, store), 1234.56);
});

test('TC-021: ignores an unsupported data operation', () => {
  const store = createDataStore(1234.56);
  assert.equal(performDataOperation('UNKNOWN', 999, store), 999);
  assert.equal(store.read(), 1234.56);
});

test('TC-022: ignores an unsupported operations command', () => {
  const store = createDataStore(1234.56);
  const { messages, output } = captureOutput();
  const result = performOperation('UNKNOWN', 100, store, output);
  assert.equal(result, 1234.56);
  assert.equal(store.read(), 1234.56);
  assert.deepEqual(messages, []);
});

test('TC-023: formats balances to two decimal places', () => {
  assert.equal(formatBalance(1234.56), '1234.56');
  assert.equal(formatBalance(1234.567), '1234.57');
  assert.equal(formatBalance(1000000), '1000000.00');
});

test('TC-024: resets the in-memory balance in a new process', () => {
  const firstProcess = runApplication('2\n100\n4\n');
  const secondProcess = runApplication('1\n4\n');
  assert.equal(firstProcess.status, 0);
  assert.equal(secondProcess.status, 0);
  assert.match(secondProcess.stdout, /Current balance: 1000\.00/);
});
