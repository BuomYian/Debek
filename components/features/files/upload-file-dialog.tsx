"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createPatientFile } from "@/actions/patient-files";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/cloudinary/constants";
import type { FileCategory } from "@/lib/validations/patient-files";

const CATEGORY_OPTIONS: { value: FileCategory; label: string }[] = [
  { value: "lab_result", label: "Lab result" },
  { value: "scan", label: "Scan" },
  { value: "referral", label: "Referral" },
  { value: "consent_form", label: "Consent form" },
  { value: "id_document", label: "ID document" },
  { value: "other", label: "Other" },
];

type SignResponse = { signature: string; timestamp: number; folder: string; allowedFormats: string; apiKey: string; cloudName: string };

/** Section 5.8: signed direct-to-Cloudinary upload — the file never passes through our server. */
export function UploadFileDialog({ patientId, medicalRecordId }: { patientId: string; medicalRecordId?: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<FileCategory>("other");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function resetAndClose() {
    setFile(null);
    setDescription("");
    setCategory("other");
    setOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(selected.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      toast.error("Only PDF, JPG, PNG, or WEBP files are allowed.");
      e.target.value = "";
      return;
    }
    if (selected.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error("File is too large — the limit is 10 MB.");
      e.target.value = "";
      return;
    }
    setFile(selected);
  }

  async function onUpload() {
    if (!file) return;
    setIsUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
      if (!signRes.ok) throw new Error("Couldn't get an upload signature.");
      const sign: SignResponse = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", String(sign.timestamp));
      formData.append("signature", sign.signature);
      formData.append("folder", sign.folder);
      formData.append("allowed_formats", sign.allowedFormats);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Upload to Cloudinary failed.");
      }
      const uploaded = await uploadRes.json();

      const result = await createPatientFile({
        patientId,
        medicalRecordId,
        fileName: file.name,
        fileType: file.type,
        fileSize: uploaded.bytes ?? file.size,
        cloudinaryPublicId: uploaded.public_id,
        cloudinaryUrl: uploaded.secure_url,
        category,
        description,
      });

      if (result.success) {
        toast.success("File uploaded.");
        resetAndClose();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload />
          Upload file
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a file</DialogTitle>
          <DialogDescription>PDF, JPG, PNG, or WEBP — up to 10 MB.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="file">File</FieldLabel>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
              onChange={onFileChange}
              disabled={isUploading}
            />
            {file && <FieldDescription>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</FieldDescription>}
          </Field>
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Select value={category} onValueChange={(v) => setCategory(v as FileCategory)} disabled={isUploading}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={onUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
