/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/tests/**',
    '!jest.config.js',
  ],
  testEnvironment: "node",
  testMatch: ['**/**/*.test.ts'],
  forceExit: true,
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  }
};