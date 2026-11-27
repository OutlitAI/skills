import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const skill = await readFile(new URL("../skills/outlit/SKILL.md", import.meta.url), "utf8");
const setupReference = readFileSync(
  new URL("../skills/outlit/references/setup-and-admin.md", import.meta.url),
  "utf8",
);
const skillAndSetup = `${skill}\n${setupReference}`;
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const catalogDocs = await Promise.all(
  ["README.md", "AGENTS.md", "skills.sh.json"].map((path) =>
    readFile(new URL(`../${path}`, import.meta.url), "utf8"),
  ),
);

test("Outlit skill says when agents should use it", () => {
  assert.match(skill, /^## When to Use Outlit$/m);
  assert.match(skill, /onboarding, adoption, retention, renewal, or expansion/);
  assert.match(skill, /Use the `outlit-sdk` skill instead/);
});

test("Outlit skill leads with question-answering guidance", () => {
  const answering = skill.indexOf("## Answer Customer Questions");
  const setup = skill.indexOf("## Setup, Administration, and Writes");
  assert.ok(answering > -1, "missing answering guide");
  assert.ok(setup > answering, "setup and writes should come after the answering guide");
  assert.match(skill, /no blanket "SQL last"/);
  assert.doesNotMatch(skill, /Use SQL \(outlit_query\) last|SQL is for aggregates, cohorts/);
  assert.match(skill, /Retrieved invoices, balances, fact assertions, timeline events, search excerpts, and SQL rows are evidence/);
  assert.match(skill, /Do not open or page every source merely to create citations/);
  assert.match(skill, /only when it changes the answer/);
  for (const text of [
    "don't hedge a supported conclusion",
    'sort by the relevant date and take the newest',
    'the newer source wins; cite both',
    'call a partial period partial',
    'report every one',
    'opens, clicks, digests',
    'compare ingestion time with `occurred_at`',
    'Drop out-of-scope records before counting',
    'before generalising about the group',
    'check integrations, digests, and API activity',
    'self-serve expansion shows in billed volume',
  ]) {
    assert.ok(skill.includes(text), `missing ${text}`);
  }
  for (const text of [
    'include: ["support"]',
    'include: ["usage", "behaviorMetrics"]',
    'include: ["identity", "links"]',
    'include: ["billing"]',
    'receivables',
    'activePeople',
    'knownContacts',
    'mergedFrom',
    'secondaryDomains',
    'resolvedFrom',
  ]) {
    assert.ok(skill.includes(text), `missing ${text}`);
  }
  assert.match(skill, /shared-domain, contact, billing, and identity-proposal checks were made and what was not checked/);
  assert.match(skill, /`windowStart`\/`windowEnd` and the section `asOf`/);
  assert.match(skill, /null or unreadable `receivables` as unknown or partial—not zero/);
  assert.match(skill, /`productId` is the billing provider product id, not proof of the SKU/);
  assert.match(skill, /`billingCountry` is the billing-address country, not proof of the customer's location/);
  assert.match(skill, /unchanged except `attachmentPage\.page`, preserving `source\.attachmentPage\.revision`/);
  assert.match(skill, /check `coverage\.status` and narrow the window when recency matters/);
});

test("Outlit chooser documents the current public capability families", () => {
  for (const toolName of [
    "outlit_list_members",
    "outlit_list_people",
    "outlit_get_customer",
    "outlit_get_schema",
    "outlit_list_toolsets",
    "outlit_load_toolset",
    "outlit_list_customer_fields",
    "outlit_list_destinations",
    "outlit_list_integrations",
    "outlit_setup_integration",
    "outlit_get_setup_session",
    "outlit_preview_activation",
    "outlit_set_customer_owner",
    "outlit_set_customer_access",
    "outlit_get_settings",
    "outlit_update_settings",
    "outlit_list_features",
    "outlit_get_identity",
    "outlit_list_merge_suggestions",
    "outlit_get_merge",
  ]) {
    assert.match(skillAndSetup, new RegExp(`\\b${toolName}\\b`));
  }

  assert.match(skill, /\| Workspace teammates.*`outlit_list_members`.*`outlit members list` \|/);
  assert.match(skillAndSetup, /[Dd]eterministic enumeration of records/);
  assert.match(skillAndSetup, /`slack`/);
});

test("Outlit skill names the Agent API v2 tools and SQL views, not the retired ones", () => {
  const sqlReference = readFileSync(
    new URL("../skills/outlit/references/sql-reference.md", import.meta.url),
    "utf8",
  );

  assert.match(skill, /\| People and contacts .*`outlit_list_people`.*`outlit people list`.*\|/);
  assert.match(skill, /`relationship` for the compiled standing/);
  assert.match(skill, /`features`, `meters`, or `credits`/);
  assert.match(setupReference, /\?toolsets=core,work,meta/);

  const retired = /`outlit_(?:list_users|get_customer_relationship|get_customer_features|get_customer_credits|list_crm_fields|schema)`/g;
  const tableRows = skillAndSetup.split("\n").filter((line) => line.startsWith("|"));
  for (const row of tableRows) assert.doesNotMatch(row, retired);
  const retiredAdmin =
    /`outlit_(?:get_destination|enable_destination|disable_destination|assign_customer_owner|grant_customer_access|update_customer_access|revoke_customer_access|list_workspace_users|get_integration_capabilities|begin_integration_setup|get_integration_setup_status|get_integration_status|get_workspace_settings|update_workspace_settings|get_customer_activation|preview_customer_activation|update_customer_activation)`/;
  for (const row of tableRows) assert.doesNotMatch(row, retiredAdmin);
  const retiredWorkIdentity =
    /`outlit_(?:list_attention_items|get_attention_item|get_customer_identity|list_identity_merge_suggestions|reject_identity_merge_suggestion|get_customer_merge_status)`/;
  for (const row of tableRows) assert.doesNotMatch(row, retiredWorkIdentity);
  // The churn case tools are hidden from external agents until a case becomes one kind of plan.
  for (const doc of [skill, readFileSync(new URL("../skills/outlit/references/identity.md", import.meta.url), "utf8")]) {
    assert.doesNotMatch(doc, /\boutlit_(?:list_cases|get_case|list_attention_items|get_attention_item)\b|outlit attention/);
  }

  const identityReference = readFileSync(
    new URL("../skills/outlit/references/identity.md", import.meta.url),
    "utf8",
  );
  for (const toolName of ["outlit_get_identity", "outlit_list_merge_suggestions", "outlit_reject_merge_suggestion", "outlit_get_merge"]) {
    assert.match(identityReference, new RegExp(`\\b${toolName}\\b`));
  }
  assert.doesNotMatch(identityReference, /`(?:survivingCustomerId|duplicateCustomerId|dryRun|reviewNotes|nextCursor)`/);
  assert.doesNotMatch(sqlReference, /`outlit_schema`\s+or/);

  for (const doc of [skill, sqlReference]) {
    assert.match(doc, /arr_amount/);
    assert.doesNotMatch(doc, /\bmrr_cents, billing_status/);
    assert.doesNotMatch(doc, /revenue and MRR reporting/);
    assert.doesNotMatch(doc, /Divide (?:money fields in )?cents by `100`/);
  }
  assert.match(sqlReference, /`arr_decimals`/);
  assert.match(sqlReference, /`subscription_mrr_cents`, `subscription_mrr_status`, `subscription_mrr_currency`/);
  assert.match(sqlReference, /`owner`, billing status/);
  assert.match(skill, /per-currency subscription MRR \(live subscription items only; not ARR ÷ 12\)/);
  assert.match(skill, /Use ARR for annual revenue/);
  assert.match(sqlReference, /no `arr_history` view/);
});

test("Outlit integration guidance matches the current secure CLI", () => {
  assert.match(setupReference, /outlit integrations setup <provider>/);
  assert.match(setupReference, /outlit integrations list \[provider\]/);
  assert.match(setupReference, /outlit setup-sessions get <id>/);
  assert.match(setupReference, /--config-stdin/);
  assert.match(setupReference, /--accept-recommended/);
  assert.match(setupReference, /Use `setup` to connect or repair/);
  assert.match(setupReference, /use `list` to inspect readiness/);

  for (const doc of [skill, setupReference, readme]) {
    assert.doesNotMatch(doc, /outlit integrations capabilities/);
    assert.doesNotMatch(doc, /outlit integrations status/);
    assert.doesNotMatch(doc, /outlit integrations status --session/);
    assert.doesNotMatch(doc, /outlit integrations setup \S+ (?:mappings|webhooks)/);
    assert.doesNotMatch(doc, /--config(?:\s|=)/);
  }
});

test("Outlit docs use the CLI 5 command spellings", () => {
  const docs = [
    skill,
    readme,
    readFileSync(new URL("../skills/outlit/references/identity.md", import.meta.url), "utf8"),
    readFileSync(new URL("../skills/outlit/references/sql-reference.md", import.meta.url), "utf8"),
    setupReference,
  ];
  const stale =
    /outlit (?:ws-users|users|sql\b|schema(?! get)|feedback(?! submit)|customers (?:timeline|identity|merge-status|owner|grant|revoke|relationship|features|credits)|identity suggestions|activation (?:get|update|disable)|integrations status|destinations (?:get|enable|disable))|--request-id|--review-notes|--customer-id|--execute\b/;
  for (const doc of docs) assert.doesNotMatch(doc, stale);
});

test("Outlit facts guidance covers current public fact filters and contact transitions", () => {
  const factTypesLine = skill
    .split("\n")
    .find((line) => line.startsWith("- Public fact type filters (`filters.types`; CLI `--fact-types`) accept"));
  const factCategoriesLine = skill
    .split("\n")
    .find((line) => line.startsWith("- Public fact category filters (`filters.categories`; CLI `--fact-categories`) accept"));

  assert.ok(factTypesLine, "missing public factTypes filter list");
  assert.ok(factCategoriesLine, "missing public factCategories filter list");

  for (const factType of [
    "custom",
    "company_change",
    "funding_revenue",
    "technology",
    "strategy",
    "competitive",
    "sentiment",
    "champion_risk",
    "expansion",
    "churn_risk",
    "timeline",
    "budget",
    "decision_maker",
    "requirements",
    "blocker",
    "commitment",
    "success_criterion",
    "product_usage",
    "contact_info",
    "contact_preference",
    "contact_departure",
    "contact_position_change",
    "contact_disengagement",
  ]) {
    assert.match(factTypesLine, new RegExp(`\`${factType}\``));
  }

  assert.match(factCategoriesLine, /`memory`, `relationship`, and `custom`/);
  assert.match(skill, /left or is leaving/);
  assert.match(skill, /title, department, team, or professional responsibility/);
  assert.match(skill, /stopped participating, organizing, responding, or owning/);
  assert.match(skill, /single unanswered message.*insufficient/);
  assert.match(skill, /`contact_disengagement`.*does not currently wake Churn/);
  assert.match(skill, /`champion_risk`.*historical.*readable/);
});

test("Outlit authorization guidance includes the onboarding key preset", () => {
  assert.match(setupReference, /Personal CLI/);
  assert.match(setupReference, /Read and write/);
  assert.match(setupReference, /creator-owned integration setup/);
});

test("OpenClaw metadata allows stored credentials and browser onboarding", () => {
  const frontmatter = skill.split("---", 3)[1] ?? "";
  assert.doesNotMatch(frontmatter, /^\s+env:/m);
  assert.match(frontmatter, /^\s+primaryEnv: OUTLIT_API_KEY$/m);
});

test("repository docs use the current Skills repository name", () => {
  for (const doc of catalogDocs.slice(0, 2)) {
    assert.doesNotMatch(doc, /^# Outlit Agent Skills$/m);
    assert.match(doc, /^# Outlit Skills$/m);
  }
});

test("Outlit docs do not advertise the retired notification action surface", () => {
  assert.doesNotMatch(skill, /\bnotifications?\b|outlit_send_notification|outlit notify/i);
  for (const doc of catalogDocs) {
    assert.doesNotMatch(doc, /\bnotifications?\b/i);
  }
});

test("Outlit docs reference the current @outlit/tools public exports", () => {
  for (const exportName of [
    "customerToolContracts",
    "defaultAgentToolNames",
    "actionToolNames",
    "analyticalAgentToolNames",
    "allCustomerToolNames",
  ]) {
    assert.doesNotMatch(skill, new RegExp(`\\b${exportName}\\b`));
  }

  for (const exportName of [
    "publicToolContracts",
    "publicToolNames",
    "consumerToolPolicies",
    "defaultToolNames",
    "analyticalToolNames",
    "piToolNames",
    "cliToolNames",
    "allPublicToolNames",
    "sqlToolNames",
  ]) {
    assert.match(setupReference, new RegExp(`\\b${exportName}\\b`));
  }
});
