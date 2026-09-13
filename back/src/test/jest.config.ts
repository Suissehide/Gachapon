import type { Config } from 'jest'

const sharedConfig = {
  extensionsToTreatAsEsm: ['.ts', '.mts'],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript' },
          target: 'es2022',
        },
        module: { type: 'es6' },
      },
    ],
    '^.+\\.m?js$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'ecmascript' },
          target: 'es2022',
        },
        module: { type: 'es6' },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^.*/main/base-dir(\\.(?:js|ts))?$': '<rootDir>/__mocks__/base-dir.ts',
    '^.*/base-dir$': '<rootDir>/__mocks__/base-dir.ts',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setup.ts'],
  transformIgnorePatterns: ['/node_modules/(?!(@prisma|@scalar|leven|github-slugger)/)'],
}

const config: Config = {
  projects: [
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/e2e/**/*.test.ts'],
      // Crée la base et l'index Redis du run, puis y applique les migrations.
      // Réservé aux e2e et déclaré ici, non à la racine : sinon
      // `--selectProjects unit` le déclencherait aussi, et les tests unitaires
      // exigeraient une base alors qu'ils sont purs.
      //
      // Il refuse de démarrer si le run a plus d'un worker : tout le run
      // partage cette base et cet index, donc le parallélisme les corrompt.
      // Les commandes du package.json passent `--maxWorkers=1`, jamais
      // `--runInBand` — voir la note sous `test:e2e`.
      globalSetup: '<rootDir>/globalSetup.ts',
      // Budget de temps des suites e2e, hooks compris. Voir setupAfterEnv.ts :
      // `testTimeout` seul ne couvre pas les hooks.
      setupFilesAfterEnv: ['<rootDir>/setupAfterEnv.ts'],
      // Rend ce que globalSetup a réservé : la base du run et son index Redis.
      globalTeardown: '<rootDir>/globalTeardown.ts',
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
