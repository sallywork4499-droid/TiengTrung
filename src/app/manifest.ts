import type { MetadataRoute } from 'next';
import { L } from '@/lib/lang';

/** Manifest sinh động, để hai bản deploy có tên và icon khác nhau. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: L.appName,
    short_name: L.appName,
    description: L.tagline,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF6F0',
    theme_color: '#F97B3D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
