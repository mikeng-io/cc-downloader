"use client";

import { useState } from "react";
import { Button, TextField } from "actify";
import { motion } from "framer-motion";

interface UrlSubmitFormProps {
  onSubmit?: () => void;
}

export function UrlSubmitForm({ onSubmit }: UrlSubmitFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

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

      // Show success animation
      setSuccess(true);

      // Clear form after animation
      setTimeout(() => {
        setUrl("");
        setSuccess(false);
        onSubmit?.();
      }, 1000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <TextField
            type="url"
            value={url}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
            label="Enter URL to download..."
            variant="outlined"
            disabled={isSubmitting}
            error={!!error}
            className="w-full"
          />
        </div>

        <motion.div
          whileTap={{ scale: 0.98 }}
          className="shrink-0"
        >
          <Button
            variant="filled"
            type="submit"
            isDisabled={isSubmitting || !url.trim()}
            className="px-6 py-3 whitespace-nowrap"
          >
            {success ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="material-symbols-outlined text-xl align-middle"
              >
                check_circle
              </motion.span>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl align-middle mr-1">
                  {isSubmitting ? "sync" : "download"}
                </span>
                {isSubmitting ? "Submitting..." : "Download"}
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </form>
  );
}
