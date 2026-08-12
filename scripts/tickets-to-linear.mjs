#!/usr/bin/env node
/**
 * tickets-to-linear.mjs
 * Imports tickets from a TICKETS.md file into Linear as issues.
 *
 * Usage:
 *   LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs [file] --team <TEAM_KEY> [--dry-run] [--state <name>]
 *
 * Example:
 *   LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md --team BID
 *   LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md --team BID --dry-run
 *
 * Notes:
 *   - Idempotent: skips tickets whose "[KEY] Title" already exists in the team.
 *   - Creates missing labels automatically (epic + `ticket` + also-touches).
 *   - Places new issues in the team's Triage state by default (override with --state).
 */
import { readFileSync } from 'node:fs';

const API = 'https://api.linear.app/graphql';
const KEY = process.env.LINEAR_API_KEY;

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--') && !isFlagValue(a)) ?? 'docs/TICKETS.md';
const dryRun = args.includes('--dry-run');

const teamIdx = args.indexOf('--team');
const stateIdx = args.indexOf('--state');
const TEAM_KEY = teamIdx !== -1 ? args[teamIdx + 1] : null;
const STATE_NAME = stateIdx !== -1 ? args[stateIdx + 1] : 'Triage';

function isFlagValue(a) {
  const i = args.indexOf(a);
  return i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--dry-run';
}

if (!KEY) {
  console.error(`
Missing LINEAR_API_KEY.

Create one: Linear → Settings → Security & access → Personal API keys → New API key
Then:  export LINEAR_API_KEY=lin_api_xxxxx
`);
  process.exit(1);
}

if (!TEAM_KEY || TEAM_KEY.startsWith('--')) {
  console.error(`
Missing required --team flag.

Usage:
  LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs [file] --team <TEAM_KEY> [--dry-run] [--state <name>]

Example:
  LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md --team BID
`);
  process.exit(1);
}

// --- GraphQL helper ---
async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: KEY },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors.map(e => e.message).join('; '));
  }
  return json.data;
}

// --- Read + parse file (same format as tickets-to-issues.mjs) ---
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
  const description = `> Generated from \`${filePath}\`\n\n${block}`;
  return { key, title, epic, alsoTouches, labels, description, issueTitle };
}

const tickets = blocks.map(parseTicket).filter(Boolean);

if (tickets.length === 0) {
  console.error(`No tickets parsed from ${filePath}. Check format: **Title:** [KEY] Name`);
  process.exit(1);
}

console.log(`Found ${tickets.length} ticket(s) in ${filePath}`);

// --- Resolve team, states, labels ---
const teamData = await gql(
  `query Teams { teams(first: 100) { nodes { id key name } } }`
);
const team = teamData.teams.nodes.find(t => t.key.toUpperCase() === TEAM_KEY.toUpperCase());

if (!team) {
  console.error(`Team with key "${TEAM_KEY}" not found. Available: ${teamData.teams.nodes.map(t => t.key).join(', ')}`);
  process.exit(1);
}

console.log(`Target team: ${team.name} (${team.key})\n`);

const meta = await gql(
  `query TeamMeta($id: String!) {
     team(id: $id) {
       states(first: 100) { nodes { id name type } }
       labels(first: 250) { nodes { id name } }
     }
   }`,
  { id: team.id }
);

const states = meta.team.states.nodes;
const targetState =
  states.find(s => s.name.toLowerCase() === STATE_NAME.toLowerCase()) ??
  states.find(s => s.type === 'triage') ??
  states.find(s => s.type === 'backlog');

if (!targetState) {
  console.error(`State "${STATE_NAME}" not found. Available: ${states.map(s => s.name).join(', ')}`);
  process.exit(1);
}

const labelMap = new Map(meta.team.labels.nodes.map(l => [l.name.toLowerCase(), l.id]));

// --- Fetch existing issue titles for idempotency ---
const existing = await gql(
  `query Existing($teamId: ID!) {
     issues(first: 250, filter: { team: { id: { eq: $teamId } } }) { nodes { title } }
   }`,
  { teamId: team.id }
);
const existingTitles = new Set(existing.issues.nodes.map(i => i.title));

// --- Ensure labels exist ---
const allLabels = [...new Set(tickets.flatMap(t => t.labels))];

if (dryRun) {
  console.log('Labels that would be created/ensured:');
  for (const l of allLabels) {
    console.log(`  ${l}${labelMap.has(l.toLowerCase()) ? ' (exists)' : ' (new)'}`);
  }
  console.log();
} else {
  for (const label of allLabels) {
    if (labelMap.has(label.toLowerCase())) continue;
    try {
      const created = await gql(
        `mutation CreateLabel($input: IssueLabelCreateInput!) {
           issueLabelCreate(input: $input) { success issueLabel { id name } }
         }`,
        { input: { name: label, teamId: team.id, color: '#0075ca' } }
      );
      const made = created.issueLabelCreate.issueLabel;
      labelMap.set(made.name.toLowerCase(), made.id);
      console.log(`LABEL  + ${made.name}`);
    } catch (e) {
      console.warn(`LABEL  ! could not create "${label}": ${e.message}`);
    }
  }
  if (allLabels.length) console.log();
}

// --- Process tickets ---
let created = 0;
let skipped = 0;
const createdIssues = [];

for (const ticket of tickets) {
  if (existingTitles.has(ticket.issueTitle)) {
    console.log(`SKIP   ${ticket.issueTitle}`);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`DRY    ${ticket.issueTitle}`);
    console.log(`       → state: ${targetState.name} · labels: ${ticket.labels.join(', ')}`);
    created++;
    continue;
  }

  const labelIds = ticket.labels
    .map(l => labelMap.get(l.toLowerCase()))
    .filter(Boolean);

  try {
    const result = await gql(
      `mutation CreateIssue($input: IssueCreateInput!) {
         issueCreate(input: $input) {
           success
           issue { id identifier title url branchName }
         }
       }`,
      {
        input: {
          teamId: team.id,
          title: ticket.issueTitle,
          description: ticket.description,
          stateId: targetState.id,
          labelIds,
        },
      }
    );

    const issue = result.issueCreate.issue;
    console.log(`CREATE ${issue.identifier}  ${issue.title}`);
    createdIssues.push(issue);
  } catch (e) {
    console.error(`ERROR  ${ticket.issueTitle}: ${e.message}`);
  }
}

// --- Summary ---
console.log(`\nSummary: ${created} created, ${skipped} skipped.`);

if (!dryRun && createdIssues.length > 0) {
  console.log('\nPer-ticket workflow:');
  for (const issue of createdIssues) {
    console.log(`  ${issue.identifier}  ${issue.url}`);
    console.log(`  git checkout -b ${issue.branchName}`);
    console.log(`  git push -u origin HEAD`);
    console.log();
  }
  console.log('Pushing the branch triggers your auto-draft-PR Action.');
  console.log('Linear links the PR from the branch name and moves the issue automatically.');
} else if (dryRun) {
  console.log('\nRe-run without --dry-run to create the issues in Linear.');
}
