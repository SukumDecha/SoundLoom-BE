# Step 1: Build the NestJS app
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

# Copy source code and environment variables
COPY . .
COPY .env.production .env

# Build the NestJS app
RUN pnpm build

# Step 2: Production image
FROM node:18-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Install production dependencies
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod

# Copy built app and environment variables
COPY --from=builder /app/dist dist
COPY --from=builder /app/.env.production .env

# Expose the application port
EXPOSE 3000

# Start the NestJS application
CMD ["node", "dist/main.js"]
