export interface ConnectionConfig {
  hostname: string
  port: number
  username: string
  password?: string
  privatekey?: string
  passphrase?: string
}

// 解析 URL 参数
export function parseUrlParams(): ConnectionConfig | null {
  const params = new URLSearchParams(window.location.search)
  const hostname = params.get('hostname')
  
  if (!hostname) return null

  let password = params.get('password') || ''
  // 尝试 Base64 解码密码
  if (password) {
    try {
      password = atob(password)
    } catch {
      // 如果解码失败，使用原始值
    }
  }

  return {
    hostname,
    port: parseInt(params.get('port') || '22', 10),
    username: params.get('username') || 'root',
    password,
    privatekey: params.get('privatekey') || '',
    passphrase: params.get('passphrase') || ''
  }
}

// 生成快速连接链接
export function generateQuickLink(config: ConnectionConfig): string {
  const params = new URLSearchParams()
  params.set('hostname', config.hostname)
  params.set('port', config.port.toString())
  params.set('username', config.username)
  
  if (config.password) {
    // Base64 编码密码
    params.set('password', btoa(config.password))
  }

  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

// API 调用
export async function connectSSH(config: ConnectionConfig): Promise<{ success: boolean; session_id?: string; message?: string }> {
  const response = await fetch('/api/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostname: config.hostname,
      port: config.port,
      username: config.username,
      password: config.password,
      privatekey: config.privatekey,
      passphrase: config.passphrase
    })
  })
  return response.json()
}

// 创建 WebSocket 连接
export function createWebSocket(sessionId: string): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/ws?session_id=${sessionId}`
  return new WebSocket(wsUrl)
}
