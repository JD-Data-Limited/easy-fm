module.exports = {
    "presets": [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current',
                },
                modules: 'commonjs',  // Transpile ESM to CommonJS
            },
        ],
        '@babel/preset-typescript'
    ]
}
;
