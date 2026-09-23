// Loads the real popup.js so tests run against exactly the code that ships.
//
// popup.js is a classic script that touches `document` and `chrome` at the top
// level, so it cannot be required. Running it in a vm context with small stubs
// gives access to its function declarations without extracting them, which
// would mean changing extension code (and a Web Store release) just to test it.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadPopup() {
  const noop = () => {};
  const context = {
    document: { addEventListener: noop, getElementById: () => null, querySelector: () => null },
    chrome: { tabs: {}, scripting: {} },
    console,
  };
  vm.createContext(context);
  const file = path.join(__dirname, '..', 'popup.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context;
}

// Values created inside the vm carry that realm's Array/Object prototypes, so
// assert.deepStrictEqual would reject them even when they are equal. A JSON
// round-trip brings them back as plain values from this realm.
const plain = value => JSON.parse(JSON.stringify(value));

module.exports = { loadPopup, plain };
