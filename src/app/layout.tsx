import type { Metadata, Viewport } from 'next';
import { Nunito, Noto_Sans_SC } from 'next/font/google';
import './globals.css';
import { APP_LANG, L } from '@/lib/lang';
import ServiceWorker from '@/components/ServiceWorker';

const ui = Nunito({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
});

/**
 * Nunito không có chữ Hán. Thiếu phông này thì mỗi điện thoại hiện
 * một kiểu chữ Hán khác nhau, tuỳ phông mặc định của máy.
 */
const han = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-han',
  display: 'swap',
});

export const metadata: Metadata = {
  title: L.appName,
  description: 'Luyện dịch ngược Việt - Anh trên tài liệu của chính bạn',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: L.appName },
};

export const viewport: Viewport = {
  themeColor: '#FFF6F0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={APP_LANG === 'zh' ? 'vi' : 'vi'}
      className={`${ui.variable} ${L.needsHanFont ? han.variable : ''}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('verso:theme');if(t&&t!=='auto')document.documentElement.setAttribute('data-theme',t);var d=t==='dark'||((!t||t==='auto')&&matchMedia('(prefers-color-scheme: dark)').matches);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#1C1614':'#FFF6F0');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
