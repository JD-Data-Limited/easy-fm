import type { Metadata } from 'next';
import '@fontsource-variable/quicksand';
import { Provider } from '@/components/provider';
import './global.css';

export const metadata: Metadata = {
  title: {
    default: 'EasyFM Documentation',
    template: '%s · EasyFM',
  },
  description: 'Build typed FileMaker Data API integrations with EasyFM.',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
