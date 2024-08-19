# FROM node:18.18.2

FROM cruizba/ubuntu-dind:latest

USER root
RUN groupadd -r docker
RUN usermod -aG docker root

RUN apt-get update
RUN apt -y upgrade

# Need curl for healthchecks
RUN apt-get -y install --no-install-recommends curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apt-get -y install --no-install-recommends file

RUN apt-get -y install --no-install-recommends ca-certificates
RUN apt-get -y install --no-install-recommends tzdata

RUN apt-get -y install --no-install-recommends git
RUN apt-get -y install --no-install-recommends apt-utils

RUN apt -y install --no-install-recommends default-jdk

RUN apt-get -y install --no-install-recommends net-tools

ARG APP=/usr/src/app/cactus/
COPY . ${APP}

RUN mkdir -p ${APP}

RUN mkdir -p "${APP}/log/"

WORKDIR ${APP}

SHELL ["/bin/bash", "--login", "-i", "-c"]
# Installing Node Version Manager (nvm)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

RUN source ~/.bashrc && \
    nvm install 18.18.2 && \
    npm install -g yarn ts-node

SHELL ["/bin/bash", "--login", "-c"]

COPY ./healthcheck.sh /
COPY ./supervisord.conf /etc/supervisord.conf
COPY ./run-satp-gateway.sh /
COPY ./tsconfig.json /usr/src/tsconfig.json
COPY ./tsconfig.json /tsconfig.json

RUN chmod +x /run-satp-gateway.sh

EXPOSE 3000
EXPOSE 3010
EXPOSE 3020

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=20s --retries=250 \
    CMD /usr/src/app/cactus/packages/cactus-plugin-satp-hermes/healthcheck.sh