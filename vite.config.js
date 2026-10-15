/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(async ({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const plugins = [react()]

  if (command === 'serve') {
    try {
      const { localPersonImportPlugin } = await import('./scripts/localPersonImport.js')
      plugins.push(localPersonImportPlugin(env))
    } catch (e) {
      console.warn('Local person import plugin omitido:', e.message)
    }
  }

  return {
    // Private env stays in Node; never add it to define or envPrefix.
    plugins,
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
