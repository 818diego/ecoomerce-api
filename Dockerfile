# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.strict-dep-builds=false

COPY . .
RUN ./node_modules/.bin/nest build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --config.strict-dep-builds=false

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
