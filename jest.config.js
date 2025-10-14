export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          target: 'ES2022',
          moduleResolution: 'node',
          allowJs: true,
          esModuleInterop: true,
        }
      },
    ],
  },
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/__tests__/**/*.test.ts",
    "**/src/**/*.test.ts"
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  // Remove the deprecated globals section
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Ensure proper module resolution
  resolver: undefined,
}