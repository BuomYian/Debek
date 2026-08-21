import { tableFeatures } from "@tanstack/react-table";

/**
 * Shared TanStack Table v9 feature registration (Section 2: "Tables:
 * TanStack Table"). v9 is a substantial redesign from v8 — row models
 * are opt-in feature slots rather than useReactTable options, and
 * columns are typed against a specific feature set via
 * createColumnHelper<typeof features, TData>(). Every module's column
 * definitions import this one shared feature set rather than each
 * inventing its own, so they all compose with the same DataTable
 * wrapper (components/data-table.tsx).
 *
 * Empty for now — core row model only, which is automatic and needs no
 * entry here. Add feature slots (e.g. `rowSortingFeature,
 * sortedRowModel: createSortedRowModel()`) here, once, the first time a
 * module actually needs client-side sorting.
 */
export const tableFeatureSet = tableFeatures({});
export type AppTableFeatures = typeof tableFeatureSet;
