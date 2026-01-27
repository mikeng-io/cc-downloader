"use client";

import { useEffect, useState } from "react";

export default function ApiDocsPage() {
  const [Scalar, setScalar] = useState(null);

  useEffect(() => {
    // Dynamically import Scalar to avoid SSR issues
    import("@scalar/api-reference")
      .then((mod: any) => {
        setScalar(mod.default || mod.ApiReference || mod);
      })
      .catch((err) => {
        console.error("Failed to load Scalar:", err);
      });
  }, []);

  if (!Scalar) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      {
        // @ts-ignore - Scalar is loaded dynamically
        <Scalar
          spec={{
            url: "/api/docs",
          }}
          layout="modern"
          theme="default"
        />
      }
    </div>
  );
}
