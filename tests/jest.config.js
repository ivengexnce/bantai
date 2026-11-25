module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 20000,
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@bantai/shared$': '<rootDir>/../shared/src'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: { ignoreCodes: [6059] },
        tsconfig: '<rootDir>/../backend/tsconfig.json'
      }
    ]
  }
};
