const readline = require('node:readline');

const INITIAL_BALANCE = 1000;
const OPERATION = Object.freeze({
  TOTAL: 'TOTAL',
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
});
const DATA_OPERATION = Object.freeze({
  READ: 'READ',
  WRITE: 'WRITE',
});

function createDataStore(initialBalance = INITIAL_BALANCE) {
  let storageBalance = initialBalance;

  return {
    read() {
      return storageBalance;
    },
    write(balance) {
      storageBalance = balance;
    },
  };
}

function formatBalance(balance) {
  return Number(balance).toFixed(2);
}

function performDataOperation(operation, balance, dataStore) {
  if (operation === DATA_OPERATION.READ) {
    return dataStore.read();
  }

  if (operation === DATA_OPERATION.WRITE) {
    dataStore.write(balance);
    return balance;
  }

  return balance;
}

function performOperation(operation, amount, dataStore, output = console.log) {
  if (operation === OPERATION.TOTAL) {
    const balance = performDataOperation(DATA_OPERATION.READ, 0, dataStore);
    output(`Current balance: ${formatBalance(balance)}`);
    return balance;
  }

  if (operation === OPERATION.CREDIT) {
    const balance = performDataOperation(DATA_OPERATION.READ, 0, dataStore) + amount;
    performDataOperation(DATA_OPERATION.WRITE, balance, dataStore);
    output(`Amount credited. New balance: ${formatBalance(balance)}`);
    return balance;
  }

  if (operation === OPERATION.DEBIT) {
    const balance = performDataOperation(DATA_OPERATION.READ, 0, dataStore);
    if (balance >= amount) {
      const updatedBalance = balance - amount;
      performDataOperation(DATA_OPERATION.WRITE, updatedBalance, dataStore);
      output(`Amount debited. New balance: ${formatBalance(updatedBalance)}`);
      return updatedBalance;
    }

    output('Insufficient funds for this debit.');
    return balance;
  }

  return performDataOperation(DATA_OPERATION.READ, 0, dataStore);
}

function displayMenu(output = console.log) {
  output('--------------------------------');
  output('Account Management System');
  output('1. View Balance');
  output('2. Credit Account');
  output('3. Debit Account');
  output('4. Exit');
  output('--------------------------------');
}

function createApplication(input = process.stdin, output = console.log) {
  const dataStore = createDataStore();
  const terminal = readline.createInterface({ input });
  const pendingLines = [];
  const pendingQuestions = [];
  let continueRunning = true;

  terminal.on('line', (line) => {
    const resolve = pendingQuestions.shift();
    if (resolve) {
      resolve(line);
    } else {
      pendingLines.push(line);
    }
  });

  const ask = (prompt) => {
    output(prompt);
    return new Promise((resolve) => {
      const line = pendingLines.shift();
      if (line !== undefined) {
        resolve(line);
      } else {
        pendingQuestions.push(resolve);
      }
    });
  };

  async function run() {
    while (continueRunning) {
      displayMenu(output);
      const choice = await ask('Enter your choice (1-4): ');

      if (choice === '1') {
        performOperation(OPERATION.TOTAL, 0, dataStore, output);
      } else if (choice === '2' || choice === '3') {
        const operation = choice === '2' ? OPERATION.CREDIT : OPERATION.DEBIT;
        const prompt = choice === '2' ? 'Enter credit amount: ' : 'Enter debit amount: ';
        const amount = Number(await ask(prompt));
        performOperation(operation, amount, dataStore, output);
      } else if (choice === '4') {
        continueRunning = false;
      } else {
        output('Invalid choice, please select 1-4.');
      }
    }

    output('Exiting the program. Goodbye!');
    terminal.close();
  }

  return { run, dataStore };
}

if (require.main === module) {
  createApplication().run();
}

module.exports = {
  DATA_OPERATION,
  INITIAL_BALANCE,
  OPERATION,
  createApplication,
  createDataStore,
  displayMenu,
  formatBalance,
  performDataOperation,
  performOperation,
};
