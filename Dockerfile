FROM node:alpine
COPY . /git2consul
WORKDIR /git2consul
RUN apk add git openssh ca-certificates
RUN npm install

ENTRYPOINT ["node", "index.js"]