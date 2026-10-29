module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup-env.cjs'],
    watchman: false,
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/bin/**'],
    moduleNameMapper: {
        '^@jd-data-limited/easy-fm$': '<rootDir>/dist/index.js',
        '^@jd-data-limited/easy-fm/typegen$': '<rootDir>/dist/typegen/index.js',
        '^(\\.{1,2}/.+)\\.js$': '$1', // Remove .js only from relative imports
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.tsx?$': [
            'babel-jest',
            {
                presets: [
                    [
                        '@babel/preset-env',
                        { targets: { node: 'current' }, modules: 'commonjs' },
                    ],
                    '@babel/preset-typescript',
                ],
            },
        ],
        '^.+\\.js$': 'babel-jest',
    },
    // temporal-polyfill and its temporal-utils dependency are ESM-only, so Jest
    // must transform them with the rest of the source.
    transformIgnorePatterns: ['node_modules/(?!.*(?:temporal-polyfill|temporal-utils))'],
    testMatch: ['**/__tests__/**/*.test.ts'], // Adjust this path to match your test folder
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/dist/', '/__tests__/', '/__mocks__/'],
    coverageReporters: ['text', 'lcov'],
};
