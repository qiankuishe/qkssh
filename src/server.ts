import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import fastifyWebsocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import { sshRoutes } from './routes/ssh.js'
import { config } from './config.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const fastify = Fastify({ 
    logger: config.debug,
    bodyLimit: 1024 * 1024 // 1MB
  })

  // 安全响应头
  fastify.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "font-src 'self' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none'"
    )
  })

  // CORS
  const allowedOrigins = config.allowOrigins === '*' ? true : config.allowOrigins.split(',')
  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true
  })

  // 速率限制 - /api/connect 端点
  await fastify.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    skipOnError: true,
    addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true },
    addHeaders: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true, 'retry-after': true }
  })

  // WebSocket 支持
  await fastify.register(fastifyWebsocket, {
    options: { maxPayload: 1024 * 1024 }
  })

  // 静态文件服务（前端）
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/'
  })

  // SSH 路由
  await fastify.register(sshRoutes, { prefix: '/api' })

  // 健康检查
  fastify.get('/health', async () => ({ 
    status: 'ok', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }))

  // SPA 回退路由
  fastify.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api/')) {
      return reply.sendFile('index.html')
    }
    reply.status(404).send({ error: 'Not Found' })
  })

  // 启动服务器
  await fastify.listen({ port: config.port, host: config.address })
  console.log(`🚀 千葵SSH 启动成功`)
  console.log(`📡 监听地址: http://${config.address}:${config.port}`)
  console.log(`🔧 调试模式: ${config.debug}`)
  console.log(`🔗 最大连接数: ${config.maxConn}`)
}

main().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
})
