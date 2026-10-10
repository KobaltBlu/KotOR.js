/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Styles must win over @/ path aliases (imports like @/apps/.../file.scss).
    '\\.(css|scss|sass)$': '<rootDir>/src/tests/styleMock.js',
    '^@core$': '<rootDir>/src/core/index.ts',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@engine$': '<rootDir>/src/engine/index.ts',
    '^@engine/(.*)$': '<rootDir>/src/engine/$1',
    '^@apps/(.*)$': '<rootDir>/src/apps/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // three@0.186 three.cjs re-exports ESM; load the ESM entry and transform it.
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!three/)',
    '\\\\node_modules\\\\(?!three\\\\)',
  ],
  transform: {
    // Match three build + examples/jsm ESM on Windows and POSIX paths.
    'three[/\\\\](build|examples)[/\\\\].+\\.js$': '<rootDir>/jest-three-transform.js',
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
          // ts-jest uses the TS6 API; node10 still works there with this silence flag.
          moduleResolution: 'node',
          ignoreDeprecations: '6.0',
          jsx: 'react',
          paths: {
            '@core': ['./src/core/index.ts'],
            '@core/*': ['./src/core/*'],
            '@engine': ['./src/engine/index.ts'],
            '@engine/*': ['./src/engine/*'],
            '@apps/*': ['./src/apps/*'],
            '@assets/*': ['./src/assets/*'],
            '@/*': ['./src/*'],
          },
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
