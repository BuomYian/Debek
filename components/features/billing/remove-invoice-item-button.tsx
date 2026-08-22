"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { removeInvoiceItem } from "@/actions/billing";
import { Button } from "@/components/ui/button";

export function RemoveInvoiceItemButton({ id, invoiceId }: { id: string; invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    startTransition(async () => {
      const result = await removeInvoiceItem(id, invoiceId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={onRemove} disabled={isPending} aria-label="Remove line item" className="print:hidden">
      <Trash2 className="size-4" />
    </Button>
  );
}
