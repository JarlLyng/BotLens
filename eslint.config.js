// ESLint flat config (ESLint 10). Replaces .eslintrc.json and .eslintignore.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // ESLint 9+ no longer skips dot-directories, so agent worktrees and the Vercel
  // link are listed here. website/ is plain static files, as before.
  { ignores: ['node_modules/', 'dist/', 'website/', '.claude/', '.vercel/'] },
  js.configs.recommended,
  {
    rules: {
      // caughtErrors 'none' keeps ESLint 8's default: an unused catch binding is fine.
      'no-unused-vars': ['warn', { caughtErrors: 'none' }],
      'no-console': 'off',
    },
  },
  // The extension: classic scripts in a browser extension page or a tab.
  {
    files: ['*.js'],
    ignores: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  // Node: build and release scripts, tests, and the web demo's server side.
  {
    files: ['eslint.config.js', 'scripts/**/*.js', 'test/**/*.js', 'lib/**/*.js', 'api/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
