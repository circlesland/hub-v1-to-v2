#!/bin/bash
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ ! -d "$SCRIPT_DIR/ganache/db-snapshot" ] && [ -d "$SCRIPT_DIR/ganache/db" ] ; then
  sudo cp -r $SCRIPT_DIR/ganache/db $SCRIPT_DIR/ganache/db-snapshot
fi
sudo docker-compose up