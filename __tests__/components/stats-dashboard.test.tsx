import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StatsDashboard } from "@/components/stats-dashboard";

// Mock the useStats hook
vi.mock("@/lib/hooks/use-stats", () => ({
  useStats: vi.fn(),
}));

// Mock the StatsCard component
vi.mock("@/components/stats-card", () => ({
  StatsCard: ({ label, value }: any) => (
    <div data-testid="stats-card">
      {label}: {value}
    </div>
  ),
}));

// Mock the StorageQuotaDisplay component
vi.mock("@/components/storage-quota-display", () => ({
  StorageQuotaDisplay: () => <div data-testid="storage-quota">Storage</div>,
}));

import { useStats } from "@/lib/hooks/use-stats";

describe("StatsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(useStats).mockReturnValue({
      stats: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<StatsDashboard />);

    // Should render 4 StatsCard components with loading state
    const cards = screen.getAllByTestId("stats-card");
    expect(cards).toHaveLength(4);
  });

  it("renders stats cards with data", async () => {
    const mockStats = {
      total: 42,
      completed: 30,
      processing: 5,
      pending: 3,
      failed: 4,
    };

    vi.mocked(useStats).mockReturnValue({
      stats: mockStats,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StatsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Total Downloads.*42/)).toBeInTheDocument();
      expect(screen.getByText(/Completed.*30/)).toBeInTheDocument();
      expect(screen.getByText(/Processing.*5/)).toBeInTheDocument();
      expect(screen.getByText(/Failed.*4/)).toBeInTheDocument();
    });
  });

  it("renders storage quota display", () => {
    vi.mocked(useStats).mockReturnValue({
      stats: { total: 0, completed: 0, processing: 0, pending: 0, failed: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StatsDashboard />);

    expect(screen.getByTestId("storage-quota")).toBeInTheDocument();
  });

  it("renders error state with retry button", () => {
    const mockRefetch = vi.fn();
    vi.mocked(useStats).mockReturnValue({
      stats: null,
      loading: false,
      error: "Failed to load stats",
      refetch: mockRefetch,
    });

    render(<StatsDashboard />);

    expect(screen.getByText(/Failed to load statistics/)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("calls refetch when retry button is clicked", async () => {
    const mockRefetch = vi.fn();
    vi.mocked(useStats).mockReturnValue({
      stats: null,
      loading: false,
      error: "Failed to load stats",
      refetch: mockRefetch,
    });

    const { getByText } = render(<StatsDashboard />);

    const retryButton = getByText("Retry");
    retryButton.click();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
