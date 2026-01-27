import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/progress-bar";
import type { DownloadProgress } from "@/lib/hooks/use-download-progress";

describe("ProgressBar", () => {
  const createMockProgress = (overrides?: Partial<DownloadProgress>): DownloadProgress => ({
    status: "PROCESSING",
    progress: {
      percentage: 50,
      bytesDownloaded: 5000000,
      totalBytes: 10000000,
      speed: 500000,
      eta: 10,
    },
    result: null,
    error: null,
    ...overrides,
  });

  it("renders progress bar with percentage", () => {
    const progress = createMockProgress();
    render(<ProgressBar progress={progress} />);

    expect(screen.getByText("processing")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("displays bytes downloaded and total", () => {
    const progress = createMockProgress();
    render(<ProgressBar progress={progress} />);

    expect(screen.getByText(/4.77 MB \/ 9.54 MB/)).toBeInTheDocument();
  });

  it("displays download speed", () => {
    const progress = createMockProgress();
    render(<ProgressBar progress={progress} />);

    expect(screen.getByText(/488.28 KB\/s/)).toBeInTheDocument();
  });

  it("displays estimated time remaining", () => {
    const progress = createMockProgress();
    render(<ProgressBar progress={progress} />);

    expect(screen.getByText("10s left")).toBeInTheDocument();
  });

  it("displays error message when present", () => {
    const progress = createMockProgress({
      status: "FAILED",
      error: { message: "Download failed due to network error" },
    });
    render(<ProgressBar progress={progress} />);

    expect(screen.getByText("Download failed due to network error")).toBeInTheDocument();
  });

  it("renders completed status with green gradient", () => {
    const progress = createMockProgress({
      status: "COMPLETED",
      progress: {
        percentage: 100,
        bytesDownloaded: 10000000,
        totalBytes: 10000000,
        speed: null,
        eta: null,
      },
    });

    const { container } = render(<ProgressBar progress={progress} />);

    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(container.querySelector(".from-green-500")).toBeInTheDocument();
  });

  it("renders failed status with red gradient", () => {
    const progress = createMockProgress({
      status: "FAILED",
      progress: {
        percentage: 25,
        bytesDownloaded: 2500000,
        totalBytes: 10000000,
        speed: null,
        eta: null,
      },
    });

    const { container } = render(<ProgressBar progress={progress} />);

    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(container.querySelector(".from-red-500")).toBeInTheDocument();
  });

  it("renders pending status with indeterminate animation", () => {
    const progress = createMockProgress({
      status: "PENDING",
      progress: {
        percentage: 0,
        bytesDownloaded: 0,
        totalBytes: null,
        speed: null,
        eta: null,
      },
    });

    render(<ProgressBar progress={progress} />);

    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("applies color zones based on percentage", () => {
    const { container, rerender } = render(
      <ProgressBar progress={createMockProgress({ progress: { percentage: 25, bytesDownloaded: 2500000, totalBytes: 10000000, speed: 500000, eta: 15 } })} />
    );

    // 0-33%: Blue gradient
    expect(container.querySelector(".from-blue-500")).toBeInTheDocument();

    // 33-66%: Yellow gradient
    rerender(
      <ProgressBar progress={createMockProgress({ progress: { percentage: 50, bytesDownloaded: 5000000, totalBytes: 10000000, speed: 500000, eta: 10 } })} />
    );
    expect(container.querySelector(".from-yellow-500")).toBeInTheDocument();

    // 66-100%: Green gradient
    rerender(
      <ProgressBar progress={createMockProgress({ progress: { percentage: 75, bytesDownloaded: 7500000, totalBytes: 10000000, speed: 500000, eta: 5 } })} />
    );
    expect(container.querySelector(".from-green-500")).toBeInTheDocument();
  });

  it("formats ETA correctly for different durations", () => {
    const { rerender } = render(
      <ProgressBar progress={createMockProgress({ progress: { percentage: 50, bytesDownloaded: 5000000, totalBytes: 10000000, speed: 500000, eta: 45 } })} />
    );

    expect(screen.getByText("45s left")).toBeInTheDocument();

    rerender(
      <ProgressBar progress={createMockProgress({ progress: { percentage: 50, bytesDownloaded: 5000000, totalBytes: 10000000, speed: 500000, eta: 120 } })} />
    );

    expect(screen.getByText("2m left")).toBeInTheDocument();

    rerender(
      <ProgressBar progress={createMockProgress({ progress: { percentage: 50, bytesDownloaded: 5000000, totalBytes: 10000000, speed: 500000, eta: 3700 } })} />
    );

    expect(screen.getByText("2h left")).toBeInTheDocument();
  });
});
