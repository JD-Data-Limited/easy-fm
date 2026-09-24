import {runRuntimeSmokeTest} from '../smoke.js'

export default {
    async fetch (): Promise<Response> {
        return Response.json(await runRuntimeSmokeTest())
    }
} satisfies ExportedHandler
