import { defineConfig } from 'vite'

export default defineConfig({
  root: 'web',
  server: {
    fs: { allow: ['.', '../node_modules', '../sets/trivia', '../schemas', '../design/trivia-ui/mockups'] },
  },
})
