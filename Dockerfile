FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NOX_AUTH_HOST=0.0.0.0
ENV NOX_AUTH_DB=/data/auth.sqlite
COPY package.json server.cjs store.cjs admin.cjs ./
EXPOSE 4280
CMD ["node", "server.cjs"]
