"use client";

import { FileText, FolderOpen } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deletePatientFile, type PatientFile } from "@/actions/patient-files";
import { UploadFileDialog } from "@/components/features/files/upload-file-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CATEGORY_LABEL: Record<PatientFile["category"], string> = {
  lab_result: "Lab result",
  scan: "Scan",
  referral: "Referral",
  consent_form: "Consent form",
  id_document: "ID document",
  other: "Other",
};

/** Cloudinary URL transformation for a small square thumbnail (Section 5.8: "Thumbnail previews for images"). */
function thumbnailUrl(url: string): string {
  return url.replace("/upload/", "/upload/c_thumb,w_200,h_200,g_auto/");
}

function isImage(fileType: string): boolean {
  return fileType.startsWith("image/");
}

function FileCard({ file, canDelete, patientId }: { file: PatientFile; canDelete: boolean; patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    startTransition(async () => {
      const result = await deletePatientFile(file.id, patientId);
      if (result.success) {
        toast.success("File deleted.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <a
        href={file.cloudinary_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted"
      >
        {isImage(file.file_type) ? (
          <Image
            src={thumbnailUrl(file.cloudinary_url)}
            alt={file.file_name}
            width={200}
            height={200}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          <FileText className="size-10 text-muted-foreground" aria-hidden="true" />
        )}
      </a>
      <p className="truncate text-sm font-medium" title={file.file_name}>
        {file.file_name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-xs">
          {CATEGORY_LABEL[file.category]}
        </Badge>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive" disabled={isPending}>
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {file.file_name}?</AlertDialogTitle>
                <AlertDialogDescription>This removes the file permanently, from Cloudinary and this record.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

export function PatientFilesTab({
  patientId,
  files,
  currentUserId,
  isAdmin,
}: {
  patientId: string;
  files: PatientFile[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <UploadFileDialog patientId={patientId} />
      </div>

      {files.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              patientId={patientId}
              canDelete={isAdmin || file.uploaded_by === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
