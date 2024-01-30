/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

#!/usr/bin/env node

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