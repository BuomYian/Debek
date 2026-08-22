"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { cancelInvoice, type InvoiceWithDetails } from "@/actions/billing";
import { AddInvoiceItemDialog } from "@/components/features/billing/add-invoice-item-dialog";
import { InvoiceChargesForm } from "@/components/features/billing/invoice-charges-form";
import { InvoiceStatusBadge } from "@/components/features/billing/invoice-status-badge";
import { RecordPaymentDialog } from "@/components/features/billing/record-payment-dialog";
import { RemoveInvoiceItemButton } from "@/components/features/billing/remove-invoice-item-button";
import { PrintButton } from "@/components/print-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLINIC_NAME } from "@/lib/clinic";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onCancel() {
    startTransition(async () => {
      const result = await cancelInvoice(invoiceId);
      if (result.success) {
        toast.success("Invoice cancelled.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending} className="print:hidden">
          Cancel invoice
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This voids the invoice. Nothing is deleted — the record and any payments already made stay intact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep invoice</AlertDialogCancel>
          <AlertDialogAction onClick={onCancel}>Cancel invoice</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Section 5.7: "Printable invoice / receipt." */
export function InvoiceView({ invoice, canEdit }: { invoice: InvoiceWithDetails; canEdit: boolean }) {
  const balance = invoice.balance ?? invoice.total - invoice.amount_paid;
  const canRecordPayment = canEdit && invoice.status !== "paid" && invoice.status !== "cancelled";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">{format(parseISO(invoice.issue_date), "d MMMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          {canRecordPayment && <RecordPaymentDialog invoiceId={invoice.id} balance={balance} />}
          {canEdit && invoice.status !== "cancelled" && <CancelInvoiceButton invoiceId={invoice.id} />}
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="flex flex-col gap-6 print:text-black">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">{CLINIC_NAME}</h2>
              <p className="text-sm text-muted-foreground print:text-black/70">Invoice / Receipt</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{invoice.invoice_number}</p>
              <p className="text-sm text-muted-foreground print:text-black/70">
                {format(parseISO(invoice.issue_date), "d MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <dt className="text-xs text-muted-foreground print:text-black/60">Patient</dt>
              <dd className="text-sm font-medium">
                {invoice.patient?.first_name} {invoice.patient?.last_name} ({invoice.patient?.patient_number})
              </dd>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                  {canEdit && <TableHead className="print:hidden" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{money(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{money(item.line_total ?? item.quantity * item.unit_price)}</TableCell>
                    {canEdit && (
                      <TableCell className="print:hidden">
                        <RemoveInvoiceItemButton id={item.id} invoiceId={invoice.id} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground print:text-black/70">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right" colSpan={canEdit ? 2 : 1}>
                    {money(invoice.subtotal)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground print:text-black/70">
                    Discount
                  </TableCell>
                  <TableCell className="text-right" colSpan={canEdit ? 2 : 1}>
                    -{money(invoice.discount)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground print:text-black/70">
                    Tax
                  </TableCell>
                  <TableCell className="text-right" colSpan={canEdit ? 2 : 1}>
                    {money(invoice.tax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-medium" colSpan={canEdit ? 2 : 1}>
                    {money(invoice.total)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground print:text-black/70">
                    Paid
                  </TableCell>
                  <TableCell className="text-right" colSpan={canEdit ? 2 : 1}>
                    {money(invoice.amount_paid)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Balance due
                  </TableCell>
                  <TableCell className="text-right font-semibold" colSpan={canEdit ? 2 : 1}>
                    {money(balance)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {canEdit && (
            <div className="print:hidden">
              <AddInvoiceItemDialog invoiceId={invoice.id} />
            </div>
          )}

          {canEdit && invoice.status !== "cancelled" && (
            <div className="border-t pt-4 print:hidden">
              <InvoiceChargesForm invoice={invoice} />
            </div>
          )}

          {invoice.payments.length > 0 && (
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground print:text-black/60">Payments</p>
              <ul className="flex flex-col gap-1">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>
                      {format(parseISO(p.paid_at), "d MMM yyyy")} · {p.payment_method.replace("_", " ")}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className="font-medium">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
