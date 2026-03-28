.PHONY: cleanDev watchDev startDev clean watch start

VERSION := $(shell date +%s)

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
		sed -i 's/?v=[^"]*/?v=$(VERSION)/g' front/src/index.html
		docker-compose up --build

start:
		sed -i 's/?v=[^"]*/?v=$(VERSION)/g' front/src/index.html
		docker-compose up --build -d