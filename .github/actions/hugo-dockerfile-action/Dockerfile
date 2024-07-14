FROM alpine:3.20

RUN apk add --no-cache hugo nodejs npm libsass go git

WORKDIR /app
COPY . /app
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]