import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {resolve} from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['**/node_modules/**', '**/test/**', '**/*.d.ts']
        },
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        css: false
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
}); 