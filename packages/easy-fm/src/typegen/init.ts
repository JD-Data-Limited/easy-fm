import {mkdir, open, readFile, writeFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'

export interface DataApiInitAnswers {
    provider: 'data-api/odata'
    transports: 'data-api' | 'odata' | 'both'
    hostname: string
    database: string
    username: string
    password: string
    output: string
}

export async function configExists (path: string) {
    try { await readFile(path); return true } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
        throw error
    }
}

/** Non-interactive write step, usable by alternate setup UIs. */
export async function writeDataApiInitialization (config: string, answers: DataApiInitAnswers) {
    const configPath = resolve(config)
    const directory = dirname(configPath)
    const envPath = resolve(directory, '.env')
    await mkdir(directory, {recursive: true})
    const file = await open(configPath, 'wx')
    try { await file.writeFile(renderConfig(answers), 'utf8') } finally { await file.close() }
    await updateEnvironment(envPath, {FM_HOST: answers.hostname, FM_DATABASE: answers.database, FM_USERNAME: answers.username, FM_PASSWORD: answers.password})
    await ensureEnvironmentIgnored(directory)
}

export async function readEnvironment (path: string): Promise<Record<string, string>> {
    try {
        const contents = await readFile(path, 'utf8')
        return Object.fromEntries(contents.split(/\r?\n/).map(line => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)).filter(match => match).map(match => [match![1], decodeEnvironmentValue(match![2])]))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
        throw error
    }
}

function renderConfig (answers: DataApiInitAnswers) {
    return `import {dataApiSchemaSource, defineTypegenConfig, zodTypegenValidator} from '@jd-data-limited/easy-fm/typegen'

function required (name) {
    const value = process.env[name]
    if (!value) throw new Error(\`Missing required environment variable \${name}\`)
    return value
}

export default defineTypegenConfig({
    output: ${JSON.stringify(answers.output)},
    transports: ${JSON.stringify(answers.transports === 'both' ? ['data-api', 'odata'] : [answers.transports])},
    validator: zodTypegenValidator(),
    source: dataApiSchemaSource({
        hostname: required('FM_HOST'),
        database: required('FM_DATABASE'),
        credentials: {method: 'filemaker', username: required('FM_USERNAME'), password: required('FM_PASSWORD')},
        externalSources: []
    })
})
`
}

async function updateEnvironment (path: string, values: Record<string, string>) {
    let contents = ''
    try { contents = await readFile(path, 'utf8') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    const lines = contents ? contents.split(/\r?\n/) : []
    for (const [name, value] of Object.entries(values)) {
        const replacement = `${name}=${JSON.stringify(value)}`
        const index = lines.findIndex(line => line.startsWith(`${name}=`))
        if (index >= 0) lines[index] = replacement
        else lines.push(replacement)
    }
    await writeFile(path, `${lines.filter((line, index) => line || index < lines.length - 1).join('\n')}\n`, {encoding: 'utf8', mode: 0o600})
}

function decodeEnvironmentValue (value: string) {
    const trimmed = value.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) { try { return JSON.parse(trimmed) as string } catch { return trimmed.slice(1, -1) } }
    return trimmed
}

async function ensureEnvironmentIgnored (directory: string) {
    const path = resolve(directory, '.gitignore')
    let contents = ''
    try { contents = await readFile(path, 'utf8') } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    const alreadyIgnored = contents.split(/\r?\n/).some(line => {
        const rule = line.trim()
        return rule === '.env' || rule === '/.env' || rule === '.env*' || rule === '/.env*'
    })
    if (alreadyIgnored) return
    const prefix = contents && !contents.endsWith('\n') ? '\n' : ''
    await writeFile(path, `${contents}${prefix}.env\n`, 'utf8')
}
