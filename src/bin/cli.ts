#!/usr/bin/env node
/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Command} from "commander"
import {generateTypesCLI} from "./generateTypes.js";

const program = new Command()

program
    .name("easyfm")
    .description("A NodeJS wrapper for the FileMaker Data CLI")

program
    .command("generate-types")
    .description("Automatically generate layout interfaces from your database")
    .action(() => {
        generateTypesCLI()
    })

program.parse(process.argv)