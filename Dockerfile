# Build stage - Node.js 22 (latest LTS)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Output stage - just copy the static files
FROM alpine:latest AS exporter

WORKDIR /output

# Copy built files from builder
COPY --from=builder /app/out ./

# The static files are now in /output and can be copied out
CMD ["sh", "-c", "echo 'Build complete! Static files are in /output'"]
