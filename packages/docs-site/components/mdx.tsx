import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { createFileSystemGeneratorCache, createGenerator } from 'fumadocs-typescript';
import { AutoTypeTable as FumadocsAutoTypeTable } from 'fumadocs-typescript/ui';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { GettingStartedPrerequisites } from './getting-started-prerequisites';

const typeGenerator = createGenerator({
  cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
});

function AutoTypeTable(props: { path?: string; name?: string; type?: string }) {
  return (
    <FumadocsAutoTypeTable
      {...props}
      generator={typeGenerator}
      options={{ basePath: process.cwd() }}
    />
  );
}

function Coming() {
  return (
      <span className="ms-1 rounded bg-fd-primary/10 px-1.5 py-0.5 text-xs font-medium text-fd-primary">
      coming
    </span>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AutoTypeTable,
    Coming,
    GettingStartedPrerequisites,
    ...components,
    ...TabsComponents,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
