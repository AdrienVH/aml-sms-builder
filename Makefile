.PHONY: cleanDev watchDev startDev clean watch start

cleanDev:
		docker-compose -f docker-compose.dev.yml down --remove-orphans
		docker image prune -f
		docker volume prune -f

watchDev:
		docker-compose -f docker-compose.dev.yml up --build

startDev:
		docker-compose -f docker-compose.dev.yml up --build -d

clean:
		docker-compose down --remove-orphans
		docker image prune -f
		docker volume prune -f

watch:
		docker-compose up --build

start:
		docker-compose up --build -d