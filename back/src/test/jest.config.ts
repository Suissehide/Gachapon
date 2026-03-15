import type { Config } from 'jest'

const sharedConfig = {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript' },
        target: 'es2022',
      },
      module: { type: 'es6' },
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^jsonwebtoken$': '<rootDir>/__mocks__/jsonwebtoken.ts',
    '^.*/main/base-dir(\\.(?:js|ts))?$': '<rootDir>/__mocks__/base-dir.ts',
    '^.*/base-dir$': '<rootDir>/__mocks__/base-dir.ts',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setup.ts'],
}

const config: Config = {
  projects: [
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/e2e/**/*.test.ts'],
      ...sharedConfig,
    },
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/unit/**/*.test.ts'],
      ...sharedConfig,
    },
  ],
}

export default config
