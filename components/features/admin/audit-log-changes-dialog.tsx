"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Json } from "@/lib/supabase/types";

export function AuditLogChangesDialog({ changes }: { changes: Json | null }) {
  const [open, setOpen] = useState(false);

  if (!changes) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Eye />
        View
      </Button>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Changes</DialogTitle>
        </DialogHeader>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap break-words">
          {JSON.stringify(changes, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
