FROM oven/bun

WORKDIR /app

COPY ["package.json", "./"]
RUN bun install

COPY ["dist", "./dist"]
CMD ["bun", "run", "start:no-build"]
