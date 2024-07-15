module.exports = {
    "env": {
        "browser": false,
        "es2021": true
    },
    "extends": "standard-with-typescript",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        // "indent": ["error", 4],
        "@typescript-eslint/indent": ["error", 4],
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/strict-boolean-expressions": 0,
        "@typescript-eslint/object-curly-spacing": 0,
        "@typescript-eslint/brace-style": 0,
        "no-useless-return": 0
    }
}
