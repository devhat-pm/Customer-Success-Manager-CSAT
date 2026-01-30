# Frontend Dockerfile - Multi-stage build

# Stage 1: Build
FROM public.ecr.aws/docker/library/node:18-slim AS build

WORKDIR /app

# Increase Node memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Set build-time environment variables
ARG VITE_API_URL=http://localhost:8000/api/v1
ARG VITE_APP_NAME="Success Manager"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM public.ecr.aws/docker/library/nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
