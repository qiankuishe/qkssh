# qkssh

Web SSH 终端，支持密码和私钥认证，可生成快速连接链接。

## 功能特性

- 🖥️ **Web 终端** - 基于 xterm.js 的完整终端体验，支持颜色、光标、滚动
- 🔐 **多种认证** - 支持密码认证、私钥认证（PEM 格式）
- 🔗 **快速链接** - 生成一键连接链接，方便分享给团队成员
- 📱 **响应式设计** - 适配桌面和移动端，触屏友好
- 🎨 **温暖配色** - 与千葵系列一致的设计风格
- 🛡️ **安全加固** - 速率限制、CSP 头部、连接数限制
- ⚡ **实时通信** - WebSocket 双向通信，低延迟

## 部署

### 方式一：Docker 部署（推荐）

```bash
docker run -d \
  --name qkssh \
  -p 8888:8888 \
  ghcr.io/qiankuishe/qkssh:latest
```

Docker Compose:

```yaml
services:
  qkssh:
    image: ghcr.io/qiankuishe/qkssh:latest
    ports:
      - "8888:8888"
    environment:
      - QKSSH_MAXCONN=100
      - QKSSH_ORIGINS=https://your-domain.com
    restart: unless-stopped
```

### 方式二：Node.js 部署

适用于没有 Docker 的服务器，需要 Node.js 20+。

```bash
# 下载最新构建包
curl -L https://github.com/qiankuishe/qkssh/releases/latest/download/qkssh-release.tar.gz -o qkssh.tar.gz

# 解压并运行
tar -xzvf qkssh.tar.gz
cd qkssh
node dist/server.js
```

或者从源码构建：

```bash
git clone https://github.com/qiankuishe/qkssh.git
cd qkssh
npm install
cd frontend && npm install && npm run build && cd ..
npm run build
node dist/server.js
```

使用 PM2 守护进程：

```bash
npm install -g pm2
pm2 start dist/server.js --name qkssh
pm2 save
```

## 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `QKSSH_ADDRESS` | 监听地址 | 0.0.0.0 |
| `QKSSH_PORT` | 服务端口 | 8888 |
| `QKSSH_TIMEOUT` | SSH 连接超时(秒) | 10 |
| `QKSSH_MAXCONN` | 最大并发连接数 | 100 |
| `QKSSH_ORIGINS` | 允许跨域来源（逗号分隔） | * |
| `QKSSH_DEBUG` | 调试模式 | false |

## 项目结构

```
├── src/                    # 后端源码
│   ├── server.ts          # Fastify 服务入口
│   ├── config.ts          # 环境变量配置
│   ├── routes/            # API 路由
│   │   └── ssh.ts         # SSH WebSocket 路由
│   └── ssh/               # SSH 核心
│       └── session-manager.ts  # 会话管理
├── frontend/              # 前端源码
│   └── src/
│       ├── App.tsx        # 主应用
│       ├── components/    # UI 组件
│       │   ├── ConnectForm.tsx  # 连接表单
│       │   └── Terminal.tsx     # 终端组件
│       └── utils/         # 工具函数
│           └── connection.ts    # 连接链接生成
├── Dockerfile             # Docker 多阶段构建
└── docker-compose.yml     # Compose 配置
```

## 使用说明

1. 访问 `http://localhost:8888`
2. 填写 SSH 连接信息（主机、端口、用户名）
3. 选择认证方式：密码或私钥
4. 点击连接，进入终端
5. 可点击「生成链接」创建快速连接 URL

## 安全建议

- 生产环境必须配置 HTTPS（通过反向代理）
- 设置 `QKSSH_ORIGINS` 限制跨域来源
- 内网使用可绑定到内网 IP：`QKSSH_ADDRESS=192.168.1.100`
- 定期检查并发连接数，防止资源耗尽

## 技术栈

- **前端**: React 18 + TypeScript + xterm.js + Tailwind CSS + Vite
- **后端**: Fastify + ssh2 + WebSocket + TypeScript
- **部署**: Docker / Node.js

## License

MIT
