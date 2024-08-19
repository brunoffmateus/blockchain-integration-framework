# Makefile for SATP setup and running

DOCKER_USERNAME ?= brunoffmateus
APPLICATION_NAME := satp-hermes-gateway
DOCKER_TAG ?= latest
DOCKER_IMAGE := ${DOCKER_USERNAME}/${APPLICATION_NAME}:${DOCKER_TAG}
SERVER_PORT?=3000
CLIENT_PORT?=3010
GRPC_PORT?=3020

.PHONY: setup-env run-gateway clean

setup-env:
	@echo "Setting up environment for SATP-Hermes..."

	# Check if Node.js is installed, if not, install it
	@if ! command -v node >/dev/null 2>&1; then \
		echo "Installing Node.js 18.18.2..."; \
		sudo curl -fsSL https://nodejs.org/dist/v18.18.2/node-v18.18.2-linux-x64.tar.xz | sudo tar -xJ -C /usr/local --strip-components=1; \
	fi

	@if ! command -v yarn >/dev/null 2>&1; then \
		echo "Installing Yarn..."; \
		sudo npm install -g yarn; \
	fi

	# Install dependencies and compile the plugin
	yarn install
	yarn tsc

	@echo "Initializing databases..."
	yarn db:init

	@echo "Environment setup complete."

run-gateway:
	@echo "Building SATP Gateway Docker image..."
	docker build -t ${DOCKER_IMAGE} .

	@echo "Running SATP Gateway Docker container..."
	docker run --privileged -d -m 4g \
		-p ${SERVER_PORT}:3000 \
		-p ${CLIENT_PORT}:3010 \
		-p ${GRPC_PORT}:3020 \
		-e DOCKER_TLS_CERTDIR=/certs \
		-v satp_hermes_docker_certs:/certs \
		-v satp_hermes_docker_data:/var/lib/docker \
		--name ${APPLICATION_NAME} \
		${DOCKER_IMAGE}

	# @echo "Pushing SATP Gateway Docker image..."
	# docker push ${DOCKER_IMAGE}

clean:
	@echo "Cleaning up SATP-Hermes environment..."

	@echo "Rolling back database migrations..."
	yarn db:rollback
	
	@echo "Removing SQLite database files..."
	find src/knex -name "*.sqlite3" -type f -delete
	
	@echo "Stopping and removing Docker resources..."
	-docker stop ${APPLICATION_NAME}
	-docker rm ${APPLICATION_NAME}
	-docker rmi ${DOCKER_IMAGE}

	@echo "Cleanup complete."