// ============================================
// 共享类型定义
// ============================================

import type { Client, ClientChannel } from 'ssh2'

// SSH 会话配置
export interface SSHSessionConfig {
  hostname: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
}

// SSH 会话
export interface SSHSession {
  id: string
  client: Client
  stream?: ClientChannel
  createdAt: Date
  connected: boolean
}

// WebSocket 消息类型
export type WSMessage = ResizeMessage | DataMessage | ConnectedMessage | ErrorMessage

export interface ResizeMessage {
  type: 'resize'
  cols: number
  rows: number
}

export interface DataMessage {
  type: 'data'
  data: string
}

export interface ConnectedMessage {
  type: 'connected'
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

// API 请求/响应类型
export interface ConnectRequest {
  hostname: string
  port?: number | string
  username: string
  password?: string
  privatekey?: string
  passphrase?: string
}

export interface ConnectResponse {
  success: boolean
  session_id?: string
  message?: string
}

export interface WSQuery {
  session_id?: string
}

// 错误消息常量
export const ErrorMessages = {
  EMPTY_HOSTNAME: '主机地址不能为空',
  EMPTY_USERNAME: '用户名不能为空',
  NO_CREDENTIALS: '请提供密码或私钥',
  INVALID_PORT: '端口范围无效 (1-65535)',
  AUTH_FAILED: '认证失败，请检查用户名和密码',
  CONNECTION_REFUSED: '连接被拒绝，请检查主机地址和端口',
  CONNECTION_TIMEOUT: '连接超时，请检查网络或主机地址',
  MAX_CONNECTIONS: '服务器连接数已达上限，请稍后再试',
  CONNECTION_FAILED: '连接失败，请检查地址和凭据',
  MISSING_SESSION_ID: '缺少 session_id',
  SESSION_NOT_FOUND: '会话不存在或已过期',
  SESSION_EXPIRED: '会话已过期，请重新连接',
  SESSION_IN_USE: '会话已被使用',
  SHELL_START_FAILED: '启动终端失败',
} as const

export type ErrorMessageKey = keyof typeof ErrorMessages
export type ErrorMessageValue = typeof ErrorMessages[ErrorMessageKey]
