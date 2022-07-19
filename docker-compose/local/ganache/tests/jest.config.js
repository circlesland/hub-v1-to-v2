/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: false,
  globals: {
    'ts-jest': {
      tsconfig: {
        sourceMap: true,
        inlineSourceMap: true
      }
    },
  }
};
