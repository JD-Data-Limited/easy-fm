module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup-env.cjs'],
    watchman: false,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/bin/**'
    ],
    moduleNameMapper: {
        '^(.+)\\.js$': '$1'  // Remove .js extension for imports
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.tsx?$': 'babel-jest',
        '^.+\\.js$': 'babel-jest'
    },
    testMatch: ['**/__tests__/**/*.test.ts'],  // Adjust this path to match your test folder
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/dist/',
        '/__tests__/',
        '/__mocks__/'
    ],
    coverageReporters: ['text', 'lcov'],
};
