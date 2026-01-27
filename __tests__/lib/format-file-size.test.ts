import { formatFileSize } from "@/lib/utils/format-file-size";

describe("formatFileSize", () => {
  it("should format bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(100)).toBe("100 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("should format kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(5309)).toBe("5.18 KB"); // The Cat03.jpg file
    expect(formatFileSize(4755)).toBe("4.64 KB"); // The README.md file
    expect(formatFileSize(10240)).toBe("10.00 KB");
  });

  it("should format megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1.00 MB"); // 1 MB
    expect(formatFileSize(1572864)).toBe("1.50 MB"); // 1.5 MB
    expect(formatFileSize(10485760)).toBe("10.00 MB"); // 10 MB
  });

  it("should format gigabytes correctly", () => {
    expect(formatFileSize(1073741824)).toBe("1.00 GB"); // 1 GB
    expect(formatFileSize(5368709120)).toBe("5.00 GB"); // 5 GB
  });

  it("should format terabytes correctly", () => {
    expect(formatFileSize(1099511627776)).toBe("1.00 TB"); // 1 TB
  });

  it("should handle null and undefined", () => {
    expect(formatFileSize(null)).toBe("0 B");
    expect(formatFileSize(undefined)).toBe("0 B");
  });

  it("should not show 0.01 MB for small files (regression test)", () => {
    // This was the bug: 5309 bytes was showing as "0.01 MB" instead of "5.18 KB"
    const fileSize = 5309;
    const result = formatFileSize(fileSize);

    expect(result).not.toBe("0.01 MB");
    expect(result).toBe("5.18 KB");
  });
});
