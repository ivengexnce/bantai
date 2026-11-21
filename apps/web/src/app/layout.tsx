import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'BANTAI - Apna Model. Apna Dimaag. Apna AI.',
  description: 'Production Self-Hosted Agentic AI Platform with authentic Mumbai personality and zero third-party AI APIs.'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bantai-dark text-white min-h-screen antialiased selection:bg-bantai-500 selection:text-black">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
