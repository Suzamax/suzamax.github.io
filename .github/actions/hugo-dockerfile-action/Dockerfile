FROM alpine:3.16.2

RUN apk add --no-cache hugo nodejs npm sass go git

WORKDIR /app
COPY . /app
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]