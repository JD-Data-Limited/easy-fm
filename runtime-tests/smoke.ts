import FMHost, {
    asDate,
    queryEscape,
    stringToTemporal,
    temporalToString
} from '../dist/index.js'

export interface RuntimeSmokeResult {
    date: string
    escapedQuery: string
    formattedDate: string
    hostname: string
}

/**
 * Exercises the published build using APIs that do not require a live
 * FileMaker server. Creating and closing a database also verifies that each
 * runtime can load the package's current lifecycle implementation.
 */
export async function runRuntimeSmokeTest (): Promise<RuntimeSmokeResult> {
    const host = new FMHost('https://runtime-test.example.com')
    const database = host.database({
        database: 'RuntimeTest',
        credentials: {
            method: 'filemaker',
            username: 'runtime-test-user',
            password: 'runtime-test-password'
        },
        externalSources: []
    })

    await database.close()

    const date = stringToTemporal('09/23/2026', 'date', 'MM/dd/yyyy')

    return {
        date: asDate(new Date(2026, 8, 23)).toString(),
        escapedQuery: queryEscape('*'),
        formattedDate: temporalToString(date, 'yyyy-MM-dd'),
        hostname: host.hostname
    }
}
