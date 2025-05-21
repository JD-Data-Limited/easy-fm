module.exports = {
    "presets": [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current',
                },
                modules: false // Preserve ESM modules
            },
        ],
        '@babel/preset-typescript'
    ]
}
;
