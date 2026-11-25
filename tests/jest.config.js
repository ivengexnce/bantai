module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
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
