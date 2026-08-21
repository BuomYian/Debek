# actions/

Server Actions, one file per module (`patients.ts`, `appointments.ts`,
`billing.ts`, …). Populated starting Phase 3.

Conventions every action file follows:

- `"use server"` at the top of the file.
- Re-check the caller's role before every mutation — never trust that the
  UI already enforced it (Section 3: defence in depth alongside
  middleware and RLS).
- Validate all input with the Zod schema from `lib/validations/`, even
  though the client already validated it with the same schema via
  react-hook-form.
- Return the typed `ActionResult<T>` shape from `lib/validations/common.ts`
  (`{ success, data? , error? }`) — never throw across the server/client
  boundary (Section 7 reliability requirement).
