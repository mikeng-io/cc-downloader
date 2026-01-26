# CC-Downloader

Self-hosted Progressive Web Application for downloading media content from any URL.

## Features

- **Universal Downloading**: Download from direct URLs or 1000+ social media platforms (via yt-dlp)
- **Background Processing**: Non-blocking downloads with real-time progress tracking
- **PWA Support**: Install as a native app, works offline
- **Privacy-First**: Self-hosted, you control your data

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, BullMQ + Redis
- **Database**: PostgreSQL + Prisma
- **Storage**: MinIO (S3-compatible)
- **Media Extraction**: yt-dlp, gallery-dl

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd cc-downloader

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Visit http://localhost:3000
# Login with: admin@example.com / admin
```

### Manual Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ccdownloader"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-password"

# yt-dlp
YTDLP_PATH="/usr/local/bin/yt-dlp"
YTDLP_TIMEOUT=3600000        # 1 hour
YTDLP_MAX_FILE_SIZE=5368709120  # 5GB

# MinIO
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="downloads"
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Email/password login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current session

### Downloads
- `GET /api/downloads` - List user's downloads (paginated)
- `POST /api/downloads` - Submit new download URL
- `GET /api/downloads/:id` - Get download details
- `DELETE /api/downloads/:id` - Delete download and file
- `GET /api/downloads/:id/progress` - Get real-time progress
- `POST /api/downloads/:id/retry` - Retry failed download

## Architecture

```
Client (Next.js App) → API Routes → BullMQ Queue → Workers
                                    ↓
                            PostgreSQL + MinIO
```

## Security

- ✅ **execFile only** for subprocess execution (prevents command injection)
- ✅ Private IP blocking in URL validation
- ✅ File size limits (Images: 50MB, Videos: 5GB)
- ✅ Timeout enforcement (1 hour)
- ✅ Input sanitization with Zod

## Troubleshooting

### yt-dlp not working
- Ensure yt-dlp is installed: `yt-dlp --version`
- Check permissions: `ls -la $(which yt-dlp)`
- Update yt-dlp: `pip3 install --upgrade yt-dlp`

### Downloads stuck at "PENDING"
- Check Redis is running: `docker-compose ps redis`
- Check worker is processing: Check logs for errors
- Restart worker: `docker-compose restart app`

### MinIO connection errors
- Verify MinIO is running: `docker-compose ps minio`
- Check credentials in .env match MinIO config
- Visit MinIO console: http://localhost:9001

## Development

```bash
# Run development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Generate Prisma client
npx prisma generate

# Create database migration
npx prisma migrate dev --name <name>

# Reset database (dev only)
npx prisma migrate reset
```

## License

MIT

---

**Status**: Personal Project | **Timeline**: 4-6 weeks
