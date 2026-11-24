#!/bin/sh
# Hapus seluruh data (kecuali tabel migration), lalu seed ulang. Hanya untuk lingkungan dev/test.
set -e
docker exec simrs-postgres psql -U simrs -d simrs -v ON_ERROR_STOP=1 -c "do \$\$ declare t text; begin select string_agg(quote_ident(table_name),',') into t from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name<>'migration'; execute 'truncate '||t||' restart identity cascade'; end \$\$"
docker compose exec -T yii php yii migrate --interactive=0
docker compose exec -T yii php yii seed
docker compose exec -T yii php yii cache/flush-schema db --interactive=0
