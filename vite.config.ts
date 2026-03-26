import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: '/index.html',
        },
      },
      importProtection: {
        client: { files: ['**/*.server.*', '**/server/**'] },
        server: { files: ['**/*.client.*', '**/client/**'] },
      },
    }),
    // Override the server function base URL for extension context (client only).
    // The server must keep its relative /_serverFn/ path for routing.
    {
      name: 'extension-server-fn-base',
      config() {
        return {
          environments: {
            client: {
              define: {
                'process.env.TSS_SERVER_FN_BASE': JSON.stringify(`${SERVER_URL}/_serverFn/`),
                'import.meta.env.TSS_SERVER_FN_BASE': JSON.stringify(`${SERVER_URL}/_serverFn/`),
              },
            },
          },
        }
      },
      enforce: 'post',
    },
  ],
})
