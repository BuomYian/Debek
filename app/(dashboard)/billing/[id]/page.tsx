import { notFound } from "next/navigation";

import { getInvoice } from "@/actions/billing";
import { InvoiceView } from "@/components/features/billing/invoice-view";
import { requireRole } from "@/lib/auth/guards";

export async function generateMetadata(props: PageProps<"/billing/[id]">) {
  const { id } = await props.params;
  const result = await getInvoice(id);
  return { title: result.success ? result.data.invoice_number : "Invoice" };
}

export default async function InvoiceDetailPage(props: PageProps<"/billing/[id]">) {
  await requireRole(["admin", "receptionist"]);
  const { id } = await props.params;
  const result = await getInvoice(id);

  if (!result.success) notFound();

  return <InvoiceView invoice={result.data} canEdit />;
}
