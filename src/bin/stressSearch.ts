#!/usr/bin/env node
/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Command, Option} from 'commander'
import {config} from 'dotenv'
import FMHost, {query} from '../index.js'

config()

interface Stats {
    count: number
    errors: number
    totalMs: number
    minMs: number
    maxMs: number
    p50Ms: number
    p95Ms: number
    opsPerSecond: number
}

interface ResultRow {
    concurrency: number
    stats: Stats
}

interface RunningStats {
    durations: number[]
    errors: number
    startedAt: number
}

function parseIntegerList (value: string) {
    return value
        .split(',')
        .map(item => parseInt(item.trim(), 10))
        .filter(item => Number.isFinite(item) && item > 0)
}

function percentile (sorted: number[], ratio: number) {
    if (sorted.length === 0) return 0
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
    return sorted[index]
}

function summarizeDurations (durations: number[], errors: number, wallClockMs: number): Stats {
    const sorted = [...durations].sort((a, b) => a - b)
    const totalMs = sorted.reduce((sum, item) => sum + item, 0)
    return {
        count: sorted.length,
        errors,
        totalMs,
        minMs: sorted[0] ?? 0,
        maxMs: sorted[sorted.length - 1] ?? 0,
        p50Ms: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95),
        opsPerSecond: wallClockMs === 0 ? 0 : (sorted.length / wallClockMs) * 1000
    }
}

function formatInteger (value: number) {
    return new Intl.NumberFormat('en-US').format(value)
}

function formatDuration (value: number) {
    return `${value.toFixed(1)} ms`
}

function formatRate (value: number) {
    return `${value.toFixed(2)} ops/s`
}

function padCell (value: string, width: number, align: 'left' | 'right' = 'right') {
    return align === 'left' ? value.padEnd(width) : value.padStart(width)
}

function buildTable (rows: ResultRow[]) {
    const headers = ['conc', 'ops', 'errs', 'min', 'p50', 'p95', 'max', 'throughput']
    const body = rows.map(({concurrency, stats}) => [
        formatInteger(concurrency),
        formatInteger(stats.count),
        formatInteger(stats.errors),
        formatDuration(stats.minMs),
        formatDuration(stats.p50Ms),
        formatDuration(stats.p95Ms),
        formatDuration(stats.maxMs),
        formatRate(stats.opsPerSecond)
    ])
    const widths = headers.map((header, index) => Math.max(
        header.length,
        ...body.map(row => row[index].length)
    ))

    const headerRow = headers
        .map((header, index) => padCell(header, widths[index], 'left'))
        .join('  ')
    const separatorRow = widths
        .map(width => '-'.repeat(width))
        .join('  ')
    const bodyRows = body.map(row => row
        .map((cell, index) => padCell(cell, widths[index]))
        .join('  ')
    )

    return [headerRow, separatorRow, ...bodyRows].join('\n')
}

function printRunSummary (options: {
    mode: 'find' | 'list'
    layout: string
    database: string
    host: string
    field?: string
    operator: string
    value?: string
    limit: number
    iterations: number
    warmup: number
    concurrencyLevels: number[]
}) {
    console.log('Stress Search')
    console.log(`  host: ${options.host}`)
    console.log(`  database: ${options.database}`)
    console.log(`  layout: ${options.layout}`)
    console.log(`  mode: ${options.mode}`)
    if (options.mode === 'find') console.log(`  search: ${options.field} ${options.operator} ${options.value}`)
    console.log(`  limit: ${formatInteger(options.limit)}`)
    console.log(`  iterations/worker: ${formatInteger(options.iterations)}`)
    console.log(`  warmup/worker: ${formatInteger(options.warmup)}`)
    console.log(`  concurrency sweep: ${options.concurrencyLevels.join(', ')}`)
    console.log('  session pool: package default')
    console.log('')
}

function printResultSummary (rows: ResultRow[]) {
    if (rows.length === 0) return
    const successfulRows = rows.filter(row => row.stats.errors === 0)
    const throughputRows = successfulRows.length !== 0 ? successfulRows : rows
    const latencyRows = successfulRows.length !== 0 ? successfulRows : rows

    const bestThroughput = throughputRows.reduce((best, row) => (
        row.stats.opsPerSecond > best.stats.opsPerSecond ? row : best
    ))
    const bestP95 = latencyRows.reduce((best, row) => (
        row.stats.p95Ms < best.stats.p95Ms ? row : best
    ))

    console.log('')
    console.log('Summary')
    console.log(
        `  best throughput: concurrency=${bestThroughput.concurrency}, ${formatRate(bestThroughput.stats.opsPerSecond)}`
    )
    console.log(
        `  best p95 latency: concurrency=${bestP95.concurrency}, ${formatDuration(bestP95.stats.p95Ms)}`
    )

    if (rows.some(row => row.stats.errors !== 0)) {
        console.log('  note: some runs had errors; best-row picks prefer zero-error runs when available')
    }
}

function formatLiveProgress (concurrency: number, completed: number, total: number, running: RunningStats) {
    const wallClockMs = performance.now() - running.startedAt
    const stats = summarizeDurations(running.durations, running.errors, wallClockMs)
    return [
        `conc=${concurrency}`,
        `progress=${completed}/${total}`,
        `avg=${formatRate(stats.opsPerSecond)}`,
        `p50=${formatDuration(stats.p50Ms)}`,
        `p95=${formatDuration(stats.p95Ms)}`,
        `errs=${formatInteger(running.errors)}`
    ].join('  ')
}

