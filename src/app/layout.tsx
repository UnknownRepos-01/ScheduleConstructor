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
  title: 'Конструктор школьного расписания',
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
                {/* Яндекс.Метрика — загружается после интерактивности страницы */}
        <Script
          id="yandex-metrika"
          strategy="afterInteractive"
        >
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108503314', 'ym');

            ym(108503314, 'init', {
              ssr:true,
              webvisor:true,
              clickmap:true,
              ecommerce:"dataLayer",
              referrer: document.referrer,
              url: location.href,
              accurateTrackBounce:true,
              trackLinks:true
            });
          `}
        </Script>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}