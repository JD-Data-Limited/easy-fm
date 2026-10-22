import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const basePath = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  basePath,
  // Keep the Node-only Mermaid DOM shim intact so its rendering assets remain
  // available while static pages are generated. It is never sent to clients.
  serverExternalPackages: ['isomorphic-mermaid'],
};

export default withMDX(config);
