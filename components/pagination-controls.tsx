"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * URL-driven pagination for server-side-paginated lists (Section 7:
 * "server-side pagination everywhere, default 20 rows"). Reads/writes
 * `?page=`, leaving every other query param (search, filters) intact.
 */
export function PaginationControls({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function hrefForPage(p: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  function go(p: number) {
    router.push(hrefForPage(p));
  }

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={hrefForPage(Math.max(1, page - 1))}
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) go(page - 1);
              }}
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href={hrefForPage(page)} isActive>
              {page}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <span className="px-2 text-sm text-muted-foreground">of {pageCount}</span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href={hrefForPage(Math.min(pageCount, page + 1))}
              onClick={(e) => {
                e.preventDefault();
                if (page < pageCount) go(page + 1);
              }}
              aria-disabled={page >= pageCount}
              className={page >= pageCount ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
