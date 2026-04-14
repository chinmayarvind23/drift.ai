FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm install
RUN npm run build:web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@drift/web", "--", "-p", "3000"]
