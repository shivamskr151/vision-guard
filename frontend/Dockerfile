FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy env.sh script
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Execute env.sh to generate env-config.js from environment variables, then start nginx
CMD ["/bin/sh", "-c", "/docker-entrypoint.d/env.sh && nginx -g 'daemon off;'"]
