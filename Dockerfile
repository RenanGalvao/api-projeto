###################
# BUILD FOR PRODUCTION
###################
FROM node:18-alpine AS build

# Fix Unable to establish a connection to query-engine-node-api library. It seems there is a problem with your OpenSSL installation!
# https://github.com/prisma/prisma/issues/14073#issuecomment-1348534199
RUN apk add --update --no-cache openssl1.1-compat

# Create APP directory
WORKDIR /usr/src/app

# Copy APP dependecies
COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./

# Running `npm ci` removes the existing node_modules directory and passing in --only=production ensures that only the production dependencies are installed. This ensures that the node_modules directory is as optimized as possible
RUN npm ci && npm cache clean --force

# Bundle APP source
COPY --chown=node:node . . 

# Pre Build
RUN npx prisma generate

# Run the build command which creates the production bundle
RUN npm run build

# Set NODE_ENV environment variable
ENV NODE_ENV production

USER node

###################
# PRODUCTION
###################
FROM node:18-alpine  As production
RUN apk add --update --no-cache openssl1.1-compat
WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/package.json ./

EXPOSE 3000

# Start the server using the production build
CMD ["node", "dist/src/main.js"]
