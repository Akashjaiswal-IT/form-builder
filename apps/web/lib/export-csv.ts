/**
 * Converts an array of objects to a CSV string and triggers a download.
 */
export function downloadCsv(
  rows: Record<string, string>[],
  headers: string[],
  filename: string,
): void {
  // Build the header row
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");

  // Build data rows, matching the header order
  const dataLines = rows.map((row) =>
    headers
      .map((header) => {
        const value = (row[header] ?? "").toString().replace(/"/g, '""');
        return `"${value}"`;
      })
      .join(","),
  );

  const csv = [headerLine, ...dataLines].join("\n");

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}