FROM hugomods/hugo:dart-sass-go-git

WORKDIR /app
COPY . /app
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]