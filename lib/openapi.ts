import { createDocument } from "@scalar/zod-to-openapi";
import type { OpenAPIDocument } from "openapi-types";

// Zod schemas for API documentation
import { z } from "zod";

const DownloadTypeSchema = z.enum(["DIRECT", "YTDLP", "GALLERY_DL"]);
const DownloadStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
const MimeTypeSchema = z.enum([
  "VIDEO_MP4",
  "VIDEO_WEBM",
  "IMAGE_JPEG",
  "IMAGE_PNG",
  "IMAGE_GIF",
  "IMAGE_WEBP",
  "AUDIO_MP3",
  "AUDIO_M4A",
  "AUDIO_WAV",
  "UNKNOWN",
]);

// Request schemas
const SubmitUrlSchema = z.object({
  url: z.string().url(),
  priority: z.number().int().min(0).max(100).optional().default(0),
});

// Response schemas
const DownloadResponseSchema = z.object({
  id: z.string().cuid(),
  sourceUrl: z.string().url(),
  downloadType: DownloadTypeSchema,
  status: DownloadStatusSchema,
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: MimeTypeSchema.optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

const ProgressResponseSchema = z.object({
  downloadId: z.string().cuid(),
  status: DownloadStatusSchema,
  progress: z.object({
    bytesDownloaded: z.number(),
    totalBytes: z.number().nullable(),
    percentage: z.number().min(0).max(100),
    speed: z.number().nullable(),
    eta: z.number().nullable(),
  }).optional(),
  result: z.object({
    fileName: z.string(),
    fileSize: z.number().optional(),
    mimeType: MimeTypeSchema,
  }).optional(),
  error: z.object({
    type: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }).optional(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

// Create OpenAPI document
export const openApiDocument = createDocument({
  info: {
    title: "CC-Downloader API",
    description: "Self-hosted Progressive Web Application for downloading media content from any URL",
    version: "1.0.0",
    contact: {
      name: "CC-Downloader",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    { name: "Authentication", description: "User authentication endpoints" },
    { name: "Downloads", description: "Download management endpoints" },
    { name: "Progress", description: "Progress tracking endpoints" },
  ],
  paths: {
    "/api/downloads": {
      post: {
        tags: ["Downloads"],
        summary: "Submit a new download URL",
        description: "Creates a new download job and adds it to the processing queue",
        requestBody: {
          content: {
            "application/json": {
              schema: SubmitUrlSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Download created successfully",
            content: {
              "application/json": {
                schema: DownloadResponseSchema.partial({
                  id: true,
                  sourceUrl: true,
                  downloadType: true,
                  status: true,
                  createdAt: true,
                }),
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
        },
      },
      get: {
        tags: ["Downloads"],
        summary: "List user's downloads",
        description: "Returns paginated list of downloads for the authenticated user",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "number", default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "number", default: 20 },
            description: "Items per page",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] },
            description: "Filter by status",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["DIRECT", "YTDLP", "GALLERY_DL"] },
            description: "Filter by download type",
          },
        ],
        responses: {
          "200": {
            description: "List of downloads",
            content: {
              "application/json": {
                schema: z.object({
                  downloads: z.array(DownloadResponseSchema),
                  pagination: z.object({
                    page: z.number(),
                    limit: z.number(),
                    total: z.number(),
                    totalPages: z.number(),
                  }),
                }),
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
        },
      },
    },
    "/api/downloads/{id}": {
      delete: {
        tags: ["Downloads"],
        summary: "Delete a download",
        description: "Deletes a download and its associated file from storage",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Download ID",
          },
        ],
        responses: {
          "200": {
            description: "Download deleted successfully",
            content: {
              "application/json": {
                schema: z.object({ success: z.boolean() }),
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
          "404": {
            description: "Download not found",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
        },
      },
    },
    "/api/downloads/{id}/progress": {
      get: {
        tags: ["Progress"],
        summary: "Get download progress",
        description: "Returns real-time progress information for a download",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Download ID",
          },
        ],
        responses: {
          "200": {
            description: "Progress information",
            content: {
              "application/json": {
                schema: ProgressResponseSchema,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
          "404": {
            description: "Download not found",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
        },
      },
    },
    "/api/downloads/{id}/retry": {
      post: {
        tags: ["Downloads"],
        summary: "Retry a failed download",
        description: "Resets a failed download and re-queues it for processing",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Download ID",
          },
        ],
        responses: {
          "200": {
            description: "Download re-queued successfully",
            content: {
              "application/json": {
                schema: z.object({ success: z.boolean() }),
              },
            },
          },
          "400": {
            description: "Cannot retry this download",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: ErrorResponseSchema,
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
} satisfies OpenAPIDocument;

export type OpenApiSpec = typeof openApiDocument;
