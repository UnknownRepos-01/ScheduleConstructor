import React from 'react';
import './globals.css';
import { ReactQueryProvider } from '@/providers/react-query-provider';
import Script from 'next/script'; // импортируем компонент Script

const themeInitScript = `
(() => {
  try {
    const savedTheme = localStorage.getItem('theme');
    const theme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : 'light';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.backgroundColor = theme === 'dark' ? 'rgb(15 17 23)' : 'rgb(248 249 252)';
    document.body.style.backgroundColor = root.style.backgroundColor;
  } catch {}
})();
`;

export const metadata = {
  title: 'Конструктор расписания',
  description: 'Веб-приложение для управления школьным расписанием, классами, преподавателями, кабинетами и публикацией актуальных листов расписания.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}