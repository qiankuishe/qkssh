import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { createWebSocket } from '../utils/connection'
import clsx from 'clsx'
import 'xterm/css/xterm.css'

interface Props {
  sessionId: string
  hostname: string
  username: string
  onDisconnect: () => void
}

export default function Terminal({ sessionId, hostname, username, onDisconnect }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState('')
  const effectIdRef = useRef(0)

  useEffect(() => {
    if (!terminalRef.current) return

    // 每次 effect 运行时增加 ID，用于识别过期的回调
    const currentEffectId = ++effectIdRef.current
    let isCleanedUp = false

    // 创建终端实例
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#e8dfd3',
        cursor: '#d4a574',
        cursorAccent: '#1a1a1a',
        selectionBackground: 'rgba(212, 165, 116, 0.3)',
        black: '#1a1a1a',
        red: '#c0392b',
        green: '#7d9a6f',
        yellow: '#d4a574',
        blue: '#5d8aa8',
        magenta: '#a67c52',
        cyan: '#5f9ea0',
        white: '#e8dfd3',
        brightBlack: '#4a4035',
        brightRed: '#e74c3c',
        brightGreen: '#8fae7f',
        brightYellow: '#e8c49a',
        brightBlue: '#7eb8da',
        brightMagenta: '#c9a86c',
        brightCyan: '#7ec8c8',
        brightWhite: '#faf8f5'
      },
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // 检查是否是当前 effect（用于异步回调）
    const isCurrentEffect = () => effectIdRef.current === currentEffectId && !isCleanedUp

    // 初始适配
    setTimeout(() => {
      if (isCurrentEffect()) {
        try {
          fitAddon.fit()
        } catch (e) {
          // 忽略已销毁的终端错误
        }
      }
    }, 100)

    // 创建 WebSocket 连接
    const ws = createWebSocket(sessionId)
    wsRef.current = ws

    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      if (!isCurrentEffect()) return
      console.log('WebSocket 已连接')
    }

    ws.onmessage = (event) => {
      if (!isCurrentEffect()) return
      
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'connected') {
            setIsConnected(true)
            setError('') // 清除之前的错误
            // 发送初始终端大小
            const { cols, rows } = term
            ws.send(JSON.stringify({ type: 'resize', cols, rows }))
            term.focus()
          } else if (msg.type === 'error') {
            setError(msg.message)
          }
        } catch {
          // 普通文本数据
          term.write(event.data)
        }
      } else {
        // 二进制数据
        const data = new Uint8Array(event.data)
        term.write(data)
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket 已断开, code:', event.code, 'reason:', event.reason)
      if (!isCurrentEffect()) return
      
      setIsConnected(false)
      // 只有在正常连接后断开才显示消息
      try {
        term.write('\r\n\x1b[31m连接已断开\x1b[0m\r\n')
      } catch (e) {
        // 忽略已销毁的终端错误
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket 错误:', err)
      if (!isCurrentEffect()) return
      
      setError('WebSocket 连接失败，请检查网络')
    }

    // 终端输入 -> WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'data', data }))
      }
    })

    // 终端大小变化
    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })

    // 窗口大小变化
    const handleResize = () => {
      if (isCurrentEffect() && fitAddonRef.current) {
        try {
          fitAddonRef.current.fit()
        } catch (e) {
          // 忽略已销毁的终端错误
        }
      }
    }
    window.addEventListener('resize', handleResize)

    // 清理
    return () => {
      isCleanedUp = true
      window.removeEventListener('resize', handleResize)
      
      // 关闭 WebSocket
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      
      // 销毁终端
      try {
        term.dispose()
      } catch (e) {
        // 忽略已销毁的终端错误
      }
      
      xtermRef.current = null
      fitAddonRef.current = null
      wsRef.current = null
    }
  }, [sessionId])

  // 全屏变化时重新适配
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit()
          xtermRef.current.focus()
        } catch (e) {
          // 忽略已销毁的终端错误
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isFullscreen])

  const handleDisconnect = () => {
    wsRef.current?.close()
    onDisconnect()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div 
      className={clsx(
        "flex flex-col bg-bg-card border border-border-main shadow-xl overflow-hidden transition-all duration-300",
        isFullscreen 
          ? "fixed inset-0 z-50 rounded-none" 
          : "h-full rounded-2xl m-4"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#2a2520] to-[#3a332c] border-b border-border-main">
        <div className="flex items-center gap-2 text-sm">
          <span className={clsx(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-gray-300 font-medium">
            {username}@{hostname}
          </span>
        </div>
        
        {/* 控制按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleDisconnect}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="断开连接"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* 终端 */}
      <div 
        ref={terminalRef} 
        className="flex-1 bg-[#1a1a1a]"
        style={{ padding: '8px' }}
      />
    </div>
  )
}
