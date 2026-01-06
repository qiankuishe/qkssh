import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { SocketStream } from '@fastify/websocket'
import { sessionManager, SSHSessionConfig } from '../ssh/session-manager.js'

interface ConnectBody {
  hostname: string
  port?: number
  username: string
  password?: string
  privatekey?: string
  passphrase?: string
}

interface ResizeMessage {
  type: 'resize'
  cols: number
  rows: number
}

interface DataMessage {
  type: 'data'
  data: string
}

type WSMessage = ResizeMessage | DataMessage | string

export async function sshRoutes(fastify: FastifyInstance) {
  // 建立 SSH 连接
  fastify.post('/connect', async (request: FastifyRequest<{ Body: ConnectBody }>, reply: FastifyReply) => {
    const { hostname, port = 22, username, password, privatekey, passphrase } = request.body

    // 验证必填参数
    if (!hostname?.trim()) {
      return reply.send({ success: false, message: '主机地址不能为空' })
    }
    if (!username?.trim()) {
      return reply.send({ success: false, message: '用户名不能为空' })
    }
    if (!password && !privatekey) {
      return reply.send({ success: false, message: '请提供密码或私钥' })
    }

    // 验证端口范围
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port
    if (portNum < 1 || portNum > 65535) {
      return reply.send({ success: false, message: '端口范围无效 (1-65535)' })
    }

    try {
      const config: SSHSessionConfig = {
        hostname: hostname.trim(),
        port: portNum,
        username: username.trim(),
        password,
        privateKey: privatekey,
        passphrase
      }

      const session = await sessionManager.createSession(config)
      
      return reply.send({
        success: true,
        session_id: session.id
      })
    } catch (err: any) {
      console.error('SSH 连接失败:', err.message)
      
      let message = '连接失败，请检查地址和凭据'
      if (err.message.includes('Authentication failed') || err.message.includes('All configured authentication methods failed')) {
        message = '认证失败，请检查用户名和密码'
      } else if (err.message.includes('ECONNREFUSED')) {
        message = '连接被拒绝，请检查主机地址和端口'
      } else if (err.message.includes('ETIMEDOUT') || err.message.includes('连接超时')) {
        message = '连接超时，请检查网络或主机地址'
      } else if (err.message.includes('连接数已达上限')) {
        message = '服务器连接数已达上限，请稍后再试'
      }
      
      return reply.send({ success: false, message })
    }
  })

  // WebSocket 终端连接
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, request: FastifyRequest) => {
    const socket = connection.socket
    const sessionId = (request.query as any).session_id

    console.log(`WebSocket 连接请求: session_id=${sessionId}`)

    const sendMessage = (data: string | Buffer) => {
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(data)
      }
    }

    const sendJson = (obj: object) => {
      sendMessage(JSON.stringify(obj))
    }

    if (!sessionId) {
      console.log('WebSocket 错误: 缺少 session_id')
      sendJson({ type: 'error', message: '缺少 session_id' })
      socket.close()
      return
    }

    const session = sessionManager.getSession(sessionId)
    if (!session) {
      console.log(`WebSocket 错误: 会话不存在 ${sessionId}`)
      sendJson({ type: 'error', message: '会话不存在或已过期' })
      socket.close()
      return
    }

    // 检查 SSH 客户端是否仍然连接
    if (!session.connected) {
      console.log(`WebSocket 错误: SSH 连接已断开 ${sessionId}`)
      sendJson({ type: 'error', message: '会话已过期，请重新连接' })
      socket.close()
      sessionManager.removeSession(sessionId)
      return
    }

    // 检查会话是否已经有活动的 shell（防止重复连接）
    if (session.stream) {
      console.log(`WebSocket 错误: 会话已被使用 ${sessionId}`)
      sendJson({ type: 'error', message: '会话已被使用' })
      socket.close()
      return
    }

    console.log(`WebSocket 会话找到: ${sessionId}, 开始启动 shell`)

    // 启动 shell（不要在这之前删除会话）
    sessionManager.startShell(sessionId).then(stream => {
      // 不再从会话管理器中移除，让清理定时器处理
      // 会话已经有 stream 了，不会被重复使用
      
      console.log(`Shell 启动成功: ${sessionId}`)
      
      // 发送连接成功消息
      sendJson({ type: 'connected' })

      // SSH -> WebSocket
      stream.on('data', (data: Buffer) => {
        sendMessage(data)
      })

      stream.stderr?.on('data', (data: Buffer) => {
        sendMessage(data)
      })

      stream.on('close', () => {
        socket.close()
      })

      stream.on('error', (err: Error) => {
        console.error('SSH stream error:', err.message)
        socket.close()
      })

      // WebSocket -> SSH
      socket.on('message', (message: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const msgStr = Buffer.isBuffer(message) 
            ? message.toString() 
            : Array.isArray(message) 
              ? Buffer.concat(message).toString()
              : Buffer.from(message).toString()
          
          // 尝试解析为 JSON
          try {
            const parsed = JSON.parse(msgStr) as WSMessage
            
            if (typeof parsed === 'object' && parsed.type === 'resize') {
              const { cols, rows } = parsed as ResizeMessage
              stream.setWindow(rows, cols, 0, 0)
              return
            }
            
            if (typeof parsed === 'object' && parsed.type === 'data') {
              stream.write((parsed as DataMessage).data)
              return
            }
          } catch {
            // 不是 JSON，直接作为终端输入
          }
          
          // 直接写入终端
          stream.write(msgStr)
        } catch (err) {
          console.error('处理 WebSocket 消息错误:', err)
        }
      })

      socket.on('close', () => {
        stream.close()
        session.client.end()
        session.connected = false
        // 不立即删除会话，让清理定时器处理
        // 这样可以处理 React StrictMode 的双重挂载
        console.log(`WebSocket 连接关闭: ${sessionId}`)
      })

      socket.on('error', (err: Error) => {
        console.error('WebSocket error:', err.message)
        stream.close()
        session.client.end()
        session.connected = false
        // 不立即删除会话，让清理定时器处理
      })

    }).catch(err => {
      console.error('启动 shell 失败:', err.message)
      sendJson({ type: 'error', message: '启动终端失败' })
      socket.close()
      session.client.end()
      sessionManager.removeSession(sessionId)
    })
  })

  // 获取服务器状态
  fastify.get('/status', async () => {
    return {
      connections: sessionManager.getSessionCount(),
      timestamp: new Date().toISOString()
    }
  })
}
