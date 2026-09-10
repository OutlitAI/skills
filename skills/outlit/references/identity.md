# Customer identity and merge workflow

Use the tool schemas exposed by the connected MCP server or installed CLI. Identity tools require a supporting server rollout and client version; documentation alone does not prove they are deployed. If a tool is absent, check the installed CLI help and available published upgrade. Do not invent a command or bypass an agent policy.

## Diagnose before combining records

`outlit_get_customer_identity` takes `{ customerId }` and returns candidate metadata and supporting references, a search window, timestamps, coverage, and limits. Its current search is bounded by call-participant domains, not every possible identity source. Candidates do not grant access to another customer's evidence. Treat an incomplete result as unknown coverage.

```sh
outlit customers identity <customerId> --json
```

Inspect exact customer records and source evidence within your existing access. A shared consultant, similar company name, related domain, or parent/subsidiary relationship is not enough to establish that the records represent the same company. If uncertain, stop at diagnosis and explain the uncertainty.

## Saved suggestions and existing work

`outlit_list_identity_merge_suggestions` accepts optional `customerId`, `suggestionId`, `status`, `confidence`, `cursor`, and `limit`. It returns `{ suggestions, nextCursor, canManageIdentityMerges }`. The default limit is 50 and maximum is 100. Status filters are `suggested`, `processing`, `merged`, and `rejected`; confidence filters are `HIGH`, `MEDIUM`, and `LOW`.

```sh
outlit identity suggestions list --customer-id <customerId> --json
outlit identity suggestions list --suggestion-id <suggestionId> --json
```

Each suggestion includes its `id`, survivor, duplicate, review details, impact, `canMerge`, `canReject`, and nullable `latestJob`. Inspect one suggestion through this list filter; there is no separate suggestion-get tool. Follow `nextCursor` using `--cursor` for more pages.

When `latestJob.operationId` is non-null, pass it to the status tool. `latestJob.id` is a job ID, not an operation ID. A null operation ID means there is no matching tracked operation for that job; do not substitute the job ID or infer that no work has happened. An empty suggestion list does not rule out an unsuggested merge. Reuse an operation ID from an earlier execution response when available.

If a merge is already queued or running, track it rather than submitting a new request. If prior execution is uncertain, retry only the identical execution input with its original request ID. Do not generate a new ID to get around a conflict. If prior execution is uncertain and neither the original request ID nor operation ID is available, stop execution and report the unresolved state.

To reject a suggestion when the user asks, use `outlit_reject_identity_merge_suggestion` with `{ suggestionId, reviewNotes? }`. Its response is exactly `{ suggestionId, status: "REJECTED" }`; rejection keeps the records separate.

```sh
outlit identity suggestions reject <suggestionId> --review-notes "Distinct companies" --json
```

## Preview, execute, and track

`outlit_merge_customers` is the single preview/execute tool. Input:

- Required: `survivingCustomerId` and `duplicateCustomerId`, which must be distinct.
- Optional: `suggestionId` and `reviewNotes`.
- `dryRun` defaults to `true`.
- Execution requires `dryRun: false`, the reviewed `previewToken`, and a stable `requestId`.

Without `suggestionId`, both records must be `COMPANY`. Any pair involving an `INDIVIDUAL` requires an eligible saved suggestion for that exact pair and survivor. A suggestion does not prove a match or grant merge authority.

Preview first:

```sh
outlit customers merge <survivorId> <duplicateId> --json
```

The preview returns `kind: "preview"`, both customer IDs, `previewToken`, `evaluatedAt`, impact counts, and warnings. There is no `eligible` boolean; unsupported pairs fail. Add `--suggestion-id <suggestionId>` when using a saved suggestion, including for individual records. Review the survivor, identifiers, affected data, and access relationships before execution.

**Execution is dangerous and has no supported undo.** Only execute with explicit user authorization, certainty that both records represent the same customer, and merge permission. A preview grants no authority. Preserve the reviewed pair and relevant options; the server rejects a stale identity preview.

```sh
outlit customers merge <survivorId> <duplicateId> --execute \
  --preview-token <returnedToken> --request-id <stableRequestId> --json
```

Include the same `--suggestion-id` and `--review-notes` if used. Retry with identical execution input and the same request ID. Never interpret a successful request as a completed merge.

Execution and `outlit_get_customer_merge_status` return the same operation shape: `kind: "operation"`, `operationId`, both customer IDs, `status`, `phase`, and optional `error: { code, message }`. Status is `queued`, `running`, `completed`, or `failed`. The status tool takes `{ operationId }`:

```sh
outlit customers merge-status <operationId> --json
```

Only `completed` reports completion. For `failed`, inspect the returned error; do not invent restart, cancel, or undo operations. Possessing an operation ID does not grant access. Rejection, preview, execution, and status are separate outcomes; a preview or queued operation has not merged the records.

## Permissions and tool metadata

- API keys: `customer_intelligence:read` for diagnosis, suggestions, previews, and status; `customer_identity:review` for rejection; `customer_identity:merge` for execution. A complete preview/execute/track workflow needs both read and merge grants. The merge grant requires an explicit Custom-key selection and is excluded from Full workspace access.
- OAuth MCP: current user permissions and record access apply. Under the default member/admin roles, members can diagnose accessible customers; admins have identity management permissions.
- Outlit-owned agents cannot perform identity writes, even when representing an admin. Churn and Renewal can diagnose only their assigned customer. Do not bypass this boundary through a different client or credential.
- MCP merge metadata includes `readOnlyHint: false` and `destructiveHint: true`, reflecting its maximum effect even though preview is the default. Its description warns about permanent changes, certainty, permissions, and asynchronous execution. Hints do not enforce authorization; the server does.
- CLI merge help uses that same canonical description. `--execute` is explicit and defaults off; `--preview-token` and `--request-id` are required with it. Check stderr and exit status for failures.
- Pi's default and analytical toolsets do not automatically include these identity tools; custom selection is required. Inclusion does not confer permission.
