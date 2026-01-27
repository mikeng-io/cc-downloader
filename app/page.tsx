import { UrlSubmitForm } from "@/components/url-submit-form";
import { StatsDashboard } from "@/components/stats-dashboard";
import { RecentDownloads } from "@/components/recent-downloads";

/**
 * Homepage
 *
 * Redesigned homepage with:
 * - URL submission form at top
 * - Stats dashboard showing real-time statistics
 * - Recent downloads widget with pagination
 *
 * All components include real-time updates via polling
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            CC-Downloader
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
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
        <RecentDownloads />
      </div>
    </main>
  );
}
