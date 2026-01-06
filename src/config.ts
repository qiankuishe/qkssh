// 配置管理
export const config = {
  // 服务器配置
  address: process.env.QKSSH_ADDRESS || '0.0.0.0',
  port: parseInt(process.env.QKSSH_PORT || '3131', 10),
  
  // SSH 配置
  timeout: parseInt(process.env.QKSSH_TIMEOUT || '10', 10) * 1000, // 转换为毫秒
  maxConn: parseInt(process.env.QKSSH_MAXCONN || '100', 10),
  bufferSize: parseInt(process.env.QKSSH_BUFFER || '32768', 10),
  
  // 安全配置
  allowOrigins: process.env.QKSSH_ORIGINS || '*',
  
  // 其他
  debug: process.env.QKSSH_DEBUG === 'true',
  
  // 会话配置
  sessionTimeout: 30 * 1000, // 30秒未使用的会话自动清理
  cleanupInterval: 30 * 1000, // 清理间隔
}
