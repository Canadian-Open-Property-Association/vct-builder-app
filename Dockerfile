FROM node:20-alpine

WORKDIR /app

# Create assets directory for uploaded files
RUN mkdir -p /app/assets

COPY package*.json ./
RUN npm install

COPY . .

# Build the frontend for production
RUN npm run build

# Expose the server port (Render uses PORT env var)
EXPOSE 5174

# Volume for persistent asset storage
VOLUME ["/app/assets"]

# Run production server
CMD ["npm", "run", "start"]
