#!/usr/bin/env node
/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Command} from 'commander'
import {pathToFileURL} from 'node:url'
import {dirname, resolve} from 'node:path'
import {loadEnvFile} from 'node:process'
import chalk from 'chalk'
import {configExists, initializeTypegen} from './init.js'

const program = new Command()

program
    .name('easyfm')
    .description('A NodeJS wrapper for the FileMaker Data CLI')

program
    .command('init')
    .description('Interactively create an EasyFM typegen configuration')
    .option('-c, --config <path>', 'config module', 'easyfm.config.js')
    .action(async ({config}: {config: string}) => {
        await initializeTypegen({config})
    })

program
    .command('typegen')
    .description('Generate a typed, runtime-validated EasyFM client')
    .option('-c, --config <path>', 'config module', 'easyfm.config.js')
    .action(async ({config}: {config: string}) => {
        const configPath = resolve(config)
        if (!await configExists(configPath)) {
            console.log(chalk.yellow(`No config found at ${configPath}; starting setup.`))
            await initializeTypegen({config: configPath})
        }
        try { loadEnvFile(resolve(dirname(configPath), '.env')) } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        const typegen = await import('../typegen/index.js')
        if (await typegen.ensureZodInstalled(dirname(configPath))) console.log(chalk.green('Installed Zod for generated runtime validation.'))
        const loaded = await import(pathToFileURL(configPath).href)
        const result = await typegen.generate(loaded.default)
        console.log(chalk.green(`Generated ${result.layouts} layouts in ${result.output}`))
    })

program.parse(process.argv)
