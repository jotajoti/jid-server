FROM node:14-alpine3.14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY build build
COPY migrations migrations

ENV port=8080
EXPOSE 8080
CMD [ "node", "build/app.js" ]
