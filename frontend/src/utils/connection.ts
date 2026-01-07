export interface ConnectionConfig {
  hostname: string
  port: number
  username: string
  password?: string
  privatekey?: string
  passphrase?: string
}

// Base64 编码/解码工具函数（支持 Unicode）
function base64Encode(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => 
    String.fromCharCode(parseInt(p1, 16))
  ))
}

function base64Decode(str: string): string {
  return decodeURIComponent(
    atob(str).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  )
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
      password = base64Decode(password)
    } catch {
      // 如果解码失败，使用原始值
    }
  }

  const portStr = params.get('port')
  const port = portStr ? parseInt(portStr, 10) : 22
  
  return {
    hostname,
    port: isNaN(port) || port < 1 || port > 65535 ? 22 : port,
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
    // Base64 编码密码（支持 Unicode）
    try {
      params.set('password', base64Encode(config.password))
    } catch {
      // 如果编码失败，不包含密码
      console.warn('密码编码失败，链接将不包含密码')
    }
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
