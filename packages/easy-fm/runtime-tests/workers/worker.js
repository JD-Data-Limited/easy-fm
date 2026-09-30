import { runRuntimeSmokeTest } from '../smoke.js';
export default {
    async fetch() {
        return Response.json(await runRuntimeSmokeTest());
    },
};
