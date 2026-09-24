/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // three@0.186 three.cjs re-exports ESM; load the ESM entry and transform it.
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!three/)',
    '\\\\node_modules\\\\(?!three\\\\)',
  ],
  transform: {
    // Match three build files on Windows and POSIX paths.
    'three[/\\\\]build[/\\\\].+\\.js$': '<rootDir>/jest-three-transform.js',
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Skip full-program typecheck (unrelated strict errors in import graph);
        // still transpile each file via isolatedModules.
        isolatedModules: true,
        tsconfig: {
          outDir: 'dist',
          esModuleInterop: true,
          allowJs: true,
          module: 'commonjs',
          target: 'ESNext',
          moduleResolution: 'node',
          jsx: 'react',
          baseUrl: '.',
          paths: { '@/*': ['src/*'] },
        },
      },
    ],
  },
  setupFiles: ['<rootDir>/src/tests/jest.setup.ts'],
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
