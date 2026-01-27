// Simple OpenAPI document for CC-Downloader API
import { z } from "zod";

// Basic OpenAPI schema
export const openApiDocument = {
  openapi: "3.0.0",
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
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

export type OpenApiSpec = typeof openApiDocument;
