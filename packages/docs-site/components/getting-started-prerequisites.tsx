'use client';

import {useState, type ReactNode} from 'react';
import {Check, Database, Monitor} from 'lucide-react';
import {Tab, Tabs} from 'fumadocs-ui/components/tabs';
import {DynamicCodeBlock} from 'fumadocs-ui/components/dynamic-codeblock';

type Provider = 'data-api' | 'webviewer';

const installCommands = {
    npm: 'npm install @jd-data-limited/easy-fm',
    pnpm: 'pnpm add @jd-data-limited/easy-fm',
    yarn: 'yarn add @jd-data-limited/easy-fm',
    bun: 'bun add @jd-data-limited/easy-fm',
};

const initCommands = {
    npm: 'npm exec -- easyfm init',
    pnpm: 'pnpm exec easyfm init',
    yarn: 'yarn easyfm init',
    bun: 'bun run easyfm init',
};

const typegenCommands = {
    npm: 'npm exec -- easyfm typegen',
    pnpm: 'pnpm exec easyfm typegen',
    yarn: 'yarn easyfm typegen',
    bun: 'bun run easyfm typegen',
};

function Choice({active, description, icon: Icon, label, onClick}: {
    active: boolean;
    description: string;
    icon: typeof Database;
    label: string;
    onClick: () => void;
}) {
    return (
        <button type="button" role="radio" aria-checked={active} onClick={onClick}
                className={`flex min-h-32 w-full items-start gap-4 rounded-xl border p-5 text-left transition-colors ${active ? 'border-fd-primary bg-fd-primary/10' : 'border-fd-border bg-fd-card hover:border-fd-primary/60'}`}>
            <span
                className={`mt-0.5 rounded-lg p-2 ${active ? 'bg-fd-primary text-fd-primary-foreground' : 'bg-fd-muted'}`}><Icon
                className="size-5"/></span>
            <span>
        <span className="flex items-center gap-2 font-semibold text-fd-foreground">{label}{active &&
            <Check className="size-4 text-fd-primary"/>}</span>
        <span className="mt-1 block text-sm leading-6 text-fd-muted-foreground">{description}</span>
      </span>
        </button>
    );
}

function Step({number, title, children}: { number: number; title: string; children: ReactNode }) {
    return (
        <section className="border-t border-fd-border p-5 sm:p-6">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-fd-primary">Step {number}</p>
            <h3 className="mt-2 text-lg font-semibold text-fd-foreground">{title}</h3>
            {children}
        </section>
    );
}

function CommandTabs({commands}: { commands: typeof installCommands }) {
    return (
        <Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager" persist>
            {(Object.keys(commands) as (keyof typeof commands)[]).map((manager) => (
                <Tab key={manager} value={manager}>
                    <DynamicCodeBlock lang="bash" code={commands[manager]}/>
                </Tab>
            ))}
        </Tabs>
    );
}

function InstallStep({number}: { number: number }) {
    return (
        <Step number={number} title="Install EasyFM">
            <CommandTabs commands={installCommands}/>
        </Step>
    );
}

function InitStep({number}: { number: number }) {
    return (
        <Step number={number} title="Run the initializer">
            <p className="mt-4 text-sm leading-6 text-fd-muted-foreground">The initialiser will set up EasyFM within
                your project for you.</p>

            <CommandTabs commands={initCommands}/>
            <p className="mt-4 text-sm leading-6 text-fd-muted-foreground">To do this, the initializer will ask for:</p>
            <ul className="my-4 list-disc space-y-2 pl-5 text-sm leading-6 text-fd-muted-foreground marker:text-fd-primary">
                <li>The generated client directory. This is where EasyFM will store the code required to connect and
                    communicate with your database.
                </li>
                <li>A unique client name for each database. This will be used to name the variables and methods you use
                    to access the database.
                </li>
                <li>The transport, FileMaker host URL, and database filename. This is a valid HTTP or HTTPS URL that can
                    be used to access the FileMaker Data API from your local dev machine. ie https://example.com/
                </li>
                <li>A FileMaker username and password with the <code>fmrest</code> extended privilege.</li>
            </ul>
            <p className="mb-0 mt-4 text-sm leading-6 text-fd-muted-foreground">The initialiser will use the information
                you enter to generate the necessary files to connect to your database. And the configuration required
                for typegen processes.</p>
        </Step>
    );
}

