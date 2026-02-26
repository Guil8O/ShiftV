import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';

/** Detect WSL (Windows Subsystem for Linux) */
const isWSL = (() => {
  try {
    return readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
  } catch { return false; }
})();

/** Prefer explicit env var override, otherwise default by platform */
const DEV_PORT = parseInt(process.env.VITE_PORT ?? '3000', 10);

export default defineConfig({
  base: '/ShiftV/',
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'utils': ['pako', 'browser-image-compression']
        }
      }
    }
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/**/*', 'android/**/*', 'ios/**/*', 'textures/**/*', 'windows11/**/*'],
      manifest: {
        name: 'ShiftV',
        short_name: 'ShiftV',
        description: 'ShiftV는 여러분의 꾸준한 신체 변화 과정을 간편하게 기록하고, 한눈에 변화를 추적하며 목표를 향해 나아갈 수 있도록 돕는 개인 맞춤형 기록 앱입니다.',
        theme_color: '#270082',
        background_color: '#1E1E48',
        display: 'fullscreen',
        orientation: 'any',
        icons: [
          {
            src: 'android/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],

  server: {
    host: '0.0.0.0',   // bind all interfaces (accessible from both Windows & WSL)
    port: DEV_PORT,
    strictPort: false,  // auto-increment if port is already in use (avoids kill-each-other)
    open: !isWSL,       // auto-open browser only on native Windows (WSL can't open)
  },

  preview: {
    port: 4173
  }
});
