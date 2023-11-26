# Docker

Make sure you have [Docker](https://www.docker.com/) installed before following this guide.

## Docker Compose

Make sure you have [docker-compose](https://docs.docker.com/compose/install/) installed before following this guide.

Entry can be run by copying the [docker-compose.yml](https://codeberg.org/hkau/entry/src/branch/master/docs/docker/docker-compose.yml) file and configuring the values accordingly. The values in the `environment` section match those that are configured when you first run Entry.

```yml
services:
    web:
        image: codeberg.org/hkau/entry:latest
        restart: unless-stopped
        ports:
            - "8080:8080" # match this (both sides) with your values from env.port
        environment:
            PORT: "8080" # optional, 8080 is default
            NAME: "Entry" # optional, Entry is default
            ADMIN_PASSWORD: "supersecretpassword" # !!!CHANGE THIS!!! (required)
            DATA_LOCATION: ":cwd/data" # optional, :cwd/data is default, only used during first setup
            #                            edit within config file, this value is only used to prefill the value in config.json
            CONFIG_LOCATION: ":cwd/data/config.json" # optional, :cwd/data/config.json is default
            EDITABLE_BY_DEFAULT: true # optional, sets if pastes are editable by default, true is default
```

You can then run `docker-compose up -d` to start Entry locally. Visit the port you configured and you should see the Entry UI.

Note the `DATA_LOCATION` field is not required, and is just used to fill the value in the config file. You can create the config file yourself to skip this step.

```json
// $CONFIG_LOCATION
{
    "port": 8080,
    "name": "Entry",
    "data": ":cwd/data",
    "config": ":cwd/data/config.json",
    "admin": "supersecretpassword"
}
```

This example config file fills all values that are filled by the environment variables, allowing you to only include the `CONFIG_LOCATION` variable if you would like.

### Change Data Directory

You can configure the data directory by changing the value of the `data` field in the server config. The path to the config file can be found within your `docker-compose.yml` file.

```json
// $CONFIG_LOCATION
{
    ...
    "data": ":cwd/data"
    ...
}
```

After you change the location, you must mount this location using `volumes`. It must match on both sides of the colon character.

```yml
...
        volumes:
            - /path/to/data/directory:/path/to/data/directory
```

Your Docker container will now store data in `/path/to/data/directory` instead of inside of the container.
