import {access, readFile} from 'node:fs/promises'
import {dirname, parse, resolve} from 'node:path'
import {spawn} from 'node:child_process'

const ZOD_VERSION = '^4.6.5'
type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

export interface InstallPlan {cwd: string, command: PackageManager, args: string[]}

/** Ensures generated code can resolve its direct `zod` import. */
export async function ensureZodInstalled (start: string): Promise<boolean> {
    const plan = await getZodInstallPlan(start)
    if (!plan) return false
    await runInstall(plan)
    return true
}

/** Returns null when Zod is already declared. Exported for alternate CLIs. */
export async function getZodInstallPlan (start: string): Promise<InstallPlan | null> {
    const packagePath = await findUp(resolve(start), 'package.json')
    if (!packagePath) throw new Error(`Cannot install Zod: no package.json found above ${resolve(start)}`)
    const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, unknown>
    const dependencyGroups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
    if (dependencyGroups.some(group => hasDependency(manifest[group], 'zod'))) return null
    const cwd = dirname(packagePath)
    const manager = await detectPackageManager(cwd, manifest.packageManager)
    return {cwd, command: manager, args: installArguments(manager)}
}

function hasDependency (value: unknown, name: string) {
    return typeof value === 'object' && value !== null && name in value
}

async function detectPackageManager (cwd: string, declared: unknown): Promise<PackageManager> {
    if (typeof declared === 'string') {
        const name = declared.split('@')[0]
        if (name === 'pnpm' || name === 'npm' || name === 'yarn' || name === 'bun') return name
    }
    const locks: Array<[string, PackageManager]> = [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['package-lock.json', 'npm']]
    for (const [file, manager] of locks) if (await findUp(cwd, file)) return manager
    return 'npm'
}

function installArguments (manager: PackageManager) {
    if (manager === 'npm') return ['install', `zod@${ZOD_VERSION}`]
    return ['add', `zod@${ZOD_VERSION}`]
}

async function runInstall ({cwd, command, args}: InstallPlan) {
    await new Promise<void>((resolvePromise, reject) => {
        const child = spawn(command, args, {cwd, stdio: 'inherit', shell: process.platform === 'win32'})
        child.once('error', reject)
        child.once('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`)))
    })
}

async function findUp (start: string, name: string): Promise<string | undefined> {
    let directory = start
    while (true) {
        const candidate = resolve(directory, name)
        try { await access(candidate); return candidate } catch {}
        const parent = dirname(directory)
        if (parent === directory || directory === parse(directory).root) return undefined
        directory = parent
    }
}
