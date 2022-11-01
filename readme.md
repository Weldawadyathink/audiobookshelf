<br />
<div align="center">
   <img alt="Audiobookshelf Banner" src="https://github.com/advplyr/audiobookshelf/raw/master/images/banner.svg" width="600">

  <p align="center">
    <br />
    <a href="https://audiobookshelf.org/docs">Documentation</a>
    ·
    <a href="https://audiobookshelf.org/install">Install Guides</a>
    ·
    <a href="https://audiobookshelf.org/support">Support</a>
  </p>
</div>

# About

Audiobookshelf is a self-hosted audiobook and podcast server.

### Features

* Fully **open-source**, including the [android & iOS app](https://github.com/advplyr/audiobookshelf-app) *(in beta)*
* Stream all audio formats on the fly
* Search and add podcasts to download episodes w/ auto-download
* Multi-user support w/ custom permissions
* Keeps progress per user and syncs across devices
* Auto-detects library updates, no need to re-scan
* Upload books and podcasts w/ bulk upload drag and drop folders
* Backup your metadata + automated daily backups
* Progressive Web App (PWA)
* Chromecast support on the web app and android app
* Fetch metadata and cover art from several sources
* Chapter editor and chapter lookup (using [Audnexus API](https://audnex.us/))
* Merge your audio files into a single m4b
* Embed metadata and cover image into your audio files (using [Tone](https://github.com/sandreas/tone))
* Basic ebook support and e-reader *(experimental)*

Is there a feature you are looking for? [Suggest it](https://github.com/advplyr/audiobookshelf/issues/new/choose)

Join us on [discord](https://discord.gg/pJsjuNCKRq) or [matrix](https://matrix.to/#/#audiobookshelf:matrix.org)

### Android App (beta)
Try it out on the [Google Play Store](https://play.google.com/store/apps/details?id=com.audiobookshelf.app)

### iOS App (early beta)
Available using Test Flight: https://testflight.apple.com/join/wiic7QIW - [Join the discussion](https://github.com/advplyr/audiobookshelf-app/discussions/60)

<br />

<img alt="Library Screenshot" src="https://github.com/advplyr/audiobookshelf/raw/master/images/LibraryStreamSquare.png" />

<br />

# Organizing your audiobooks

#### Directory structure and folder names are important to Audiobookshelf!

 See [documentation](https://audiobookshelf.org/docs) for supported directory structure, folder naming conventions, and audio file metadata usage.

<br />

# Installation

### Docker Install
Available in Unraid Community Apps

```bash
docker pull ghcr.io/advplyr/audiobookshelf:latest

docker run -d \
  -e AUDIOBOOKSHELF_UID=99 \
  -e AUDIOBOOKSHELF_GID=100 \
  -p 13378:80 \
  -v </path/to/audiobooks>:/audiobooks \
  -v </path/to/podcasts>:/podcasts \
  -v </path/to/config>:/config \
  -v </path/to/metadata>:/metadata \
  --name audiobookshelf \
  ghcr.io/advplyr/audiobookshelf:latest
```

### Docker Update

```bash
docker stop audiobookshelf
docker rm audiobookshelf
docker pull ghcr.io/advplyr/audiobookshelf:latest
docker start audiobookshelf
```

### Running with Docker Compose

```yaml
### docker-compose.yml ###
services:
  audiobookshelf:
    container_name: audiobookshelf
    image: ghcr.io/advplyr/audiobookshelf:latest
    environment:
      - AUDIOBOOKSHELF_UID=99
      - AUDIOBOOKSHELF_GID=100
    ports:
      - 13378:80
    volumes:
      - </path/to/audiobooks>:/audiobooks
      - </path/to/podcasts>:/podcasts
      - </path/to/config>:/config
      - </path/to/metadata>:/metadata
```

### Docker Compose Update

Depending on the version of Docker Compose please run one of the two commands. If not sure on which version you are running you can run the following command and check.

#### Version Check

docker-compose --version or docker compose version

#### v2 Update

```bash
docker compose --file <path/to/config>/docker-compose.yml pull
docker compose --file <path/to/config>/docker-compose.yml up -d
```

#### V1 Update
```bash
docker-compose --file <path/to/config>/docker-compose.yml pull
docker-compose --file <path/to/config>/docker-compose.yml up -d
```

### Linux (amd64) Install

Debian package will use this config file `/etc/default/audiobookshelf` if exists. The install will create a user and group named `audiobookshelf`.

### Ubuntu Install via PPA

A PPA is hosted on [github](https://github.com/advplyr/audiobookshelf-ppa)

See [install docs](https://www.audiobookshelf.org/install/#ubuntu)

### Install via debian package

Get the `deb` file from the [github repo](https://github.com/advplyr/audiobookshelf-ppa).

See [install docs](https://www.audiobookshelf.org/install#debian)


#### Linux file locations

Project directory: `/usr/share/audiobookshelf/`

Config file: `/etc/default/audiobookshelf`

System Service: `/lib/systemd/system/audiobookshelf.service`

Ffmpeg static build: `/usr/lib/audiobookshelf-ffmpeg/`

<br />

# Reverse Proxy Set Up

#### Important! Audiobookshelf requires a websocket connection.

### NGINX Proxy Manager

Toggle websockets support.

<img alt="NGINX Web socket" src="https://user-images.githubusercontent.com/67830747/153679106-b2a7f5b9-0702-48c6-9740-b26b401986e9.png" />

### NGINX Reverse Proxy

Add this to the site config file on your nginx server after you have changed the relevant parts in the <> brackets, and inserted your certificate paths.


```bash
server
{
        listen 443 ssl;
        server_name <sub>.<domain>.<tld>;

        access_log /var/log/nginx/audiobookshelf.access.log;
        error_log /var/log/nginx/audiobookshelf.error.log;

        ssl_certificate      /path/to/certificate;
        ssl_certificate_key  /path/to/key;

        location / {
                     proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
                     proxy_set_header  X-Forwarded-Proto $scheme;
                     proxy_set_header  Host              $host;
                     proxy_set_header Upgrade            $http_upgrade;
                     proxy_set_header Connection         "upgrade";

                     proxy_http_version                  1.1;

                     proxy_pass                          http://<URL_to_forward_to>;
                     proxy_redirect                      http:// https://;
                   }
}
```

### Apache Reverse Proxy

Add this to the site config file on your Apache server after you have changed the relevant parts in the <> brackets, and inserted your certificate paths.

For this to work you must enable at least the following mods using `a2enmod`:
  - `ssl`
  - `proxy_module`
  - `proxy_wstunnel_module`
  - `rewrite_module`

```bash
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName <sub>.<domain>.<tld>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined

    ProxyPreserveHost On
    ProxyPass / http://localhost:<audiobookshelf_port>/
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:<audiobookshelf_port>/$1" [P,L]

    # unless you're doing something special this should be generated by a
    # tool like certbot by let's encrypt
    SSLCertificateFile /path/to/cert/file
    SSLCertificateKeyFile /path/to/key/file
</VirtualHost>
</IfModule>
```


### SWAG Reverse Proxy

[See this solution](https://forums.unraid.net/topic/112698-support-audiobookshelf/?do=findComment&comment=1049637)

### Synology Reverse Proxy

1. Open Control Panel > Application Portal
2. Change to the Reverse Proxy tab
3. Select the proxy rule for which you want to enable Websockets and click on Edit
4. Change to the "Custom Header" tab
5. Click Create > WebSocket
6. Click Save

[from @silentArtifact](https://github.com/advplyr/audiobookshelf/issues/241#issuecomment-1036732329)

### [Traefik Reverse Proxy](https://doc.traefik.io/traefik/)

Middleware relating to CORS will cause the app to report Unknown Error when logging in. To prevent this don't apply any of the following headers to the router for this site:

<ul>
   <li>accessControlAllowMethods</li>
   <li>accessControlAllowOriginList</li>
   <li>accessControlMaxAge</li>
</ul>

From [@Dondochaka](https://discord.com/channels/942908292873723984/942914154254176257/945074590374318170) and [@BeastleeUK](https://discord.com/channels/942908292873723984/942914154254176257/970366039294611506)
<br />

# Run from source

# Contributing

This application is built using [NodeJs](https://nodejs.org/).

### Dev Container Setup
The easiest way to begin developing this project is to use a dev container. An introduction to dev containers in VSCode can be found [here](https://code.visualstudio.com/docs/devcontainers/containers).

Required Software:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [VSCode](https://code.visualstudio.com/download)

*Note, it is possible to use other container software than Docker and IDEs other than VSCode. However, this setup is more complicated and not covered here.*

<div>
<details>
<summary>Install the required software on Windows with <a href=(https://docs.microsoft.com/en-us/windows/package-manager/winget/#production-recommended)>winget</a></summary>

<p>
Note: This requires a PowerShell prompt with winget installed.  You should be able to copy and paste the code block to install.  If you use an elevated PowerShell prompt, UAC will not pop up during the installs.

```PowerShell
winget install -e --id Docker.DockerDesktop; `
winget install -e --id Microsoft.VisualStudioCode
```

</p>
</details>
</div>

<div>
<details>
<summary>Install the required software on MacOS with <a href=(https://snapcraft.io/)>homebrew</a></summary>

<p>

```zsh
brew install --cask docker visual-studio-code
```

</p>
</details>
</div>

<div style="padding-bottom: 1em">
<details>
<summary>Install the required software on Linux with <a href=(https://brew.sh/)>snap</a></summary>

<p>

```zsh
sudo snap install docker; \
sudo snap install code --classic
```

</p>
</details>
</div>

After installing these packages, you can now install the [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) extension for VSCode. After installing this extension open the command pallet (`ctrl+shift+p` or `cmd+shift+p`) and select the command `>Dev Containers: Rebuild and Reopen in Container`. This will cause the development environment container to be built and launched.

You are now ready to start development!

### Manual Environment Setup

If you don't want to use the dev container, you can still develop this project. First, you will need to install [NodeJs](https://nodejs.org/) (version 16) and [FFmpeg](https://ffmpeg.org/).

Next you will need to create a `dev.js` file in the project's root directory. This contains configuration information and paths unique to your development environment. You can find an example of this file in `.devcontainer/dev.js`.

You are now ready to build the client:

```zsh
npm ci
cd client
npm ci
npm run generate
cd ..
```

### Development Commands

After setting up your development environment, either using the dev container or using your own custom environment, the following commands will help you run the server and client.

To run the server, you can use the command `npm run dev`. This will use the client that was built when you ran `npm run generate` in the client directory or when you started the dev container. If you make changes to the server, you will need to restart the server. If you make changes to the client, you will need to run the command `(cd client; npm run generate)` and then restart the server. By default the client runs at `localhost:3333`, though the port can be configured in `dev.js`.

You can also build a version of the client that supports live reloading. To do this, start the server, then run the command `(cd client; npm run dev)`. This will run a separate instance of the client at `localhost:3000` that will be automatically updated as you make changes to the client.

If you are using VSCode, this project includes a couple of pre-defined targets to speed up this process. First, if you build the project (`ctrl+shift+b` or `cmd+shift+b`) it will automatically generate the client. Next, there are debug commands for running the server and client. You can view these targets using the debug panel (bring it up with (`ctrl+shift+d` or `cmd+shift+d`):

* `Debug server`—Run the server.
* `Debug client (nuxt)`—Run the client with live reload.
* `Debug server and client (nuxt)`—Runs both the preceding two debug targets.


# How to Support

[See the incomplete "How to Support" page](https://www.audiobookshelf.org/support)
