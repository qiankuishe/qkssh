# qiankui-ssh

Web SSH 终端，支持密码和私钥认证，可生成快速连接链接。

## 功能特性

-  **Web 终端** - 基于 xterm.js 的完整终端体验，支持颜色、光标定位
-  **多种认证** - 支持密码认证、私钥认证两种方式
-  **快速链接** - 生成一键连接链接，方便分享给他人
-  **响应式设计** - 适配桌面和移动端，终端自动调整大小
-  **温暖配色** - 与千葵系列一致的设计风格
-  **安全加固** - 速率限制、CSP 头部、连接数限制
-  **会话管理** - 自动清理超时会话，防止资源泄漏
-  **断线重连** - WebSocket 断开后自动尝试重连

## 部署

### Docker 运行

```bash
docker run -d \
  --name qiankui-ssh \
  -p 8888:8888 \
  ghcr.io/qiankuishe/qkssh:latest
```

### Docker Compose

```yaml
services:
  qiankui-ssh:
    image: ghcr.io/qiankuishe/qkssh:latest
    ports:
      - "8888:8888"
    environment:
      - QKSSH_MAXCONN=100
    restart: unless-stopped
```

## 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `QKSSH_ADDRESS` | 监听地址 | 0.0.0.0 |
| `QKSSH_PORT` | 服务端口 | 8888 |
| `QKSSH_TIMEOUT` | SSH 连接超时(秒) | 10 |
| `QKSSH_MAXCONN` | 最大并发连接数 | 100 |
| `QKSSH_ORIGINS` | 允许跨域来源 | * |
| `QKSSH_DEBUG` | 调试模式 | false |

## 项目结构

```
 src/                    # 后端源码
    server.ts          # Fastify 服务入口
    config.ts          # 配置管理
    routes/            # API 路由
        ssh.ts         # SSH 连接接口
    ssh/               # SSH 模块
        session-manager.ts  # 会话管理
 frontend/              # 前端源码
    src/
        App.tsx        # 主应用
        components/    # UI 组件
           ConnectForm.tsx  # 连接表单
           Terminal.tsx     # 终端组件
        utils/         # 工具函数
            connection.ts    # 连接工具
 Dockerfile             # Docker 构建
 docker-compose.yml     # Compose 配置
```

## 安全建议

- 生产环境必须配置 HTTPS（通过反向代理 Nginx/Caddy）
- 设置 `QKSSH_ORIGINS` 限制跨域来源
- 内网使用可绑定到内网 IP：`QKSSH_ADDRESS=192.168.1.100`
- 密码不会保存到浏览器存储，仅在内存中临时保存

## 技术栈

- **前端**: React 18 + TypeScript + xterm.js + Tailwind CSS + Vite
- **后端**: Fastify + ssh2 + TypeScript
- **部署**: Docker 单镜像

## License

MIT
