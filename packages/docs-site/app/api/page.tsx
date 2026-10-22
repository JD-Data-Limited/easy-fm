import Link from 'next/link';
import { deploymentBasePath } from '@/lib/shared';

export default function ApiAliasPage() {
  const target = `${deploymentBasePath}/docs/api-reference`;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <p>
        The API reference moved to{' '}
        <Link className="font-medium text-fd-primary underline" href={target}>
          the EasyFM documentation
        </Link>.
      </p>
    </main>
  );
}
