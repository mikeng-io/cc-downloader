import { UrlSubmitForm } from "@/components/url-submit-form";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">CC-Downloader</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Self-hosted Progressive Web Application for downloading media content
          </p>
        </div>

        <div className="mb-12">
          <UrlSubmitForm />
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold">Recent Downloads</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No downloads yet. Submit a URL above to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
