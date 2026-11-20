import { defineConfig } from 'vite'

export default defineConfig({
  root: 'web',
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:52743', changeOrigin: true } },
    host: '127.0.0.1',
    port: 52741,
    strictPort: true,
    fs: { allow: ['.', '../node_modules', '../sets/trivia', '../schemas', '../design/trivia-ui/mockups'] },
  },
  preview: { host: '127.0.0.1', port: 52742, strictPort: true },
})
