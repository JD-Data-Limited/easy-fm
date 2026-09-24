#!/usr/bin/env node
/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Command} from 'commander'
import {generateTypesCLI} from './generateTypes.js'
import {generateClient} from "./generateClient.js";

const program = new Command()

program
    .name('easyfm')
    .description('A NodeJS wrapper for the FileMaker Data CLI')

program
    .command("generate")
    .action(async () => {
        await generateClient()
    })

program
    .command('generate-types')
    .description('Automatically generate layout interfaces from your database')
    .action(async () => {
        await generateTypesCLI()
    })

program.parse(process.argv)
