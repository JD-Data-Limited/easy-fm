# Test Guide

Common local test commands:

```sh
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

## Notes

- `npm test` builds first, then runs Jest
- `test:unit` covers fast unit-level checks
- `test:integration` expects working FileMaker integration environment
- `test:coverage` excludes integration-heavy database test file from coverage run
