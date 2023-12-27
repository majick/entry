FROM oven/bun:latest

COPY . /app

WORKDIR /app
RUN ["bun", "install"]
RUN ["bun","run", "build"]


FROM oven/bun:latest
COPY --from=0 ["/app/package.json", "./"]
RUN bun install

COPY --from=0 ["/app/dist", "./dist"]
CMD ["bun", "run", "start:no-build"]

# image details
LABEL org.opencontainers.image.source="https://codeberg.org/sentrytwo/bundles"
LABEL org.opencontainers.image.description="Lightweight Markdown Pastebin"
LABEL org.opencontainers.image.title="bundles"
LABEL org.opencontainers.image.url="https://www.sentrytwo.com"
LABEL org.opencontainers.image.revision=""
LABEL org.opencontainers.image.version=""
LABEL org.opencontainers.image.created=""
