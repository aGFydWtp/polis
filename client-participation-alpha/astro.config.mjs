// @ts-check
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'

import node from '@astrojs/node'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: '0.0.0.0',
    // Respect an externally assigned port (e.g. preview tooling); default stays 4321
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  },
  integrations: [
    react({
      experimentalDisableStreaming: true,
      experimentalReactChildren: true
    })
  ]
})
