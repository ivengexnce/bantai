import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'BANTAI — Apna Model. Apna Dimaag. Apna AI.',
  description: 'Local-first, hardware-aware, agentic AI workbench for private reasoning, coding, and bilingual productivity.'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#07070f] text-white min-h-screen antialiased selection:bg-[#6366f1] selection:text-white font-sans">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
