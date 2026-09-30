import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeDataApiInitialization } from '../dist/typegen/init.js';

describe('easyfm init', () => {
    it('creates config and updates env without discarding unrelated content', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-init-'));
        const config = join(root, 'easyfm.config.js');
        await writeFile(
            join(root, '.env'),
            '# keep me\nOTHER=value\nFM_USERNAME="old"\n',
        );
        try {
            await writeDataApiInitialization(config, {
                provider: 'data-api/odata',
                transports: 'both',
                hostname: 'https://example.test',
                database: 'CRM',
                username: 'admin',
                password: 'secret',
                output: './generated',
            });
            const generated = await readFile(config, 'utf8');
            const environment = await readFile(join(root, '.env'), 'utf8');
            const gitignore = await readFile(join(root, '.gitignore'), 'utf8');
            expect(generated).toContain('zodTypegenValidator()');
            expect(generated).toContain('transports: ["data-api","odata"]');
            expect(generated).not.toContain('secret');
            expect(environment).toContain('# keep me');
            expect(environment).toContain('OTHER=value');
            expect(environment).toContain('FM_USERNAME="admin"');
            expect(environment).toContain('FM_PASSWORD="secret"');
            expect(gitignore).toBe('.env\n');
            await expect(
                writeDataApiInitialization(config, {
                    provider: 'data-api/odata',
                    transports: 'data-api',
                    hostname: 'https://other.test',
                    database: 'Other',
                    username: 'x',
                    password: 'x',
                    output: './other',
                }),
            ).rejects.toMatchObject({ code: 'EEXIST' });
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('preserves gitignore and does not duplicate an existing env rule', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-gitignore-'));
        try {
            await writeFile(join(root, '.gitignore'), 'dist/\n/.env\n');
            await writeDataApiInitialization(join(root, 'easyfm.config.js'), {
                provider: 'data-api/odata',
                transports: 'both',
                hostname: 'https://example.test',
                database: 'CRM',
                username: 'admin',
                password: 'secret',
                output: './generated',
            });
            expect(await readFile(join(root, '.gitignore'), 'utf8')).toBe(
                'dist/\n/.env\n',
            );
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
