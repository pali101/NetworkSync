FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./

# Copy source files before npm install (because of prepare/build scripts)
COPY src ./src

RUN npm install

# Compile TypeScript to JavaScript
RUN npx tsc

# Stage 2: Create a minimal runtime image
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Healthcheck to ensure the app is running
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

EXPOSE 4000

# Start the compiled app
CMD ["node", "dist/api.js"]