.PHONY: help network traefik traefik-down app app-down deploy deploy-down logs logs-traefik logs-app build clean

# Detect docker compose command (V2 plugin vs standalone)
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Default target
help:
	@echo "Downloader Deployment Commands"
	@echo ""
	@echo "Using: $(DOCKER_COMPOSE)"
	@echo ""
	@echo "Setup:"
	@echo "  make network        - Create the 'local' Docker network"
	@echo ""
	@echo "Traefik:"
	@echo "  make traefik        - Start Traefik reverse proxy"
	@echo "  make traefik-down   - Stop Traefik"
	@echo "  make logs-traefik   - View Traefik logs"
	@echo ""
	@echo "Application:"
	@echo "  make app            - Start the Downloader application"
	@echo "  make app-down       - Stop the application"
	@echo "  make logs-app       - View application logs"
	@echo "  make build          - Rebuild application containers"
	@echo ""
	@echo "All-in-one:"
	@echo "  make deploy         - Deploy everything (network + traefik + app)"
	@echo "  make deploy-down    - Stop everything"
	@echo ""
	@echo "Maintenance:"
	@echo "  make logs           - View all logs"
	@echo "  make clean          - Remove all containers and volumes"
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make db-shell       - Open PostgreSQL shell"

# Create the external network
network:
	@docker network inspect local >/dev/null 2>&1 || docker network create local
	@echo "Network 'local' is ready"

# Traefik commands
traefik: network
	@if [ ! -f .env.traefik ]; then \
		echo "Error: .env.traefik not found. Copy .env.traefik.example to .env.traefik and configure it."; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) -f docker-compose.traefik.yml --env-file .env.traefik up -d
	@echo "Traefik is running"

traefik-down:
	$(DOCKER_COMPOSE) -f docker-compose.traefik.yml --env-file .env.traefik down

logs-traefik:
	$(DOCKER_COMPOSE) -f docker-compose.traefik.yml --env-file .env.traefik logs -f

# Application commands
app: network
	@if [ ! -f .env.prod ]; then \
		echo "Error: .env.prod not found. Copy .env.prod.example to .env.prod and configure it."; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml --env-file .env.prod up -d
	@echo "Application is running"

app-down:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml --env-file .env.prod down

logs-app:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml --env-file .env.prod logs -f

build:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml --env-file .env.prod build --no-cache

# All-in-one commands
deploy: traefik app
	@echo ""
	@echo "Deployment complete!"
	@echo "  - Traefik dashboard: https://traefik.$(shell grep DOMAIN .env.traefik | cut -d= -f2)"
	@echo "  - Application: https://downloader.mikeng.io or https://downloader.nortrix.io"

deploy-down: app-down traefik-down
	@echo "All services stopped"

# Utility commands
logs:
	@echo "=== Traefik Logs ===" && docker logs traefik --tail 20 2>/dev/null || true
	@echo ""
	@echo "=== Web Logs ===" && docker logs downloader-web --tail 20 2>/dev/null || true
	@echo ""
	@echo "=== Worker Logs ===" && docker logs downloader-worker --tail 20 2>/dev/null || true

clean:
	@echo "Warning: This will remove all containers and volumes!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml --env-file .env.prod down -v 2>/dev/null || true
	$(DOCKER_COMPOSE) -f docker-compose.traefik.yml --env-file .env.traefik down -v 2>/dev/null || true
	@echo "Cleaned up"

# Database commands
db-push:
	@set -a && . ./.env.prod && set +a && \
	docker run --rm --network local \
		-e DATABASE_URL="postgresql://$${POSTGRES_USER:-postgres}:$${POSTGRES_PASSWORD}@downloader-postgres:5432/$${POSTGRES_DB:-downloader}" \
		-v $(PWD)/prisma:/app/prisma \
		-w /app \
		node:22-alpine sh -c "npx prisma@6 db push"

db-migrate:
	@set -a && . ./.env.prod && set +a && \
	docker run --rm --network local \
		-e DATABASE_URL="postgresql://$${POSTGRES_USER:-postgres}:$${POSTGRES_PASSWORD}@downloader-postgres:5432/$${POSTGRES_DB:-downloader}" \
		-v $(PWD)/prisma:/app/prisma \
		-w /app \
		node:22-alpine sh -c "npx prisma@6 migrate deploy"

db-shell:
	@. .env.prod 2>/dev/null && docker exec -it downloader-postgres psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-downloader}
