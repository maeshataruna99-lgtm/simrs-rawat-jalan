# Image pengembangan service Node: dependensi dipasang di image, kode di-mount dari host.
FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 3000
CMD ["npm", "run", "dev"]
