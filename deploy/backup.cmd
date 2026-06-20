@echo off
REM Daily production DB backup for the mini-PC.
REM 1) pg_dump -Fc of the kanban Postgres into %BACKUP_DIR% (14-day rotation)
REM 2) optional offsite copy to MinIO (enabled if the creds file exists)
REM Scheduled via Task Scheduler (see deploy/README.md).
REM
REM Restore one:
REM   docker exec -i kanban-pg pg_restore -U kanban -d kanban --clean --if-exists < kanban-YYYYMMDD-HHMMSS.dump
setlocal
set "BACKUP_DIR=C:\Users\minipc\kanban-backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
docker exec kanban-pg pg_dump -U kanban -Fc kanban > "%BACKUP_DIR%\kanban-%STAMP%.dump"
forfiles /p "%BACKUP_DIR%" /m kanban-*.dump /d -14 /c "cmd /c del @path" 2>nul

REM ---- optional: mirror to MinIO (second copy) ----
REM Create C:\Users\minipc\kanban-backup.secret.cmd with:
REM   set "S3_ENDPOINT=http://host.docker.internal:9000"
REM   set "S3_USER=<minio root user>"
REM   set "S3_PASS=<minio root password>"
REM   set "S3_BUCKET=kanban-backups"
REM Keep `call` and the docker run OUT of a parenthesised ( ... ) block: inside a
REM block cmd expands %S3_BUCKET% at PARSE time — before `call` sets it — so the
REM mirror target became `m/` (empty bucket) and mc made one junk bucket per dump
REM file. At top level the vars expand after `call`, as intended.
set "SECRET=C:\Users\minipc\kanban-backup.secret.cmd"
if not exist "%SECRET%" goto :done
call "%SECRET%"
if not defined S3_BUCKET set "S3_BUCKET=kanban-backups"
docker run --rm --add-host host.docker.internal:host-gateway -v "%BACKUP_DIR%":/backups --entrypoint /bin/sh minio/mc -c "mc alias set m %S3_ENDPOINT% %S3_USER% %S3_PASS% >/dev/null 2>&1 && mc mb -p m/%S3_BUCKET% >/dev/null 2>&1; mc mirror --overwrite --remove /backups m/%S3_BUCKET%"
:done
endlocal
