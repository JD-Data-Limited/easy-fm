#!/usr/bin/env node
/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Command} from 'commander'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'

const program = new Command()

program
    .name('easyfm')
    .description('A NodeJS wrapper for the FileMaker Data CLI')

program
    .command('typegen')
    .description('Generate a typed, runtime-validated EasyFM client')
    .option('-c, --config <path>', 'config module', 'easyfm.config.js')
    .action(async ({config}: {config: string}) => {
        const [{generate}, loaded] = await Promise.all([
            import('../typegen/index.js'),
            import(pathToFileURL(resolve(config)).href)
        ])
        const result = await generate(loaded.default)
        console.log(`Generated ${result.layouts} layouts in ${result.output}`)
    })

program.parse(process.argv)
