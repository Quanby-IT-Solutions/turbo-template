#!/usr/bin/env node
/**
 * tickets-to-issues.mjs
 * Usage:
 *   node scripts/tickets-to-issues.mjs [file] --project <number> --project-owner <owner> [--dry-run] [--repo owner/name]
 *
 * Pass a markdown file you create (for example path/to/tickets.md). This
 * template does not ship that file. If you omit the file argument, the script
 * reads docs/TICKETS.md, which you must create yourself.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
// Default only when the caller omits the file argument. The template does not
// ship that file; the adopter creates it.
const filePath = args.find(a => !a.startsWith('--')) ?? 'docs/TICKETS.md';
const dryRun = args.includes('--dry-run');

const repoIdx = args.indexOf('--repo');
const repoValue = repoIdx !== -1 ? args[repoIdx + 1] : undefined;

if (repoIdx !== -1 && (!repoValue || repoValue.startsWith('--'))) {
  console.error('Invalid --repo value.');
  process.exit(1);
}

const repoArgs = repoValue ? ['--repo', repoValue] : [];

// === Required project flags ===
const projectIdx = args.indexOf('--project');
const ownerIdx = args.indexOf('--project-owner');

if (projectIdx === -1 || ownerIdx === -1) {
  console.error(`
Missing required flags.

Usage:
  node scripts/tickets-to-issues.mjs [file] --project <number> --project-owner <owner> [--dry-run]

Example:
  node scripts/tickets-to-issues.mjs path/to/tickets.md --project 71 --project-owner Quanby-IT-Solutions
`);
  process.exit(1);
}

const PROJECT_NUMBER = args[projectIdx + 1];
const PROJECT_OWNER = args[ownerIdx + 1];

if (!PROJECT_NUMBER || !PROJECT_OWNER || PROJECT_OWNER.startsWith('--')) {
  console.error('Invalid --project or --project-owner value.');
  process.exit(1);
}

if (!/^[0-9]+$/.test(PROJECT_NUMBER)) {
  console.error('--project must be a project number.');
  process.exit(1);
}
// ==============================

// Arguments are passed as an argv array, never as a shell string: every value
// below reaches here from the command line or from the ticket file, and a
// title or label holding a quote or a `;` must stay one argument rather than
// becoming a second command.
function gh(argv) {
  return execFileSync('gh', [...argv, ...repoArgs], { encoding: 'utf8' }).trim();
}

function ghProject(argv) {
  return execFileSync('gh', argv, { encoding: 'utf8' }).trim();
}

// --- Read file ---
let raw;
try {
  raw = readFileSync(filePath, 'utf8');
} catch {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const blocks = raw.split(/^---$/m).map(b => b.trim()).filter(b => /\*\*Title:\*\*/.test(b));

function parseTicket(block) {
  const titleMatch = block.match(/\*\*Title:\*\*\s*\[([A-Z0-9-]+)\]\s+(.+)/);
  if (!titleMatch) return null;
  const [, key, rawTitle] = titleMatch;
  const title = rawTitle.trim();
  const epicMatch = block.match(/\*\*Epic:\*\*\s*`([^`]+)`/);
  const epic = epicMatch?.[1] ?? null;
  const alsoTouches = [...block.matchAll(/\*\*Also touches:\*\*[^\n]*\n?(.+)/g)]
    .flatMap(m => [...m[1].matchAll(/`([^`]+)`/g)].map(x => x[1]));
  const labels = ['ticket', ...(epic ? [epic] : []), ...alsoTouches];
  const issueTitle = `[${key}] ${title}`;
  const body = `> Generated from \`${filePath}\`\n\n${block}`;
  return { key, title, epic, alsoTouches, labels, body, issueTitle };
}

const tickets = blocks.map(parseTicket).filter(Boolean);

if (tickets.length === 0) {
  console.error(`No tickets parsed from ${filePath}. Check format: **Title:** [KEY] Name`);
  process.exit(1);
}

console.log(`Found ${tickets.length} ticket(s) in ${filePath}`);
console.log(`Target project: ${PROJECT_OWNER}/projects/${PROJECT_NUMBER}\n`);

// --- Fetch existing issues ---
let existingTitles = new Set();
try {
  const json = gh(['issue', 'list', '--state', 'all', '--limit', '500', '--json', 'title']);
  existingTitles = new Set(JSON.parse(json).map(i => i.title));
} catch (e) {
  console.warn(`Warning: could not fetch existing issues (${e.message}). Skipping idempotency check.`);
}

// --- Ensure labels ---
const allLabels = new Set(tickets.flatMap(t => t.labels));
if (dryRun) {
  console.log('Labels that would be created/ensured:');
  for (const l of allLabels) console.log(`  ${l}`);
  console.log();
} else {
  for (const label of allLabels) {
    try {
      gh(['label', 'create', label, '--color', '0075ca', '--force']);
    } catch { /* ignore */ }
  }
}

// --- Process tickets ---
let created = 0;
let skipped = 0;
const createdNums = [];

// `gh issue create --body-file` needs a path. A fixed name under the shared
// temp dir is guessable, so another local process could pre-create it as a
// symlink and have us write the ticket body somewhere else. `mkdtempSync`
// returns a fresh directory only this process can name.
const bodyDir = dryRun ? null : mkdtempSync(join(tmpdir(), 'tickets-to-issues-'));

try {
  for (const ticket of tickets) {
    if (existingTitles.has(ticket.issueTitle)) {
      console.log(`SKIP   ${ticket.issueTitle}`);
      skipped++;
      continue;
    }

    const labelArgs = ticket.labels.flatMap(l => ['--label', l]);

    if (dryRun) {
      console.log(`DRY    ${ticket.issueTitle}`);
      console.log(`       → would add to ${PROJECT_OWNER}/projects/${PROJECT_NUMBER}`);
      console.log();
      created++;
      continue;
    }

    const tmpFile = join(bodyDir, `ticket-${ticket.key}.md`);
    writeFileSync(tmpFile, ticket.body, 'utf8');
    const url = gh(['issue', 'create', '--title', ticket.issueTitle, ...labelArgs, '--body-file', tmpFile]);
    const num = url.match(/\/(\d+)$/)?.[1];
    console.log(`CREATE #${num ?? '?'}  ${ticket.issueTitle}`);

    // Automatically add to the project
    try {
      ghProject(['project', 'item-add', PROJECT_NUMBER, '--owner', PROJECT_OWNER, '--url', url]);
      console.log(`       → added to project ${PROJECT_OWNER}/projects/${PROJECT_NUMBER}`);
    } catch (e) {
      console.warn(`       ⚠ Failed to add to project: ${e.message}`);
      console.warn(`         Run once: gh auth refresh -s project`);
    }

    if (num) createdNums.push(num);
    created++;
  }
} finally {
  if (bodyDir) rmSync(bodyDir, { recursive: true, force: true });
}

// --- Summary ---
console.log(`\nSummary: ${created} created, ${skipped} skipped.`);
if (!dryRun && createdNums.length > 0) {
  console.log('\nPer-ticket workflow:');
  for (const n of createdNums) {
    console.log(`  gh issue develop ${n} --base dev --checkout`);
    console.log(`  git push -u origin HEAD`);
    console.log();
  }
} else if (dryRun) {
  console.log('\nRe-run without --dry-run to create the issues and add them to the project.');
}