/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localPersonImportPlugin } from './scripts/localPersonImport.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    // Private env stays in Node; never add it to define or envPrefix.
    plugins: [react(), ...(command === 'serve'
      ? [localPersonImportPlugin(env)]
      : [])],
    // The selected transport is a public UI label; credentials remain server-only.
    define: { 'import.meta.env.VITE_IMPORT_TARGET': JSON.stringify(env.COOPYA_IMPORT_TARGET || 'ords') },
    server: {
      proxy: env.VITE_API_BASE_URL ? {
        '^/api/v1(?:/|$)': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: true,
        },
      } : {},
    },
  }
})
