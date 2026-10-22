import { Worker } from 'node:worker_threads';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

type Props = {
  chart: string;
};

let nextDiagramId = 0;

/** Render Mermaid in an isolated Node context so its DOM shim cannot alter Next.js globals. */
function renderDiagram(chart: string): Promise<string> {
  const id = `mermaid-${nextDiagramId++}`;

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      pathToFileURL(
        resolvePath(process.cwd(), 'components/mermaid-renderer.worker.mjs'),
      ),
      { workerData: { chart: chart.replaceAll('\\n', '\n'), id } },
    );

    worker.once('message', (result: { error?: string; svg?: string }) => {
      if (result.error) reject(new Error(result.error));
      else if (result.svg) resolve(result.svg);
      else reject(new Error('Mermaid renderer returned no SVG'));
    });
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Mermaid renderer exited with code ${code}`));
    });
  });
}

export async function Mermaid({ chart }: Props) {
  const svg = await renderDiagram(chart);

  return (
    <div
      className="my-4 flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
