"use client";

import { useState } from "react";
import { Button } from "actify";

interface UrlSubmitFormProps {
  onSubmit?: () => void;
}

export function UrlSubmitForm({ onSubmit }: UrlSubmitFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/downloads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit URL");
        return;
      }

      // Clear form on success
      setUrl("");
      onSubmit?.();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to download..."
          className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          disabled={isSubmitting}
        />
        <Button
          variant="filled"
          type="submit"
          isDisabled={isSubmitting || !url.trim()}
          className="shrink-0 px-6 py-2.5 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-xl align-middle mr-1">
            download
          </span>
          {isSubmitting ? "Submitting..." : "Download"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
