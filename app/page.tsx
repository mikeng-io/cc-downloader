import { UrlSubmitForm } from "@/components/url-submit-form";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            CC-Downloader
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Self-hosted Progressive Web Application for downloading media content
          </p>
        </div>

        <div className="mb-12">
          <UrlSubmitForm />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Recent Downloads
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No downloads yet. Submit a URL above to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
