#!/usr/bin/env node
/**
 * tickets-to-issues.mjs
 * Usage:
 *   node scripts/tickets-to-issues.mjs [file] --project <number> --project-owner <owner> [--dry-run] [--repo owner/name]
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--')) ?? 'docs/TICKETS.md';
const dryRun = args.includes('--dry-run');

const repoIdx = args.indexOf('--repo');
const repoFlag = repoIdx !== -1 ? `--repo ${args[repoIdx + 1]}` : '';

// === Required project flags ===
const projectIdx = args.indexOf('--project');
const ownerIdx = args.indexOf('--project-owner');

if (projectIdx === -1 || ownerIdx === -1) {
  console.error(`
Missing required flags.

Usage:
  node scripts/tickets-to-issues.mjs [file] --project <number> --project-owner <owner> [--dry-run]

Example:
  node scripts/tickets-to-issues.mjs docs/TICKETS.md --project 71 --project-owner Quanby-IT-Solutions
`);
  process.exit(1);
}

const PROJECT_NUMBER = args[projectIdx + 1];
const PROJECT_OWNER = args[ownerIdx + 1];

if (!PROJECT_NUMBER || !PROJECT_OWNER || PROJECT_NUMBER.startsWith('--') || PROJECT_OWNER.startsWith('--')) {
  console.error('Invalid --project or --project-owner value.');
  process.exit(1);
}
// ==============================

function gh(cmd) {
  return execSync(`gh ${cmd} ${repoFlag}`.trimEnd(), { encoding: 'utf8' }).trim();
}

function ghProject(cmd) {
  return execSync(`gh ${cmd}`, { encoding: 'utf8' }).trim();
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
  const body = `> Generated from \`docs/TICKETS.md\`\n\n${block}`;
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
  const json = gh('issue list --state all --limit 500 --json title');
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
      gh(`label create ${JSON.stringify(label)} --color "0075ca" --force`);
    } catch { /* ignore */ }
  }
}

// --- Process tickets ---
let created = 0;
let skipped = 0;
const createdNums = [];

for (const ticket of tickets) {
  if (existingTitles.has(ticket.issueTitle)) {
    console.log(`SKIP   ${ticket.issueTitle}`);
    skipped++;
    continue;
  }

  const labelArgs = ticket.labels.map(l => `--label ${JSON.stringify(l)}`).join(' ');

  if (dryRun) {
    console.log(`DRY    ${ticket.issueTitle}`);
    console.log(`       → would add to ${PROJECT_OWNER}/projects/${PROJECT_NUMBER}`);
    console.log();
    created++;
    continue;
  }

  const tmpFile = join(tmpdir(), `ticket-${ticket.key}-${Date.now()}.md`);
  try {
    writeFileSync(tmpFile, ticket.body, 'utf8');
    const url = gh(`issue create --title ${JSON.stringify(ticket.issueTitle)} ${labelArgs} --body-file ${JSON.stringify(tmpFile)}`);
    const num = url.match(/\/(\d+)$/)?.[1];
    console.log(`CREATE #${num ?? '?'}  ${ticket.issueTitle}`);

    // Automatically add to the project
    try {
      ghProject(`project item-add ${PROJECT_NUMBER} --owner ${PROJECT_OWNER} --url ${JSON.stringify(url)}`);
      console.log(`       → added to project ${PROJECT_OWNER}/projects/${PROJECT_NUMBER}`);
    } catch (e) {
      console.warn(`       ⚠ Failed to add to project: ${e.message}`);
      console.warn(`         Run once: gh auth refresh -s project`);
    }

    if (num) createdNums.push(num);
    created++;
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
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