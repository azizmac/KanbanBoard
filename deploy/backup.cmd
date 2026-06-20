@echo off
REM Daily production DB backup for the mini-PC.
REM Dumps the kanban Postgres (custom/compressed format) into %BACKUP_DIR%,
REM keeping the last 14 days. Scheduled via Task Scheduler (see deploy/README.md).
REM
REM Restore one:
REM   docker exec -i kanban-pg pg_restore -U kanban -d kanban --clean --if-exists < kanban-YYYYMMDD-HHMMSS.dump
setlocal
set "BACKUP_DIR=C:\Users\minipc\kanban-backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
docker exec kanban-pg pg_dump -U kanban -Fc kanban > "%BACKUP_DIR%\kanban-%STAMP%.dump"
forfiles /p "%BACKUP_DIR%" /m kanban-*.dump /d -14 /c "cmd /c del @path" 2>nul
endlocal
