module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.ts$': 'babel-jest',
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.ts'],  // Adjust this path to match your test folder
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
};
