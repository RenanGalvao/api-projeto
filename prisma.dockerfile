FROM node:18-alpine

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Create APP directory
WORKDIR /usr/src/app

# Copy Prisma dependecies
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma

# Needed to run migrations
RUN npm i -D ts-node typescript @types/node prisma

# Clean
RUN  npm cache clean --force

# Execute Migration
CMD sleep 5 && npx prisma migrate deploy && npx prisma db seed