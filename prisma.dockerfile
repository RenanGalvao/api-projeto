###################
# BUILD FOR PRODUCTION
###################

# Base Image
FROM node:18-alpine AS build

# Create APP directory
WORKDIR /usr/src/app

# Copy Prisma dependecies
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma

# Needed to run migrations
RUN npm i -D ts-node typescript @types/node prisma

# Clean
RUN  npm cache clean --force

# Set NODE_ENV environment variable
ENV NODE_ENV production

USER node

###################
# PRODUCTION
###################
FROM node:18-alpine As production
WORKDIR /usr/src/app

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/prisma ./prisma
COPY --chown=node:node --from=build /usr/src/app/package.json ./

# Execute Migration
CMD sleep 5 && npx prisma migrate deploy && npx prisma db seed