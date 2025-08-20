# Unitco Payment Integration - Makefile

# You can override these in the environment, e.g. `COMPOSE="docker compose -f docker-compose.yml"`
COMPOSE ?= docker compose
TAIL ?= 200

.DEFAULT_GOAL := help

help:
	@echo "Unitco Payment Integration - Make targets"
	@echo ""
	@echo "Basics:"
	@echo "  make build             Build all images"
	@echo "  make build-api         Build API image"
	@echo "  make build-web         Build Web image"
	@echo "  make build-no-cache    Build all images without cache"
	@echo "  make up                Start all services (detached)"
	@echo "  make up-api            Start API service (detached)"
	@echo "  make up-web            Start Web service (detached)"
	@echo "  make down              Stop and remove services"
	@echo "  make purge             Down + remove volumes and orphans"
	@echo "  make restart           Restart all services"
	@echo "  make ps                List services"
	@echo "  make logs              Tail all logs"
	@echo "  make logs-api          Tail API logs"
	@echo "  make logs-web          Tail Web logs"
	@echo "  make logs-mysql        Tail MySQL logs"
	@echo "  make logs-redis        Tail Redis logs"
	@echo "  make sh-api            Exec shell into API container"
	@echo "  make sh-web            Exec shell into Web container"
	@echo "  make mysql             Open MySQL CLI inside container"
	@echo "  make redis             Open Redis CLI inside container"
	@echo "  make health            Run API and Web health checks"
	@echo ""

build:
	$(COMPOSE) build

build-no-cache:
	$(COMPOSE) build --no-cache

build-api:
	$(COMPOSE) build api

build-web:
	$(COMPOSE) build web

up:
	$(COMPOSE) up -d

build-up:
	$(COMPOSE) up --build -d

up-api:
	$(COMPOSE) up -d api

up-web:
	$(COMPOSE) up -d web

down:
	$(COMPOSE) down --remove-orphans

purge:
	$(COMPOSE) down -v --remove-orphans

restart:
	$(COMPOSE) restart

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=$(TAIL)

logs-api:
	$(COMPOSE) logs -f --tail=$(TAIL) api

logs-web:
	$(COMPOSE) logs -f --tail=$(TAIL) web

logs-mysql:
	$(COMPOSE) logs -f --tail=$(TAIL) mysql

logs-redis:
	$(COMPOSE) logs -f --tail=$(TAIL) redis

sh-api:
	$(COMPOSE) exec api sh

sh-web:
	$(COMPOSE) exec web sh

mysql:
	$(COMPOSE) exec mysql sh -lc "mysql -h 127.0.0.1 -u$$MYSQL_USER -p$$MYSQL_PASSWORD $$MYSQL_DATABASE"

redis:
	$(COMPOSE) exec redis sh -lc "redis-cli"

health:
	$(COMPOSE) exec api sh -lc "curl -fsS http://localhost:3000/health || exit 1"
	$(COMPOSE) exec web sh -lc "wget -qO- http://localhost:3000/ >/dev/null || curl -fsS http://localhost:3000/ || exit 1"

rebuild: build up

.PHONY: help build build-no-cache build-api build-web up up-api up-web down purge restart ps logs logs-api logs-web logs-mysql logs-redis sh-api sh-web mysql redis health rebuild
