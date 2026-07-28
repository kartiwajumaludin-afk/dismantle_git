import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    // Build ringan: JSX diproses langsung oleh esbuild bawaan Vite,
    // tanpa @vitejs/plugin-react (yang sering bentrok versi peer-nya
    // sama Vite terbaru). Ini cukup untuk `npm run build` produksi —
    // cuma kehilangan Fast Refresh saat `npm run dev`, yang memang
    // tidak dipakai di alur kerja ini (pakai vhost + build).
    esbuild: {
        jsx: 'automatic',
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
