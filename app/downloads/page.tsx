import { Suspense } from "react";
import { DownloadsContent } from "./downloads-content";

export default function DownloadsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950"><div className="mx-auto max-w-6xl"><p className="text-center text-gray-500 dark:text-gray-400">Loading...</p></div></div>}>
      <DownloadsContent />
    </Suspense>
  );
}