function TypegenStep({number}: { number: number }) {
    return (
        <Step number={number} title="Generate the typed client">
            <CommandTabs commands={typegenCommands}/>
            <p className="mb-0 mt-4 text-sm leading-6 text-fd-muted-foreground">Once you've initialised EasyFM, it's
                highly recommended that you run the EasyFM typegen process. This will automatically go through all the
                layouts and fields available to EasyFM, and generate typescript types from them. Thus allowing you to
                easily see what fields your application has access to as you develop, and ensure you're accessing them
                correctly.</p>
        </Step>
    );
}

function DataApiFlow() {
    return (
        <div aria-live="polite">
            <Step number={2} title="Prepare the Data API connection">
                <ul className="my-4 list-disc space-y-2 pl-5 text-sm leading-6 text-fd-muted-foreground marker:text-fd-primary">
                    <li>Host the file with FileMaker Server or FileMaker Cloud and enable the FileMaker Data API.</li>
                    <li>Grant the account access to each required layout, field, and portal.</li>
                    <li>For a FileMaker account, enable the <code>fmrest</code> extended privilege.</li>
                </ul>
            </Step>
            <InstallStep number={3}/>
            <InitStep number={4}/>
            <TypegenStep number={5}/>
        </div>
    );
}

function WebViewerFlow() {
    return (
        <div aria-live="polite">
            <Step number={2} title="Prepare the development Data API connection">
                <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">The WebViewer provider will not use the
                    Data API in production. Type generation still needs a development-time Data API connection so it
                    can inspect your layouts and fields.</p>
                <ul className="my-4 list-disc space-y-2 pl-5 text-sm leading-6 text-fd-muted-foreground marker:text-fd-primary">
                    <li>Use Node.js <code>22.22.3</code> or later.</li>
                    <li>Provide a reachable hosted database with the FileMaker Data API enabled.</li>
                    <li>Use credentials with access to every layout, field, and portal you want to generate.</li>
                </ul>
            </Step>
            <InstallStep number={3}/>
            <InitStep number={4}/>
            <TypegenStep number={5}/>
            <Step number={6} title="Configure the WebViewer provider">
                <div className="rounded-xl border border-fd-primary/40 bg-fd-primary/10 p-4">
                    <div className="flex items-center gap-2 font-semibold text-fd-foreground">WebViewer
                        support <span
                            className="rounded bg-fd-primary/15 px-1.5 py-0.5 text-xs text-fd-primary">coming</span>
                    </div>
                    <p className="mb-0 mt-2 text-sm leading-6 text-fd-muted-foreground">This release does not yet
                        contain a WebViewer provider, so there is no valid runtime configuration to enter here. The
                        production WebViewer path will not require a hosted database or the Data API.</p>
                </div>
            </Step>
        </div>
    );
}

export function GettingStartedPrerequisites() {
    const [provider, setProvider] = useState<Provider>();
    return (
        <div className="not-prose my-6 overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
            <div className="p-5 sm:p-6">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-fd-primary">Step 1</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-fd-foreground">Which provider would you
                    like to use?</h2>
                <div role="radiogroup" aria-label="Provider" className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Choice active={provider === 'data-api'}
                            description="Connect through FileMaker Server or FileMaker Cloud." icon={Database}
                            label="Data API" onClick={() => setProvider('data-api')}/>
                    <Choice active={provider === 'webviewer'} description="Run EasyFM inside a FileMaker Web Viewer."
                            icon={Monitor} label="WebViewer" onClick={() => setProvider('webviewer')}/>
                </div>
            </div>
            {provider === 'data-api' && <DataApiFlow/>}
            {provider === 'webviewer' && <WebViewerFlow/>}
        </div>
    );
}
