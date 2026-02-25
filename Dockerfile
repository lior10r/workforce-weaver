# ---- Stage 1: Build React frontend ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Production runtime ----
FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev && npm install better-sqlite3

# Copy server source
COPY server/ ./server/

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Use the SQLite-based entry point
ENV NODE_ENV=production
ENV PORT=3001

# Data directory for SQLite DB (mount a PersistentVolume here)
VOLUME ["/app/server/data"]

EXPOSE 3001

CMD ["node", "server/index-sqlite.js"]
