"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateInvoiceCharges, type Invoice } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateInvoiceChargesSchema, type UpdateInvoiceChargesInput } from "@/lib/validations/billing";

/** Section 5.7: "Discounts and tax." Total/status/balance recompute automatically on save. */
export function InvoiceChargesForm({ invoice }: { invoice: Invoice }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<UpdateInvoiceChargesInput>({
    resolver: zodResolver(updateInvoiceChargesSchema),
    defaultValues: { id: invoice.id, discount: invoice.discount, tax: invoice.tax, dueDate: invoice.due_date ?? "" },
  });

  function onSubmit(values: UpdateInvoiceChargesInput) {
    startTransition(async () => {
      const result = await updateInvoiceCharges(values);
      if (result.success) {
        toast.success("Invoice updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="print:hidden">
      <FieldGroup>
        <div className="grid grid-cols-3 gap-3">
          <Controller
            name="discount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Discount (SSP)</FieldLabel>
                <Input {...field} id={field.name} type="number" min={0} step="0.01" disabled={isPending} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="tax"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Tax (SSP)</FieldLabel>
                <Input {...field} id={field.name} type="number" min={0} step="0.01" disabled={isPending} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="dueDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Due date</FieldLabel>
                <Input {...field} id={field.name} type="date" disabled={isPending} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <Button type="submit" size="sm" className="w-fit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </FieldGroup>
    </form>
  );
}
