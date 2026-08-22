"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Reused by medical records, and later prescriptions/invoices (Section 6: print stylesheets). */
export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer />
      Print
    </Button>
  );
}
