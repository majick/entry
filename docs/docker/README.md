# Docker

Make sure you have [Docker](https://www.docker.com/) installed before following this guide.

Entry can be run using the following command.

```bash
docker run  --env PORT={your port} --env NAME={your application name} --env ADMIN_PASSWORD={!!!YOUR ADMIN PASSWORD!!!} -p {match PORT}:{match PORT} hkauxy/entrymd
```

## Docker Compose

Make sure you have [docker-compose](https://docs.docker.com/compose/install/) installed before following this guide.

Entry can be run by copying the [docker-compose.yml](https://codeberg.org/hkau/entry/src/branch/master/docs/docker/docker-compose.yml) file and configuring the values accordingly. The values in the `environment` section match those that are configured when you first run Entry.

```yml
services:
    web:
        image: hkauxy/entrymd:latest
        ports:
            - "8080:8080" # match this (both sides) with your values from env.port
        environment:
            PORT: "8080" # optional, 8080 is default
            NAME: "Entry" # optional, Entry is default
            ADMIN_PASSWORD: "supersecretpassword" # !!!CHANGE THIS!!! (required)
```

You can then run `docker-compose up -d` to start Entry locally. Visit the port you configured and you should see the Entry UI.
