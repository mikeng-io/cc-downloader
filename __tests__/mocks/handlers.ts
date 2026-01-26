import { http, HttpResponse } from "msw";

// Mock download data
export const mockDownload = {
  id: "test-download-id",
  sourceUrl: "https://example.com/video.mp4",
  downloadType: "DIRECT",
  status: "COMPLETED",
  fileName: "video.mp4",
  fileSize: 104857600,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

export const mockProgress = {
  downloadId: "test-download-id",
  bytesDownloaded: 104857600,
  totalBytes: 104857600,
  percentage: 100,
  speed: null,
  eta: null,
};

// MSW handlers for API endpoints
export const handlers = [
  // POST /api/downloads - Create new download
  http.post("/api/downloads", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: mockDownload.id,
        sourceUrl: body.url,
        downloadType: "DIRECT",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // GET /api/downloads - List downloads
  http.get("/api/downloads", () => {
    return HttpResponse.json({
      downloads: [mockDownload],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  }),

  // GET /api/downloads/:id/progress - Get progress
  http.get("/api/downloads/:id/progress", ({ params }) => {
    return HttpResponse.json({
      downloadId: params.id,
      status: "COMPLETED",
      progress: mockProgress,
      result: {
        fileName: mockDownload.fileName,
        fileSize: mockDownload.fileSize,
        mimeType: "VIDEO_MP4",
      },
    });
  }),

  // DELETE /api/downloads/:id - Delete download
  http.delete("/api/downloads/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  // POST /api/downloads/:id/retry - Retry failed download
  http.post("/api/downloads/:id/retry", () => {
    return HttpResponse.json({ success: true });
  }),

  // GET /api/auth/session - Get session
  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      user: {
        id: "test-user-id",
        email: "admin@example.com",
        name: "Admin",
      },
      expires: new Date(Date.now() + 3600000).toISOString(),
    });
  }),
];

// Test-specific handlers
export const errorHandlers = {
  // Invalid URL error
  invalidUrl: http.post("/api/downloads", () => {
    return HttpResponse.json(
      { error: "Invalid URL format" },
      { status: 400 }
    );
  }),

  // Private IP error
  privateIp: http.post("/api/downloads", () => {
    return HttpResponse.json(
      { error: "Private IP addresses are not allowed" },
      { status: 400 }
    );
  }),

  // Unauthorized error
  unauthorized: http.get("/api/downloads", () => {
    return HttpResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }),

  // Not found error
  notFound: http.get("/api/downloads/:id", () => {
    return HttpResponse.json(
      { error: "Download not found" },
      { status: 404 }
    );
  }),
};
