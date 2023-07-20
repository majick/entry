# Docker

Make sure you have [Docker](https://www.docker.com/) installed before following this guide.

## Docker Compose

Make sure you have [docker-compose](https://docs.docker.com/compose/install/) installed before following this guide.

Entry can be run by copying the [docker-compose.yml](https://codeberg.org/hkau/entry/src/branch/master/docs/docker/docker-compose.yml) file and configuring the values accordingly. The values in the `environment` section match those that are configured when you first run Entry.

```yml
services:
    web:
        image: git.sentrytwo.com/hkau/entry:latest
        restart: unless-stopped
        ports:
            - "8080:8080" # match this (both sides) with your values from env.port
        environment:
            PORT: "8080" # optional, 8080 is default
            NAME: "Entry" # optional, Entry is default
            ADMIN_PASSWORD: "supersecretpassword" # !!!CHANGE THIS!!! (required)
            DATA_LOCATION: ":cwd/data" # optional, :cwd/data is default
            EDITABLE_BY_DEFAULT: true # optional, sets if pastes are editable by default, true is default
```

You can then run `docker-compose up -d` to start Entry locally. Visit the port you configured and you should see the Entry UI.

### Change Data Directory

You can configure the directory that data is stored in with the `DATA_LOCATION` environment variable. Always use an exact path when changing the `DATA_LOCATION`.

```yml
...
        environment:
            ...
            DATA_LOCATION: "/path/to/data/directory"
            ...
```

After you change the location, you must mount this location using `volumes`. It must match on both sides of the colon character.

```yml
...
        environment:
            ...
            DATA_LOCATION: "/path/to/data/directory"
            ...
        volumes:
            - /path/to/data/directory:/path/to/data/directory
```

Your Docker container will now store data in `/path/to/data/directory` instead of inside of the container.
