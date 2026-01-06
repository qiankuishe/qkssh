import { useState, useEffect, useRef } from 'react'
import ConnectForm from './components/ConnectForm'
import Terminal from './components/Terminal'
import { ConnectionConfig, parseUrlParams } from './utils/connection'

// sessionStorage key for form data
const FORM_DATA_KEY = 'qiankui_ssh_form_data'

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionInfo, setConnectionInfo] = useState<{ hostname: string; username: string } | null>(null)
  const [initialConfig, setInitialConfig] = useState<ConnectionConfig | null>(null)
  const [autoConnect, setAutoConnect] = useState(false)
  const lastFormDataRef = useRef<ConnectionConfig | null>(null)

  // 解析 URL 参数或从 sessionStorage 恢复
  useEffect(() => {
    const urlConfig = parseUrlParams()
    if (urlConfig) {
      setInitialConfig(urlConfig)
      // 只有当有密码或私钥时才自动连接
      if (urlConfig.password || urlConfig.privatekey) {
        setAutoConnect(true)
      }
    } else {
      // 尝试从 sessionStorage 恢复（不包含密码）
      const saved = sessionStorage.getItem(FORM_DATA_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ConnectionConfig
          setInitialConfig(parsed)
        } catch {}
      }
    }
  }, [])

  const handleConnect = (sid: string, hostname: string, username: string, formData: ConnectionConfig) => {
    setSessionId(sid)
    setConnectionInfo({ hostname, username })
    setAutoConnect(false)
    // 保存表单数据（不保存密码和私钥）
    lastFormDataRef.current = formData
    const safeData = { ...formData, password: '', privatekey: '', passphrase: '' }
    sessionStorage.setItem(FORM_DATA_KEY, JSON.stringify(safeData))
    // 清除 URL 参数，避免刷新后重复连接
    window.history.replaceState({}, '', window.location.pathname)
  }

  const handleDisconnect = () => {
    setSessionId(null)
    setConnectionInfo(null)
    // 恢复上次的表单数据（包含密码，方便重连）
    if (lastFormDataRef.current) {
      setInitialConfig(lastFormDataRef.current)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-bg-main">
      {sessionId && connectionInfo ? (
        <Terminal
          sessionId={sessionId}
          hostname={connectionInfo.hostname}
          username={connectionInfo.username}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <ConnectForm
          onConnect={handleConnect}
          initialConfig={initialConfig}
          autoConnect={autoConnect}
        />
      )}
    </div>
  )
}

export default App
