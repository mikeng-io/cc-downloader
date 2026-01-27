import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/stats-card";

describe("StatsCard", () => {
  it("renders with label and value", () => {
    render(
      <StatsCard
        label="Total Downloads"
        value={42}
        icon="download"
        color="primary"
      />
    );

    expect(screen.getByText("Total Downloads")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders loading skeleton when loading prop is true", () => {
    const { container } = render(
      <StatsCard
        label="Total Downloads"
        value={42}
        icon="download"
        color="primary"
        loading
      />
    );

    expect(container.querySelector(".skeleton")).toBeInTheDocument();
  });

  it("applies correct color variant classes", () => {
    const { container, rerender } = render(
      <StatsCard
        label="Test"
        value={10}
        icon="star"
        color="success"
      />
    );

    expect(container.querySelector(".text-green-600")).toBeInTheDocument();

    rerender(
      <StatsCard
        label="Test"
        value={10}
        icon="star"
        color="error"
      />
    );

    expect(container.querySelector(".text-red-600")).toBeInTheDocument();
  });

  it("formats large numbers with commas", () => {
    render(
      <StatsCard
        label="Total Downloads"
        value={1234567}
        icon="download"
        color="primary"
      />
    );

    expect(screen.getByText("1,234,567")).toBeInTheDocument();
  });

  it("renders Material icon with correct name", () => {
    render(
      <StatsCard
        label="Test"
        value={10}
        icon="analytics"
        color="primary"
      />
    );

    const icon = screen.getByText("analytics");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("material-symbols-outlined");
  });
});
