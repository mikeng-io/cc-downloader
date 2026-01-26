# CC-Downloader - Technical Specification

> **Version:** 1.0.0
> **Status:** Personal Project
> **Last Updated:** 2025-01-26
> **Timeline:** 4-6 weeks (evenings/weekends)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Technical Stack](#3-technical-stack)
4. [System Architecture](#4-system-architecture)
5. [Data Models](#5-data-models)
6. [API Design](#6-api-design)
7. [Download Flows](#7-download-flows)
8. [PWA Capabilities](#8-pwa-capabilities)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Security Considerations](#10-security-considerations)
11. [Development Phases](#11-development-phases)
12. [Open Questions](#12-open-questions)

---

## 1. Project Overview

### 1.1 Vision

A self-hosted Progressive Web Application (PWA) that allows users to download media content (images, videos, audio) from any URL. The system handles both direct file downloads and yt-dlp-based extractions from social media platforms.

### 1.2 Core Value Proposition

- **Universal Downloading:** One interface for any media source
- **Intelligent Extraction:** yt-dlp handles complex sources automatically (1000+ sites)
- **Privacy-First:** Self-hosted, user controls their data
- **Progressive:** Works offline, installable on any device
- **Background Processing:** Non-blocking downloads with progress tracking

### 1.3 Target Users

- Personal use for archiving media from various platforms
- Content creators backing up their own media
- Individuals collecting content for offline viewing

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

| Requirement | Description | Priority |
|-------------|-------------|----------|
| User Login | Email/password authentication | P0 |
| Session Management | Secure session handling with timeout | P0 |
| Logout | Clean session termination | P0 |

### 2.2 URL Submission

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Submit Any URL | Accept any valid URL input | P0 |
| URL Validation | Validate and sanitize input | P0 |
| Source Type Detection | Auto-detect direct vs. yt-dlp download | P0 |
| Private IP Blocking | Block internal/private IPs | P0 |

### 2.3 Download Management

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Direct Downloads | Stream files directly from URL | P0 |
| Progress Tracking | Polling-based download progress | P0 |
| Pause/Resume | Control active downloads | P2 |
| Retry Failed Downloads | Automatic retry with backoff | P1 |

### 2.4 yt-dlp Extraction

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Platform Detection | Identify Instagram, TikTok, etc. | P0 |
| yt-dlp Execution | Safe subprocess execution | P0 |
| Fallback Handling | gallery-dl as fallback | P1 |
| Metadata Capture | Extract captions, timestamps, etc. | P1 |

### 2.5 Media Management

| Requirement | Description | Priority |
|-------------|-------------|----------|
| List View | Tabular view of all downloads | P0 |
| Grid View | Thumbnail gallery for visual media | P0 |
| Search & Filter | Find downloads by criteria | P1 |
| Sort Options | Sort by date, size, name, type | P1 |
| File Operations | Download, delete files | P1 |
| Storage Quota | Track usage per user (10GB default) | P2 |

### 2.6 PWA Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Offline Access | View download history offline | P1 |
| Install Prompt | Install as native app | P1 |
| Background Sync | Queue submissions when offline | P2 |

---

## 3. Technical Stack

### 3.1 Frontend

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Framework | Next.js | 15.x | Latest App Router, Server Components |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Rapid UI development |
| State | Zustand | 5.x | Lightweight state management |
| PWA | Serwist | Latest | Next.js 15 compatible PWA |

### 3.2 Backend

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| API | Next.js API Routes | 15.x | Integrated with frontend |
| Auth | Auth.js (NextAuth) | 5.x | Mature, self-hosted |
| ORM | Prisma | 6.x | Type-safe database access |
| Queue | BullMQ | 5.x | Redis-backed job queue |
| Validation | Zod | Latest | Runtime type validation |

### 3.3 Media Extraction

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Media Downloader | yt-dlp | Latest | Supports 1000+ sites |
| Fallback Extractor | gallery-dl | Latest | Additional site support |

### 3.4 Data Layer

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Database | PostgreSQL | 17.x | JSONB for metadata |
| Cache | Redis | 7.x | Queue backend |
| Storage | MinIO | Latest | S3-compatible, self-hosted |

### 3.5 Infrastructure

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Containerization | Docker | 27.x | Consistent deployment |
| Orchestration | docker-compose | 2.x | Simple multi-container |
| Process Manager | PM2 | Latest | Production process management |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  Next.js App   │  │   Service      │  │   IndexedDB    │            │
│  │  (React SPA)   │  │   Worker       │  │   (Offline)    │            │
│  │  - Polling     │  │   (PWA)        │  │                │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ HTTPS (Polling every 2-5s)
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                         API GATEWAY LAYER                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  Auth.js v5    │  │  API Routes    │  │  BullMQ        │            │
│  │  (NextAuth)    │  │  (Next.js)     │  │  Producer      │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ Redis (BullMQ)
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                        WORKER LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Download Workers                               │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌───────────────┐   │   │
│  │   │  Direct HTTP   │  │   yt-dlp       │  │  gallery-dl    │   │   │
│  │   │  Download      │  │   (1000+       │  │  (Fallback)    │   │   │
│  │   │  Worker        │  │    sites)      │  │                │   │   │
│  │   └────────────────┘  └────────────────┘  └───────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                          DATA LAYER                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  PostgreSQL    │  │  Redis         │  │  MinIO (S3)    │            │
│  │  (Metadata)    │  │  (Queue/Cache) │  │  (Media Files) │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Container Architecture

#### Development (Docker Compose)

```yaml
services:
  api:              # Next.js API server + embedded worker
    image: cc-downloader:latest
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://postgres:devpassword@postgres:5432/ccdownloader
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - MINIO_BUCKET=downloads
      - WORKER_MODE=embedded
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:17-alpine
    environment:
      - POSTGRES_PASSWORD=devpassword
      - POSTGRES_DB=ccdownloader
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  minio:            # S3-compatible storage
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

## 5. Data Models

### 5.1 Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER & AUTH
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  password      String?   // Hashed password for credentials auth

  accounts      Account[]
  sessions      Session[]
  downloads     Download[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================================================
// DOWNLOADS
// ============================================================================

enum DownloadType {
  DIRECT
  YTDLP
  GALLERY_DL
}

enum DownloadStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum MimeType {
  IMAGE_JPEG
  IMAGE_PNG
  IMAGE_GIF
  IMAGE_WEBP
  VIDEO_MP4
  VIDEO_WEBM
  AUDIO_MP3
  AUDIO_WAV
  AUDIO_M4A
  UNKNOWN
}

model Download {
  id            String        @id @default(cuid())
  userId        String

  // Source information
  sourceUrl     String        @db.Text
  downloadType  DownloadType
  title         String?
  description   String?       @db.Text

  // Download management
  status        DownloadStatus @default(PENDING)
  priority      Int           @default(0)

  // File information
  fileName      String?
  fileSize      BigInt?
  mimeType      MimeType      @default(UNKNOWN)

  // Storage
  storagePath   String?       @db.Text

  // Agent-specific metadata (flexible)
  metadata      Json?

  // Error handling
  errorMessage  String?       @db.Text
  retryCount    Int           @default(0)
  maxRetries    Int           @default(3)

  // Progress tracking
  progress      Progress?

  // Timestamps
  createdAt     DateTime      @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  expiresAt     DateTime?     // For temporary storage

  // Relations
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@index([downloadType])
  @@map("downloads")
}

model Progress {
  id              String   @id @default(cuid())
  downloadId      String   @unique

  bytesDownloaded BigInt   @default(0)
  totalBytes      BigInt?
  percentage      Int      @default(0)
  speed           BigInt?  // Bytes per second
  eta             Int?     // Seconds remaining

  updatedAt       DateTime @updatedAt

  download        Download @relation(fields: [downloadId], references: [id], onDelete: Cascade)

  @@map("progress")
}

// ============================================================================
// STORAGE QUOTA
// ============================================================================

model UserQuota {
  id              String   @id @default(cuid())
  userId          String   @unique

  totalStorage    BigInt   @default(0)      // Bytes used
  storageLimit    BigInt   @default(10737418240)  // 10GB default
  fileCount       Int      @default(0)

  lastRecalculated DateTime @default(now())

  @@map("user_quotas")
}
```

### 5.2 JSONB Metadata Schema

```typescript
interface DownloadMetadata {
  // Source platform
  platform?: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'vimeo' | 'facebook' | 'unknown';
  extractor?: 'yt-dlp' | 'gallery-dl' | 'direct';

  // Content details
  contentType?: 'post' | 'story' | 'reel' | 'tweet' | 'video' | 'image' | 'gallery';
  author?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };

  // Timestamps
  publishedAt?: string; // ISO 8601
  scrapedAt?: string;   // ISO 8601

  // Media specifics
  media?: {
    type: 'image' | 'video' | 'audio' | 'gallery';
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string;
    format?: string;
    quality?: string;
  };

  // yt-dlp specific info
  ytDlpInfo?: {
    extractorKey: string;
    webpageUrl: string;
    originalUrl: string;
    fulltitle?: string;
    description?: string;
    tags?: string[];
    likeCount?: number;
    viewCount?: number;
  };

  // Download execution details
  downloadExecution?: {
    extractor: 'yt-dlp' | 'gallery-dl' | 'direct';
    version: string;
    duration: number;
    attempts: number;
  };
}
```

---

## 6. API Design

### 6.1 REST API Endpoints

#### Authentication

```
POST   /api/auth/signin    - Email/password login
POST   /api/auth/signout   - Logout
GET    /api/auth/session   - Get current session
```

#### Downloads

```
GET    /api/downloads              - List user's downloads (paginated)
POST   /api/downloads              - Submit new download URL
GET    /api/downloads/:id          - Get download details
DELETE /api/downloads/:id          - Delete download and file
GET    /api/downloads/:id/progress - Get real-time progress
POST   /api/downloads/:id/retry    - Retry failed download
```

#### Files

```
GET    /api/files/:id    - Stream/download file
HEAD   /api/files/:id    - Get file metadata
```

#### User

```
GET    /api/user/profile  - Get user profile
GET    /api/user/quota    - Get storage usage
```

### 6.2 Progress Polling

```typescript
// Client polls this endpoint every 2-5 seconds
interface ProgressResponse {
  downloadId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: {
    bytesDownloaded: number;
    totalBytes: number;
    percentage: number;
    speed: number;
    eta: number;
  };
  result?: {
    fileName: string;
    fileSize: number;
    storageKey: string;
    downloadUrl: string;
    thumbnailUrl?: string;
  };
  error?: {
    type: string;
    message: string;
    retryable: boolean;
  };
  updatedAt: string;
}
```

### 6.3 Request/Response Examples

#### Submit Download URL

```typescript
// POST /api/downloads
interface SubmitDownloadRequest {
  url: string;
  priority?: number;
}

interface SubmitDownloadResponse {
  id: string;
  sourceUrl: string;
  downloadType: 'DIRECT' | 'YTDLP' | 'GALLERY_DL';
  status: 'PENDING' | 'PROCESSING';
  estimatedTime?: number;
}
```

---

## 7. Download Flows

### 7.1 Direct Download Flow

```
User ────────> API ────────> Worker ────────> Source URL
 │              │              │               │
 │ POST URL     │ Create Job   │ Stream File    │ Return File
 │              │              │               │
 │<──── Job ID ──│<──── Progress ─│<─── Data + Prog ─│
 │              │              │               │
 │ Start Polling│              │               │
 │<──── Progress─┘              │               │
 │                             │               │
 │<────── Completed────────────┘               │
```

### 7.2 yt-dlp Download Flow

```
User ───> API ───> Worker ───> yt-dlp ───> Media Source
 │         │         │          │            │
 │POST URL │ Detect  │ Execute  │ Extract     │
 │         │ Type    │ yt-dlp   │ Media       │
 │         │         │          │ + Metadata  │
 │<─ Job ID│         │          │            │
 │         │         │          │ Download    │
 │<────────Progress─────────────────│            │
 │         │         │          │ Upload to   │
 │         │         │          │ MinIO       │
 │         │         │          │            │
 │<──────────────Completed────────────────────│
```

---

## 8. PWA Capabilities

### 8.1 Service Worker Features

| Feature | Implementation | Priority |
|---------|----------------|----------|
| Asset Caching | Cache static assets on install | P0 |
| Offline Fallback | Show cached downloads offline | P1 |
| Background Sync | Queue URL submissions when offline | P2 |
| Install Prompt | Show install prompt | P1 |

### 8.2 Offline Strategy

```typescript
const cacheStrategies = {
  // Static assets: Cache First
  '/_next/static/*': 'CacheFirst',
  '/assets/*': 'CacheFirst',

  // API: Network First
  '/api/downloads': 'NetworkFirst',
  '/api/auth/session': 'NetworkFirst',

  // Downloads list: Stale While Revalidate
  '/api/downloads?page=*': 'StaleWhileRevalidate',
};
```

---

## 9. Infrastructure & Deployment

### 9.1 Docker Image

```dockerfile
FROM node:22-alpine AS base

# Install system dependencies and yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    openssl \
    curl \
    && rm -rf /var/cache/apk/*

# Install yt-dlp and gallery-dl
RUN pip3 install --no-cache-dir \
    yt-dlp \
    gallery-dl

# Verify installations
RUN yt-dlp --version
RUN gallery-dl --version

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### 9.2 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ccdownloader"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ADMIN_EMAIL="your@email.com"
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

---

## 10. Security Considerations

> **Note:** This is designed for a **private side project**. Enterprise-grade security has been simplified.

### 10.1 Essential Security (Private Project)

#### 1. Command Injection Prevention (CRITICAL)

```typescript
// ❌ NEVER DO THIS
import { exec } from 'child_process';
exec(`yt-dlp "${url}" -o "${output}"`);

// ✅ CORRECT
import { execFile } from 'child_process';
await execFile('yt-dlp', [url, '-o', outputPath], {
  timeout: 3600000,
  maxBuffer: 10 * 1024 * 1024
});
```

#### 2. Basic Authentication

Simple hardcoded single user for personal use.

#### 3. File Size Limits

- Images: 50MB
- Videos: 5GB
- Audio: 500MB
- Other: 100MB

#### 4. Basic Timeout

- Small files: 1 minute
- Medium files: 5 minutes
- Large files: 1 hour

### 10.2 What You Can Skip

For personal projects, skip:
- ❌ Terms of Service / DMCA compliance
- ❌ GDPR / data privacy compliance
- ❌ Complex rate limiting
- ❌ Audit logging
- ❌ Penetration testing
- ❌ Production hardening

---

## 11. Development Phases

> **Timeline:** 4-6 weeks for personal project (evenings/weekends)

### Week 1: Foundation

- [x] Project setup (Next.js 15, TypeScript, Tailwind)
- [ ] Database schema and Prisma setup
- [ ] Auth.js v5 configuration
- [ ] Basic UI layout
- [ ] Docker development environment

### Week 2: Direct Downloads

- [ ] URL submission endpoint
- [ ] BullMQ worker setup
- [ ] Direct download implementation
- [ ] Progress tracking (polling)
- [ ] Downloads list view

### Week 3: Storage & UI

- [ ] MinIO integration
- [ ] Grid view for downloads
- [ ] File serving
- [ ] Search and filter
- [ ] Delete functionality

### Week 4: yt-dlp Integration

- [ ] yt-dlp installation in Docker
- [ ] Subprocess execution (execFile only)
- [ ] Platform detection
- [ ] Metadata extraction
- [ ] Error handling

### Week 5: PWA Features

- [ ] Serwist setup
- [ ] Service worker
- [ ] Asset caching
- [ ] Offline download list
- [ ] Install prompt

### Week 6: Polish

- [ ] Bug fixes
- [ ] Error messages
- [ ] Loading states
- [ ] Documentation

---

## 12. Open Questions

### 12.1 Personal Project - All Resolved ✅

| Question | Decision |
|----------|----------|
| Email provider | Skip (single user hardcoded) |
| Storage limits | Use disk space, monitor manually |
| Auto-deletion | Manual is fine |
| CDN | Not needed for local use |
| Platform priority | yt-dlp covers 1000+ sites |

### 12.2 Technical Decisions - RESOLVED

✅ **Media Extraction:** yt-dlp + gallery-dl
✅ **Storage:** MinIO locally
✅ **Database:** PostgreSQL locally
✅ **Queue:** BullMQ + Redis
✅ **Progress:** HTTP polling
✅ **Auth:** Single hardcoded user

---

## Appendix: Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: ccdownloader
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

**Document Status:** Personal Project Ready | **Last Updated:** 2025-01-26

> This specification is designed for a private side project. All enterprise-grade security, legal compliance, and production deployment concerns have been removed or simplified.
