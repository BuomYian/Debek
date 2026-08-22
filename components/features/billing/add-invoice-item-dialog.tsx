"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { addInvoiceItem } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { addInvoiceItemSchema, type AddInvoiceItemInput } from "@/lib/validations/billing";

/** Section 5.7: "Add line items (procedures, lab, supplies)." */
export function AddInvoiceItemDialog({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<AddInvoiceItemInput>({
    resolver: zodResolver(addInvoiceItemSchema),
    defaultValues: { invoiceId, description: "", quantity: 1, unitPrice: 0 },
  });

  function onSubmit(values: AddInvoiceItemInput) {
    startTransition(async () => {
      const result = await addInvoiceItem(values);
      if (result.success) {
        toast.success("Line item added.");
        form.reset({ invoiceId, description: "", quantity: 1, unitPrice: 0 });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Add line item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add line item</DialogTitle>
          <DialogDescription>A procedure, lab test, or supply charged on this invoice.</DialogDescription>
        </DialogHeader>
        <form id="add-invoice-item-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Input {...field} id={field.name} disabled={isPending} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="quantity"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
                    <Input {...field} id={field.name} type="number" min={1} step="1" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="unitPrice"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Unit price (SSP)</FieldLabel>
                    <Input {...field} id={field.name} type="number" min={0} step="0.01" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="add-invoice-item-form" disabled={isPending}>
            {isPending ? "Adding…" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
