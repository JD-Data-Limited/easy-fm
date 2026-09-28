import chalk from 'chalk'
import inquirer from 'inquirer'
import {dirname, resolve} from 'node:path'
import {configExists, type DataApiInitAnswers, writeMultiDatabaseInitialization} from '../typegen/init.js'

export {configExists} from '../typegen/init.js'
export interface InitOptions {config: string}

export async function initializeTypegen ({config}: InitOptions): Promise<boolean> {
    const configPath = resolve(config)
    if (await configExists(configPath)) { console.log(chalk.yellow(`Config already exists: ${configPath}`)); return false }
    console.log(chalk.bold.cyan('EasyFM typegen setup'))
    const {output} = await inquirer.prompt<{output: string}>([{type: 'input', name: 'output', message: 'Generated client directory', default: './src/easyfm-generated', validate: required('Output directory')}])
    const databases: Array<DataApiInitAnswers & {key: string}> = []
    let more = true
    while (more) {
        const answers = await inquirer.prompt<DataApiInitAnswers & {key: string}>([
            {type: 'input', name: 'key', message: 'Database client name', validate: (value: string) => !value.trim() ? 'Client name is required' : databases.some(db => db.key === value) ? 'Client name must be unique' : true},
            {type: 'select', name: 'provider', message: 'Provider', choices: [{name: 'Data API/OData', value: 'data-api/odata'}]},
            {type: 'select', name: 'transports', message: 'Transports', default: 'both', choices: [{name: 'Both', value: 'both'}, {name: 'Data API', value: 'data-api'}, {name: 'OData', value: 'odata'}]},
            {type: 'input', name: 'hostname', message: 'FileMaker host URL', default: 'https://', validate: validHost},
            {type: 'input', name: 'database', message: 'Database filename', validate: required('Database filename')},
            {type: 'input', name: 'username', message: 'Username', validate: required('Username')},
            {type: 'password', name: 'password', message: 'Password', mask: '*', validate: required('Password')}
        ])
        databases.push(answers)
        const result = await inquirer.prompt<{more: boolean}>([{type: 'confirm', name: 'more', message: 'Add another database?', default: false}])
        more = result.more
    }
    await writeMultiDatabaseInitialization(configPath, {output, databases})
    console.log(chalk.green(`Created ${configPath}`))
    console.log(chalk.green(`Saved database-scoped credentials in ${resolve(dirname(configPath), '.env')}`))
    console.log(chalk.dim('Keep .env out of version control.'))
    return true
}

function required (label: string) { return (value: string) => value.trim() ? true : `${label} is required` }
function validHost (value: string) { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' ? true : 'Use an http:// or https:// URL' } catch { return 'Use a valid http:// or https:// URL' } }
