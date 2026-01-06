# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 复制 package.json
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# 安装依赖
RUN npm ci
RUN cd frontend && npm ci

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 运行阶段
FROM node:20-alpine

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache tini

# 创建非 root 用户（使用不同的 UID 避免冲突）
RUN addgroup -S qkssh && \
    adduser -S -G qkssh qkssh

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# 设置权限
RUN chown -R qkssh:qkssh /app

# 切换用户
USER qkssh

# 环境变量
ENV NODE_ENV=production
ENV QKSSH_PORT=3131
ENV QKSSH_ADDRESS=0.0.0.0

# 暴露端口
EXPOSE 3131

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3131/health || exit 1

# 使用 tini 作为 init 进程
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
