import chalk from 'chalk'
import inquirer from 'inquirer'
import {dirname, resolve} from 'node:path'
import {configExists, type DataApiInitAnswers, readEnvironment, writeDataApiInitialization} from '../typegen/init.js'

export {configExists} from '../typegen/init.js'
export interface InitOptions {config: string}

/** Interactive initializer shared by `easyfm init` and first `easyfm typegen`. */
export async function initializeTypegen ({config}: InitOptions): Promise<boolean> {
    const configPath = resolve(config)
    if (await configExists(configPath)) {
        console.log(chalk.yellow(`Config already exists: ${configPath}`))
        return false
    }

    console.log(chalk.bold.cyan('EasyFM typegen setup'))
    const envPath = resolve(dirname(configPath), '.env')
    const existingEnvironment = await readEnvironment(envPath)
    const answers = await inquirer.prompt<DataApiInitAnswers>([
        {type: 'select', name: 'provider', message: 'Provider', choices: [{name: 'Data API/OData', value: 'data-api/odata'}]},
        {type: 'select', name: 'transports', message: 'Transports', default: 'both', choices: [
            {name: 'Both', value: 'both'},
            {name: 'Data API', value: 'data-api'},
            {name: 'OData', value: 'odata'}
        ]},
        {type: 'input', name: 'hostname', message: 'FileMaker host URL', default: existingEnvironment.FM_HOST ?? 'https://', validate: validHost},
        {type: 'input', name: 'database', message: 'Database filename', default: existingEnvironment.FM_DATABASE, validate: required('Database filename')},
        {type: 'input', name: 'username', message: 'Username', default: existingEnvironment.FM_USERNAME, validate: required('Username')},
        {type: 'password', name: 'password', message: existingEnvironment.FM_PASSWORD ? 'Password (leave blank to keep existing)' : 'Password', mask: '*', validate: value => existingEnvironment.FM_PASSWORD || value ? true : 'Password is required'},
        {type: 'input', name: 'output', message: 'Generated client directory', default: './src/easyfm-generated', validate: required('Output directory')}
    ])
    if (!answers.password) answers.password = existingEnvironment.FM_PASSWORD ?? ''

    await writeDataApiInitialization(configPath, answers)
    console.log(chalk.green(`Created ${configPath}`))
    console.log(chalk.green(`Saved Data API credentials in ${envPath}`))
    console.log(chalk.dim('Keep .env out of version control.'))
    return true
}

function required (label: string) { return (value: string) => value.trim() ? true : `${label} is required` }
function validHost (value: string) {
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' ? true : 'Use an http:// or https:// URL' } catch { return 'Use a valid http:// or https:// URL' }
}
