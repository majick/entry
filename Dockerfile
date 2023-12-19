FROM oven/bun

WORKDIR /app

COPY ["package.json", "./"]
RUN bun install

COPY ["dist", "./dist"]
CMD ["bun", "run", "start:no-build"]

# image details
LABEL org.opencontainers.image.source="https://codeberg.org/sentrytwo/bundles"
LABEL org.opencontainers.image.description="Lightweight Markdown Pastebin"
LABEL org.opencontainers.image.title="bundles"
LABEL org.opencontainers.image.url="https://www.sentrytwo.com"
LABEL org.opencontainers.image.revision=""
LABEL org.opencontainers.image.version=""
LABEL org.opencontainers.image.created=""