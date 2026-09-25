/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localPersonImportPlugin } from './scripts/localPersonImport.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  // Private env stays in Node; never add it to define or envPrefix.
  plugins: [react(), ...(command === 'serve'
    ? [localPersonImportPlugin({ ...loadEnv(mode, process.cwd(), ''), ...process.env })]
    : [])],
}))
