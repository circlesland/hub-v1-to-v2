#!/bin/bash
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
GANACHE_DB_DIR="$SCRIPT_DIR/db"
BOOTSTRAPPER_DIR="$SCRIPT_DIR/bootstrapper"

if [ -d "$SCRIPT_DIR/db-snapshot" ]; then
  sudo rm -r -f $SCRIPT_DIR/db
  sudo cp -R $SCRIPT_DIR/db-snapshot $SCRIPT_DIR/db
  exit
else
  sudo rm -r -f $SCRIPT_DIR/db
  mkdir $SCRIPT_DIR/../ganache/db
fi

cd $BOOTSTRAPPER_DIR
npm i

npx ganache-cli \
--db=$GANACHE_DB_DIR \
--blockTime=1 \
--account="0x5bc6328efff9fc724aad89edf1356a6ba7bee56368b4b9b47b1f29a5cd6d73c7,100000000000000000000" \
--account="0x89e62e74143e15eaba362a67f8d71e5371d1268e1769b2613b8483024d17e110,100000000000000000000" \
--account="0xd0f7cc8f8e7d9e10fbf51d8ac39f390acf52bfa96224fb5cff6b189c1a68f328,100000000000000000000" \
--account="0x8a49c61f64ed99f8a59a9bd62cd39238f7256beead025b86e25476e329637b93,100000000000000000000" &

npm run configure

GANACHE_PID="$(ps -ef | grep node.*ganache-cli | grep -v grep | awk '{print $2}')"
kill -15 $GANACHE_PID
