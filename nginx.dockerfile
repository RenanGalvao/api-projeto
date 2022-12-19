## BASE IMAGE
FROM nginx:1.23.3-alpine as base-image

# ENVs
ARG DOLLAR="$"
ARG BACKEND_SERVER_URL
ARG BACKEND_SERVER_NAME
ARG BACKUP_SERVER_URL
ARG BACKUP_SERVER_NAME
ARG SERVER_NAME
ARG PUBLIC_API_URL
ARG PUBLIC_STATIC_PATH
ARG MAX_CONN_WEB
ARG MAX_CONN_API

# Caching
RUN mkdir -p /var/cache/nginx && chown nginx:nginx /var/cache/nginx

# Folders
RUN mkdir -p /etc/nginx/sites-available
RUN mkdir -p /etc/nginx/sites-enabled

# Conf File
COPY nginx /etc/nginx

RUN envsubst < /etc/nginx/conf.d/cors-preflight.template > /etc/nginx/conf.d/cors-preflight.conf
RUN envsubst < /etc/nginx/conf.d/limits.template > /etc/nginx/conf.d/limits.conf
RUN envsubst < /etc/nginx/nginx.template > /etc/nginx/nginx.conf

## DEV IMAGE
FROM base-image as dev-image

RUN envsubst < /etc/nginx/sites-available/api.http.template > /etc/nginx/sites-available/api.localhost
RUN envsubst < /etc/nginx/sites-available/web.http.template > /etc/nginx/sites-available/localhost
RUN ln -s /etc/nginx/sites-available/api.localhost /etc/nginx/sites-enabled/api.localhost
RUN ln -s /etc/nginx/sites-available/localhost /etc/nginx/sites-enabled/localhost

EXPOSE 80/TCP
CMD ["/bin/sh", "-c", "exec nginx -g 'daemon off;';"]

## PROD IMAGE
FROM base-image as prod-image

COPY nginx/dhparam-2048.pem /etc/ssl/certs/dhparam-2048.pem

RUN envsubst < /etc/nginx/conf.d/ssl.template > /etc/nginx/conf.d/ssl.conf
RUN envsubst < /etc/nginx/sites-available/api.https.template > /etc/nginx/sites-available/api.projetoumportodostodosporum.org
RUN envsubst < /etc/nginx/sites-available/web.https.template > /etc/nginx/sites-available/projetoumportodostodosporum.org
RUN ln -s /etc/nginx/sites-available/api.projetoumportodostodosporum.org /etc/nginx/sites-enabled/api.projetoumportodostodosporum.org
RUN ln -s /etc/nginx/sites-available/projetoumportodostodosporum.org /etc/nginx/sites-enabled/projetoumportodostodosporum.org

EXPOSE 80/TCP
EXPOSE 443/TCP
CMD ["/bin/sh", "-c", "exec nginx -g 'daemon off;';"]
