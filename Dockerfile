FROM nginx:1.10.1-alpine

COPY ./ /usr/share/nginx/html
COPY ./conf/nginx-production.conf /etc/nginx/conf.d/default.conf
