# Multi-stage production build for Cloud Run
FROM node:20-slim AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json bun.lock* ./

# Install all dependencies (including devDependencies for build step)
RUN npm ci || npm install

# Copy application source files
COPY . .

# Build Vite client assets and bundle server.ts to dist/server.cjs
RUN npm run build

# Production Runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Copy compiled build artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Cloud Run binds to 0.0.0.0:3000
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]
