# ---------- 构建阶段 ----------
FROM node:22-alpine AS builder
WORKDIR /app

# 依赖层（利用缓存）
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# 构建
COPY . .
RUN npm run build

# ---------- 运行阶段：nginx 托管静态资源 ----------
FROM nginx:1.27-alpine
LABEL maintainer="neighbor-kitchen"

# 非 root 用户运行（nginx unprivileged）
RUN apk add --no-cache curl && \
    rm /etc/nginx/conf.d/default.conf && \
    sed -i -E 's|^pid\s+/run/nginx.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf && \
    mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=8s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
