import { Client, ClientChannel } from 'ssh2'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config.js'
import type { SSHSessionConfig, SSHSession } from '../types.js'

export type { SSHSessionConfig, SSHSession }

class SessionManager {
  private sessions: Map<string, SSHSession> = new Map()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  private startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, session] of this.sessions) {
        // 清理条件：
        // 1. 未连接WebSocket且超过30秒的会话
        // 2. 已断开连接的会话
        const isExpired = !session.stream && now - session.createdAt.getTime() > config.sessionTimeout
        const isDisconnected = !session.connected
        
        if (isExpired || isDisconnected) {
          console.log(`清理会话: ${id} (expired: ${isExpired}, disconnected: ${isDisconnected})`)
          this.closeSession(id)
        }
      }
    }, config.cleanupInterval)
  }

  getSessionCount(): number {
    return this.sessions.size
  }

  async createSession(cfg: SSHSessionConfig): Promise<SSHSession> {
    // 检查连接数限制
    if (this.sessions.size >= config.maxConn) {
      throw new Error('连接数已达上限')
    }

    const client = new Client()
    const sessionId = uuidv4()

    return new Promise((resolve, reject) => {
      let isResolved = false
      
      const cleanup = () => {
        client.removeAllListeners()
      }
      
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          client.end()
          reject(new Error('连接超时'))
        }
      }, config.timeout)

      client.on('ready', () => {
        if (isResolved) return
        isResolved = true
        clearTimeout(timeout)
        const session: SSHSession = {
          id: sessionId,
          client,
          createdAt: new Date(),
          connected: true
        }
        this.sessions.set(sessionId, session)
        console.log(`SSH 连接成功: ${cfg.username}@${cfg.hostname}:${cfg.port} [${sessionId}]`)
        resolve(session)
      })

      client.on('error', (err) => {
        if (isResolved) return
        isResolved = true
        clearTimeout(timeout)
        cleanup()
        console.error(`SSH 连接错误: ${err.message}`)
        reject(err)
      })

      // 构建认证配置
      const connectConfig: any = {
        host: cfg.hostname,
        port: cfg.port,
        username: cfg.username,
        readyTimeout: config.timeout,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3
      }

      // 私钥认证
      if (cfg.privateKey) {
        connectConfig.privateKey = cfg.privateKey
        if (cfg.passphrase) {
          connectConfig.passphrase = cfg.passphrase
        }
      }

      // 密码认证
      if (cfg.password) {
        connectConfig.password = cfg.password
        // 添加 keyboard-interactive 认证支持（用于 serv00 等服务器）
        connectConfig.tryKeyboard = true
      }

      // keyboard-interactive 认证回调
      client.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
        // 自动用密码回答所有提示
        const responses = prompts.map(() => cfg.password || '')
        finish(responses)
      })

      // 尝试连接
      try {
        client.connect(connectConfig)
      } catch (err) {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          cleanup()
          reject(err)
        }
      }
    })
  }

  getSession(id: string): SSHSession | undefined {
    return this.sessions.get(id)
  }

  removeSession(id: string): boolean {
    return this.sessions.delete(id)
  }

  closeSession(id: string): void {
    const session = this.sessions.get(id)
    if (session) {
      if (session.stream) {
        session.stream.close()
      }
      session.client.end()
      session.connected = false
      this.sessions.delete(id)
      console.log(`会话已关闭: ${id}`)
    }
  }

  async startShell(sessionId: string): Promise<ClientChannel> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error('会话不存在或已过期')
    }

    return new Promise((resolve, reject) => {
      session.client.shell(
        {
          term: 'xterm-256color',
          cols: 80,
          rows: 24,
          modes: {
            ECHO: 1,
            TTY_OP_ISPEED: 14400,
            TTY_OP_OSPEED: 14400
          }
        },
        (err, stream) => {
          if (err) {
            reject(err)
            return
          }
          session.stream = stream
          resolve(stream)
        }
      )
    })
  }

  /**
   * 调整终端大小
   * 注意：目前 ssh.ts 直接调用 stream.setWindow，此方法保留供外部调用
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (session?.stream) {
      session.stream.setWindow(rows, cols, 0, 0)
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    for (const [id] of this.sessions) {
      this.closeSession(id)
    }
  }
}

// 单例
export const sessionManager = new SessionManager()

// 进程退出时清理
process.on('SIGINT', () => {
  sessionManager.destroy()
  process.exit(0)
})

process.on('SIGTERM', () => {
  sessionManager.destroy()
  process.exit(0)
})
