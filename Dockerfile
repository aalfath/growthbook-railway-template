# GrowthBook for Railway: the official image, pinned by version and digest.
# Bump both together; see CHANGELOG.md.
FROM growthbook/growthbook:5.2.1@sha256:0da8afcb9ed92d8e09abca3ea9d9531e29b7e39b0bccba03d9a3d4cc47f1f60d

# Fixed settings for a single-container production install behind Railway's proxy.
ENV NODE_ENV=production \
    PORT=8080 \
    BACKEND_PORT=3100 \
    UPLOAD_METHOD=local \
    EXPRESS_TRUST_PROXY_OPTS=true \
    GB_STATS_ENGINE_MIN_POOL_SIZE=0 \
    PM2_AUTORESTART=true \
    NEXT_TELEMETRY_DISABLED=1

COPY railway/ /usr/local/src/app/railway/

# entry.js starts as root only to make the uploads volume writable,
# then runs GrowthBook and the proxy as the image's own user (uid 1000).
USER 0
EXPOSE 8080
CMD ["/usr/local/bin/node", "/usr/local/src/app/railway/entry.js"]
