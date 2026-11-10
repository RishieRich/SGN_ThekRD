# ARQ Thekedar Constitution

| Rule | Requirement | Proof |
| --- | --- | --- |
| C1 | Money is integer paise; all money maths lives in `src/domain/money.ts` and `billing.ts`. | Golden bill tests in Phase 2. |
| C2 | One fact has one computation path; components never re-total. | Static review and domain/query tests. |
| C3 | The app works with every AI key absent. | Journeys J1–J4, J8 and J9 with empty AI environment variables. |
| C4 | AI output is Zod-validated; numbers in chat answers must exist in tool results. | `src/ai/__tests__/guard.test.ts` in Phase 10. |
| C5 | AI-proposed writes require a human confirm tap. | End-to-end proposal tests. |
| C6 | Every query and write is scoped by the session tenant. | Two-tenant isolation test. |
| C7 | Sensitive fields are encrypted at rest and hidden from viewers. | Viewer API response test. |
| C8 | All visible strings exist in `en`, `hi`, `mr`, and `gu` with matching placeholders. | `pnpm i18n:check` and locale end-to-end tests. |
| C9 | Motion respects reduced-motion preferences and the user toggle. | Motion hook test. |
| C10 | Secrets never reach the client, logs, or URLs. | Server-only provider modules and empty `.env.example`. |
| C11 | Day confirm and import apply are idempotent. | Duplicate-key tests. |
| C12 | Sample rows are flagged and removable without touching real rows. | Mixed-data removal test. |
| C13 | Start fresh writes a backup before deletion. | Backup-before-delete test. |
| C14 | Uploaded files are deleted after apply or seven days; full Aadhaar is never stored. | Cleanup and masking tests. |
