module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^(\\.\\./\\.\\./src/.*)\\.js$': '$1.ts',
    '^(\\./(?:src|tools|httpcraft|utils|schemas|types)/.*)\\.js$': '$1.ts',
    '^(\\.\\./(?:src|tools|httpcraft|utils|schemas|types)/.*)\\.js$': '$1.ts',
    '^(\\./(?:base|logger|config|parser|cli|registry))\\.js$': '$1.ts',
  },
};
