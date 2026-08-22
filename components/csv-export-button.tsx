"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Section 5.9: "CSV export." Client-side Blob download — the data is already on the page, no round trip needed. */
export function CsvExportButton({ filename, csv }: { filename: string; csv: string }) {
  function onClick() {
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

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={!csv}>
      <Download />
      Export CSV
    </Button>
  );
}
