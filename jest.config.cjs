module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(.+)\\.js$': '$1'  // Remove .js extension for imports
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.ts$': 'babel-jest',
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.ts'],  // Adjust this path to match your test folder
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
};
