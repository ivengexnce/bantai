module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@bantai/shared$': '<rootDir>/../shared/src'
  }
};
