import { Suspense } from "react";
import { UrlSubmitForm } from "@/components/url-submit-form";
import { StatsDashboard } from "@/components/stats-dashboard";
import { RecentDownloads } from "@/components/recent-downloads";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-on-surface">Downloader</h1>
          <p className="mt-2 text-lg text-on-surface-variant">
            Self-hosted Progressive Web Application for downloading media content
          </p>
        </div>

        {/* URL Submit Form */}
        <div className="mx-auto max-w-4xl">
          <UrlSubmitForm />
        </div>

        {/* Stats Dashboard */}
        <StatsDashboard />

        {/* Recent Downloads */}
        <Suspense fallback={<div className="text-center text-on-surface-variant">Loading...</div>}>
          <RecentDownloads />
        </Suspense>
      </div>
    </main>
  );
}
