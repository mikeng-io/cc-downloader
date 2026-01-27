import { NextResponse, NextRequest } from "next/server";
import { openApiDocument } from "@/lib/openapi";

// Get allowed origins from environment or use localhost for development
const getAllowedOrigins = () => {
  const allowed = [
    process.env.NEXTAUTH_URL,
    process.env.APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean) as string[];

  // Add production URL if available
  if (process.env.NODE_ENV === "production" && process.env.APP_URL) {
    allowed.push(process.env.APP_URL);
  }

  return allowed;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  // Only set origin if it's in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return NextResponse.json(openApiDocument, { headers });
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return new NextResponse(null, { status: 204, headers });
}
