FROM node:10-slim
COPY . /git2consul
WORKDIR /git2consul
RUN apt-get update
RUN apt-get install git openssh-client ca-certificates -y
RUN npm install
ENTRYPOINT ["node", "index.js"]