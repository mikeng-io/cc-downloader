# Deployment Guide

This guide covers deployment, migration, and backup/rollback procedures for CC-Downloader.

## Initial Deployment

### Prerequisites

- Docker and Docker Compose installed
- At least 10GB of free disk space for storage
- Ports 3000, 9100, 9101 available (or configure alternatives)

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd cc-downloader

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start services
docker compose build
docker compose up -d

# Run database migrations (from host)
npx prisma migrate deploy

# Create admin user (on first login)
# Visit http://localhost:3000 and register
```

### Services

- **Web UI**: http://localhost:3000
- **MinIO Console**: http://localhost:9101 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Migration from Existing Deployment

### Backup Before Migration

```bash
# Stop services
docker compose down

# Backup database
docker compose run -T postgres pg_dump -U postgres ccdownloader > db-backup-$(date +%Y%m%d).sql

# Backup MinIO data (mounted volume)
docker run --rm -v cc-downloader_miniodata:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Migration Steps

1. **Pull new code**
   ```bash
   git pull origin main
   ```

2. **Update environment variables**
   ```bash
   # Add new variables if needed
   echo "DEFAULT_STORAGE_LIMIT=10737418240" >> .env
   ```

3. **Build new images**
   ```bash
   docker compose build
   ```

4. **Run database migrations**
   ```bash
   docker compose up -d postgres
   npx prisma migrate deploy
   ```

5. **Start all services**
   ```bash
   docker compose up -d
   ```

6. **Verify deployment**
   ```bash
   # Check all services are healthy
   docker compose ps

   # Check logs
   docker compose logs -f web
   docker compose logs -f worker
   ```

### Post-Migration Tasks

- Verify existing downloads are accessible
- Test creating a new download
- Check quota display if using UserQuota feature
- Recalculate quota if needed:
  ```bash
  docker compose exec web npm run recalc-quota
  ```

## Backup Strategy

### Database Backups

**Automated Daily Backup** (add to crontab):
```bash
0 2 * * * cd /path/to/cc-downloader && docker compose run -T postgres pg_dump -U postgres ccdownloader | gzip > backups/db-$(date +\%Y\%m\%d).sql.gz
```

**Manual Backup:**
```bash
# Single backup
docker compose run -T postgres pg_dump -U postgres ccdownloader > db-backup.sql

# With compression
docker compose run -T postgres pg_dump -U postgres ccdownloader | gzip > db-backup.sql.gz
```

### Restore Database

```bash
# Stop web and worker to prevent concurrent writes
docker compose stop web worker

# Restore from backup
docker compose run -T postgres psql -U postgres ccdownloader < db-backup.sql

# Or from compressed backup
gunzip -c db-backup.sql.gz | docker compose run -T postgres psql -U postgres ccdownloader

# Restart services
docker compose start web worker
```

### File Storage Backups

MinIO data is stored in a Docker volume. Back up using:

```bash
# Backup volume
docker run --rm -v cc-downloader_miniodata:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v cc-downloader_miniodata:/data -v $(pwd):/backup alpine tar xzf /backup/minio-backup.tar.gz -C /data
```

### Configuration Backups

```bash
# Backup environment and volumes config
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup
```

## Rollback Procedure

### Quick Rollback (Code Only)

If the new deployment has issues but data is intact:

```bash
# Revert code
git checkout <previous-commit-tag>

# Rebuild and restart
docker compose build
docker compose up -d
```

### Full Rollback (Code + Data)

1. **Stop services**
   ```bash
   docker compose down
   ```

2. **Restore database**
   ```bash
   docker compose up -d postgres
   docker compose run -T postgres psql -U postgres ccdownloader < db-backup.sql
   ```

3. **Restore file storage**
   ```bash
   docker run --rm -v cc-downloader_miniodata:/data -v $(pwd):/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/minio-backup.tar.gz -C /data"
   ```

4. **Revert code and rebuild**
   ```bash
   git checkout <previous-commit-tag>
   docker compose build
   ```

5. **Start services**
   ```bash
   docker compose up -d
   ```

### Rollback Verification

```bash
# Check all services started
docker compose ps

# Check logs for errors
docker compose logs --tail=100

# Test basic functionality
curl -s http://localhost:3000 | grep -q "CC-Downloader"
```

## Monitoring

### Health Checks

```bash
# Check all services
docker compose ps

# Service-specific checks
docker compose exec web wget -qO- http://localhost:3000/api/health || echo "Web unhealthy"
docker compose exec redis redis-cli ping
docker compose exec postgres pg_isready -U postgres
```

### Log Monitoring

```bash
# Follow all logs
docker compose logs -f

# Specific service logs
docker compose logs -f web worker

# Last 100 lines
docker compose logs --tail=100
```

### Disk Space

```bash
# Check Docker disk usage
docker system df

# Check volume sizes
docker volume ls
docker volume inspect cc-downloader_miniodata
```

## Troubleshooting

### Services Not Starting

```bash
# Check port conflicts
netstat -tuln | grep -E '3000|5432|6379|9000'

# Check logs
docker compose logs <service-name>

# Restart specific service
docker compose restart <service-name>
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker compose exec postgres pg_isready -U postgres

# Check database exists
docker compose exec postgres psql -U postgres -l

# Reset connection
docker compose restart web worker
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker compose logs worker

# Verify Redis connection
docker compose exec redis redis-cli ping

# Check for jobs in queue
docker compose exec redis redis-cli keys "bull:*"
```

### Out of Disk Space

```bash
# Clean Docker build cache
docker system prune -a

# Clean old backups (keep last 5)
ls -t backups/*.sql.gz | tail -n +6 | xargs rm -f
```

## Security Notes

- Change default passwords in production (MINIO_ROOT_PASSWORD, ADMIN_PASSWORD)
- Use strong NEXTAUTH_SECRET (generate with `openssl rand -base64 32`)
- Configure HTTPS/TLS reverse proxy (nginx, traefik) for production
- Restrict MinIO and PostgreSQL ports from external access
- Regular security updates: `docker compose pull && docker compose up -d`
