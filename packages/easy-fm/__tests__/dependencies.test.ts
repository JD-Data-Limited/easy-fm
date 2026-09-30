import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getZodInstallPlan} from '../dist/typegen/dependencies.js';

describe('typegen dependencies', () => {
    it('does nothing when Zod is already declared', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-zod-present-'));
        try {
            await writeFile(
                join(root, 'package.json'),
                JSON.stringify({ dependencies: { zod: '^4.0.0' } }),
            );
            expect(await getZodInstallPlan(root)).toBeNull();
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('uses the owning project package manager when Zod is absent', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-zod-missing-'));
        const nested = join(root, 'config');
        try {
            await mkdir(nested);
            await writeFile(
                join(root, 'package.json'),
                JSON.stringify({ packageManager: 'pnpm@12.5.1' }),
            );
            const plan = await getZodInstallPlan(nested);
            expect(plan).toEqual({
                cwd: root,
                command: 'pnpm',
                args: ['add', 'zod@^4.6.5'],
            });
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
