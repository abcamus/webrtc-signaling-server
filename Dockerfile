FROM node:18-alpine

WORKDIR /webrtc-signaling-server

COPY package*.json ./
COPY tsconfig.json ./
COPY signaling-server.ts ./
COPY config.ts ./

RUN npm install

RUN npm run build

EXPOSE 1234

CMD ["node", "signaling-server.js"]