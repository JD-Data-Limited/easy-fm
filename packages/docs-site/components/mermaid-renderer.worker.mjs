import { parentPort, workerData } from 'node:worker_threads';
import mermaid from 'isomorphic-mermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  htmlLabels: false,
  theme: 'neutral',
  fontFamily: 'inherit',
});

try {
  const { svg } = await mermaid.render(workerData.id, workerData.chart);
  parentPort.postMessage({ svg });
} catch (error) {
  parentPort.postMessage({
    error: error instanceof Error ? error.message : String(error),
  });
} finally {
  parentPort.close();
}
