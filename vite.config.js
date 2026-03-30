import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default ({ command }) => {
  const basePath = command === 'serve' ? '/' : '/calci/';
  
  return defineConfig({
    plugins: [react()],
    base: basePath,
    server: { port: 6969 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
    },
  });
}
