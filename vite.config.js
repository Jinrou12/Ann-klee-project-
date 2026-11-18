import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import telegramSendHandler from './api/telegram-send.js'

function telegramMtprotoApiPlugin() {
  const middleware = (req, res, next) => {
    if (req.url && req.url.startsWith('/api/telegram-send')) {
      telegramSendHandler(req, res)
      return
    }
    next()
  }
  return {
    name: 'telegram-mtproto-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), telegramMtprotoApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
