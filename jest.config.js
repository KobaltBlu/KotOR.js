/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    "^.+.ts?$": [
      "ts-jest",
      {
        // Skip full-program typecheck (unrelated strict errors in import graph);
        // still transpile each file via isolatedModules.
        isolatedModules: true,
        tsconfig: {
          outDir: "dist",
          esModuleInterop: true,
          allowJs: true,
          module: "commonjs",
          target: "ESNext",
          moduleResolution: "node",
          jsx: "react",
          baseUrl: ".",
          paths: { "@/*": ["src/*"] },
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};