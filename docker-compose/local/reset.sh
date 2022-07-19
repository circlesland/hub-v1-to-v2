#!/bin/bash
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

sudo docker-compose rm -v -s -f

sudo docker image rm local_api-db:latest
sudo docker image rm local_blockchain-index-db:latest
sudo docker image rm local_ganache:latest

if [ "$1" = "--hard" ]; then
  sudo rm -r -f $SCRIPT_DIR/ganache/db-snapshot
fi

$SCRIPT_DIR/ganache/configure.sh