function printLiveProgress (concurrency: number, completed: number, total: number, running: RunningStats) {
    const line = formatLiveProgress(concurrency, completed, total, running)
    process.stdout.write(`\r${line}`)
    if (completed === total) process.stdout.write('\n')
}

function printRunStart (concurrency: number, iterations: number, warmup: number) {
    console.log(
        `Run start: conc=${concurrency}, iterations/worker=${iterations}, warmup/worker=${warmup}`
    )
}

function printRunEnd (concurrency: number, stats: Stats) {
    console.log(
        `Run done:  conc=${concurrency}, ${formatRate(stats.opsPerSecond)}, p50=${formatDuration(stats.p50Ms)}, p95=${formatDuration(stats.p95Ms)}, errs=${formatInteger(stats.errors)}`
    )
    console.log('')
}

function buildFindRequest (field: string, operator: string, value: string) {
    return {
        [field]: query([operator, ''] as unknown as TemplateStringsArray, value)
    }
}

async function main () {
    const program = new Command()
    const argv = process.argv[2] === '--'
        ? [process.argv[0], process.argv[1], ...process.argv.slice(3)]
        : process.argv

    program
        .description('Stress-test FileMaker search/list throughput for easy-fm')
        .requiredOption('--layout <name>', 'layout name to query')
        .option('--field <name>', 'field to search')
        .option('--value <value>', 'value to search for')
        .option('--operator <operator>', 'FileMaker query operator', '=')
        .option('--mode <mode>', 'find or list', 'find')
        .option('--limit <number>', 'result limit per request', '100')
        .option('--iterations <number>', 'operations per worker', '20')
        .option('--warmup <number>', 'warmup operations per worker', '2')
        .addOption(new Option('--concurrency <list>', 'comma-separated concurrency levels').default('1,2,4,8'))
        .option('--debug', 'enable easy-fm debug logging', false)

    program.parse(argv)
    const options = program.opts<{
        layout: string
        field?: string
        value?: string
        operator: string
        mode: 'find' | 'list'
        limit: string
        iterations: string
        warmup: string
        concurrency: string
        debug: boolean
    }>()

    if (options.mode === 'find' && (!options.field || typeof options.value === 'undefined')) {
        throw new Error('--field and --value are required when --mode=find')
    }

    const host = process.env.FM_DB_HOST
    const database = process.env.FM_DB_NAME
    const username = process.env.FM_DB_ACCOUNT
    const password = process.env.FM_DB_PASSWORD
    if (!host || !database || !username || !password) {
        throw new Error('Missing FM_DB_HOST, FM_DB_NAME, FM_DB_ACCOUNT, or FM_DB_PASSWORD in environment')
    }

    const concurrencyLevels = parseIntegerList(options.concurrency)
    const limit = parseInt(options.limit, 10)
    const iterations = parseInt(options.iterations, 10)
    const warmup = parseInt(options.warmup, 10)

    printRunSummary({
        mode: options.mode,
        layout: options.layout,
        database,
        host,
        field: options.field,
        operator: options.operator,
        value: options.value,
        limit,
        iterations,
        warmup,
        concurrencyLevels
    })

    const fmHost = new FMHost(host, (moment) => 0 - moment.toDate().getTimezoneOffset(), false)

    const rows: ResultRow[] = []

    const connection = fmHost.database({
        database,
        credentials: {
            method: 'filemaker',
            username,
            password
        },
        externalSources: [],
        debug: options.debug
    })

    try {
        const layout = connection.layout(options.layout)
        await layout.getLayoutMeta()

        for (const concurrency of concurrencyLevels) {
            printRunStart(concurrency, iterations, warmup)

            const runOperation = async () => {
                const startedAt = performance.now()
                try {
                    const request = layout.records.list({portals: {}, limit})
                    if (options.mode === 'find') {
                        request.addRequest(buildFindRequest(
                            options.field as string,
                            options.operator,
                            options.value as string
                        ))
                    }
                    await request.fetch()
                    return {durationMs: performance.now() - startedAt, error: false}
                } catch {
                    return {durationMs: performance.now() - startedAt, error: true}
                }
            }

            for (let i = 0; i < warmup * concurrency; i++) {
                await runOperation()
            }

            const totalOperations = concurrency * iterations
            let completed = 0
            const running: RunningStats = {
                durations: [],
                errors: 0,
                startedAt: performance.now()
            }

            await Promise.all(
                Array.from({length: concurrency}, async () => {
                    for (let i = 0; i < iterations; i++) {
                        const result = await runOperation()
                        running.durations.push(result.durationMs)
                        if (result.error) running.errors += 1
                        completed += 1
                        printLiveProgress(concurrency, completed, totalOperations, running)
                    }
                })
            )

            const stats = summarizeDurations(
                running.durations,
                running.errors,
                performance.now() - running.startedAt
            )
            rows.push({concurrency, stats})
            printRunEnd(concurrency, stats)
        }
    } finally {
        await connection.logout()
    }

    console.log(buildTable(rows))
    printResultSummary(rows)
}

void main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
