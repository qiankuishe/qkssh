import { useState, useEffect, useRef } from 'react'
import {
  ServerIcon,
  UserIcon,
  KeyIcon,
  DocumentTextIcon,
  LockClosedIcon,
  LinkIcon,
  CommandLineIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { ConnectionConfig, connectSSH, generateQuickLink } from '../utils/connection'
import clsx from 'clsx'

// 共享的输入框样式
const inputBaseClass = "border border-border-main rounded-xl bg-bg-main text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
const inputWithIconClass = `w-full pl-10 pr-4 py-2.5 ${inputBaseClass} placeholder-text-secondary/60`

interface Props {
  onConnect: (sessionId: string, hostname: string, username: string, formData: ConnectionConfig) => void
  initialConfig: ConnectionConfig | null
  autoConnect: boolean
}

export default function ConnectForm({ onConnect, initialConfig, autoConnect }: Props) {
  const [formData, setFormData] = useState<ConnectionConfig>({
    hostname: '',
    port: 22,
    username: 'root',
    password: '',
    privatekey: '',
    passphrase: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [quickLink, setQuickLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoConnectRef = useRef(false)

  // 初始化表单数据
  useEffect(() => {
    if (initialConfig) {
      setFormData(initialConfig)
    }
  }, [initialConfig])

  // 自动连接（只执行一次）
  useEffect(() => {
    if (autoConnect && initialConfig && !autoConnectRef.current) {
      autoConnectRef.current = true
      // 直接使用 initialConfig 进行连接，不依赖 formData 状态
      handleSubmitWithData(initialConfig)
    }
  }, [autoConnect, initialConfig])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value, 10) || 22 : value
    }))
    if (error) setError('')
    if (quickLink) setQuickLink('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          privatekey: event.target?.result as string
        }))
        setShowPrivateKey(true)
      }
      reader.readAsText(file)
    }
  }

  const handleSubmitWithData = async (data: ConnectionConfig) => {
    setError('')

    if (!data.hostname.trim()) {
      setError('请输入主机地址')
      return
    }
    if (!data.username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!data.password && !data.privatekey) {
      setError('请输入密码或选择私钥')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await connectSSH(data)
      if (result.success && result.session_id) {
        onConnect(result.session_id, data.hostname, data.username, data)
      } else {
        setError(result.message || '连接失败')
      }
    } catch (err) {
      setError('网络错误，请检查服务器是否运行')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    await handleSubmitWithData(formData)
  }

  const handleGenerateLink = () => {
    if (!formData.hostname.trim()) {
      setError('请先输入主机地址')
      return
    }
    const link = generateQuickLink(formData)
    setQuickLink(link)
    setCopied(false)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quickLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案
      const input = document.createElement('input')
      input.value = quickLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'linear-gradient(135deg, var(--bg-main) 0%, var(--bg-card) 100%)' }}
    >
      <div className="w-full max-w-md bg-bg-card rounded-2xl border border-border-main shadow-xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div 
          className="px-6 pt-6 pb-4"
          style={{ background: 'linear-gradient(135deg, rgba(166, 124, 82, 0.1) 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CommandLineIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-primary">qiankui-ssh</h1>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="px-6 py-4 space-y-4" onSubmit={handleSubmit}>
          {/* 主机地址和端口 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-main mb-1.5">主机地址</label>
              <div className="relative">
                <ServerIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  name="hostname"
                  type="text"
                  value={formData.hostname}
                  onChange={handleInputChange}
                  className={inputWithIconClass}
                  placeholder="192.168.1.100"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-text-main mb-1.5">端口</label>
              <input
                name="port"
                type="number"
                value={formData.port}
                onChange={handleInputChange}
                className={`w-full px-3 py-2.5 ${inputBaseClass} text-center`}
                min="1"
                max="65535"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 用户名和密码 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-main mb-1.5">用户名</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={inputWithIconClass}
                  placeholder="root"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-main mb-1.5">密码</label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={inputWithIconClass}
                  placeholder="输入密码"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* 私钥 */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">私钥 (可选)</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-border-main rounded-xl bg-bg-main text-text-secondary hover:border-primary hover:text-primary transition-all"
                disabled={isSubmitting}
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span>选择文件</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pem,.key,.ppk"
                onChange={handleFileSelect}
                className="hidden"
              />
              {formData.privatekey && (
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="px-3 py-2 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  {showPrivateKey ? '隐藏' : '显示'}
                </button>
              )}
            </div>
            {showPrivateKey && (
              <textarea
                name="privatekey"
                value={formData.privatekey}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 ${inputBaseClass} placeholder-text-secondary/60 font-mono text-sm`}
                placeholder="粘贴私钥内容..."
                rows={4}
                disabled={isSubmitting}
              />
            )}
          </div>

          {/* 私钥密码 */}
          {formData.privatekey && (
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">私钥密码 (如需要)</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  name="passphrase"
                  type="password"
                  value={formData.passphrase}
                  onChange={handleInputChange}
                  className={inputWithIconClass}
                  placeholder="私钥的密码短语"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all",
                "bg-gradient-to-br from-primary to-primary-hover",
                "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>连接中...</span>
                </>
              ) : (
                <>
                  <CommandLineIcon className="w-5 h-5" />
                  <span>连接</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium border border-border-main text-text-main hover:border-primary hover:text-primary transition-all disabled:opacity-50"
            >
              <LinkIcon className="w-5 h-5" />
              <span>生成链接</span>
            </button>
          </div>

          {/* 快速链接 */}
          {quickLink && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-bg-main border border-border-main animate-fade-in">
              <input
                type="text"
                value={quickLink}
                readOnly
                className="flex-1 bg-transparent text-sm text-text-main truncate outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  copied 
                    ? "bg-green-100 text-green-600" 
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    <span>复制</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setQuickLink('')}
                className="p-1.5 text-text-secondary hover:text-text-main transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-main">
          <p className="text-xs text-text-secondary text-center">
            提示：生产环境请使用 HTTPS 以保护密码安全
          </p>
        </div>
      </div>

      {/* Author Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-text-secondary">
        <span>Made by <a href="https://github.com/qiankuishe" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">qiankuishe</a></span>
        <span className="text-border-main">·</span>
        <a href="https://github.com/qiankuishe/qkssh" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" title="GitHub项目地址">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
          </svg>
        </a>
      </div>
    </div>
  )
}
