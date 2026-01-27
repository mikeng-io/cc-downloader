# CC-Downloader

Self-hosted Progressive Web Application for downloading media content from any URL.

## Features

- **Universal Downloading**: Download from direct URLs or 1000+ social media platforms (via yt-dlp)
- **Universal Media Viewer**: View videos, audio, images, PDFs, and text files directly in the browser
- **Storage Quota**: Track your storage usage with visual quota display
- **Frontend Pagination**: Efficiently browse large download collections with paginated views
- **Background Processing**: Non-blocking downloads with real-time progress tracking
- **Material 3 Design**: Modern UI following Google's Material Design 3 principles
- **PWA Support**: Install as a native app, works offline
- **Privacy-First**: Self-hosted, you control your data

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Actify (Material 3 components)
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

# Storage Quota (optional, default: 10GB)
DEFAULT_STORAGE_LIMIT=10737418240  # 10GB in bytes
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
- `GET /api/downloads/:id/content` - Stream/download file content

### User
- `GET /api/user/quota` - Get user storage quota and usage

### Pages
- `/` - Submit new download URL
- `/downloads` - Browse downloads with pagination
- `/view/[id]` - Universal media viewer
- `/watch/[id]` - Legacy video player

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

## Material 3 Design with Actify

This project uses [Actify](https://actifyjs.com/), a React Material Design 3 component library. Key components used:

- **Card** - Elevated cards with state layers and elevation
- **Button** - Filled, outlined, and text button variants
- **TextField** - Material-styled input fields with floating labels
- **LinearProgress** - Progress bars with indeterminate state
- **Pagination** - Material-style pagination controls
- **Dialog** - Modal dialogs for confirmations

### Material Symbols

The project uses Google's Material Symbols Outlined font for icons:

```tsx
import "app/globals.css"; // Includes Material Symbols

<span className="material-symbols-outlined">icon_name</span>
```

Common icons used:
- `download`, `play_circle`, `music_note`, `image`, `picture_as_pdf`
- `delete`, `refresh`, `visibility`, `video_library`
- `storage`, `check_circle`, `error`, `pending`

## Storage Quota Management

The application tracks storage usage per user with a configurable limit (default: 10GB).

### For Single-User Setup

The quota is initialized automatically on the first download. To check or modify quota:

```bash
# Check current quota (via psql)
docker-compose exec db psql -U postgres -d ccdownloader -c "SELECT * FROM \"UserQuota\";"

# Reset quota
docker-compose exec db psql -U postgres -d ccdownloader -c "UPDATE \"UserQuota\" SET \"totalStorage\" = 0;"

# Set custom limit (in bytes)
docker-compose exec db psql -U postgres -d ccdownloader -c "UPDATE \"UserQuota\" SET \"storageLimit\" = 21474836480 WHERE \"userId\" = 'YOUR_USER_ID';"
```

### Recalculate Quota

If quota gets out of sync, recalculate from actual files:

```bash
docker-compose exec app npm run recalc-quota
```

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
