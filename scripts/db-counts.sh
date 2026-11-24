#!/bin/sh
# Hitung baris eksak semua tabel aplikasi (bukan estimasi statistik).
docker exec simrs-postgres psql -U simrs -d simrs -At -F ' | ' -c "
select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text as baris
from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
