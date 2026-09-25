import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { ToastProvider } from '@/components/toast';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'MRS', template: '%s · MRS' },
  description: 'Explorá películas, guardá tus favoritas y recibí recomendaciones personalizadas.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-7 px-6 pt-6 pb-[110px]">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
