#!/usr/bin/env bash
# Fail when a tracked file carries an internal finding or ticket id.
# Commit subjects are not scanned. Two exclusions follow the pattern: a
# closed allow-list of one-off literals, and the shape of public advisory
# ids, which are references anyone can look up rather than internal ones.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

pattern='\b(RF[0-9]+|[A-Z]{1,4}-[0-9]+)\b'
allow='\b(UTF-8|BID-4|NOTE-1|OFS-4|BYZ-38)\b'
# CVE-2026-112366 and friends match [A-Z]{1,4}-[0-9]+ on their prefix, so
# exclude the id shapes instead of listing each advisory as it comes up.
public='\b(CVE-[0-9]{4,}-[0-9]+|GHSA([-][0-9a-z]{4}){3})\b'

mapfile -d '' files < <(git ls-files -z -- ':!pnpm-lock.yaml' ':!scripts/check-public-ids.sh')

if [ "${#files[@]}" -eq 0 ]; then
	exit 0
fi

# grep exits 1 when nothing matches. That is a clean tree.
matches="$(grep -nIE "$pattern" "${files[@]}" || true)"

if [ -z "$matches" ]; then
	exit 0
fi

status=0
while IFS= read -r hit; do
	[ -z "$hit" ] && continue
	file="${hit%%:*}"
	rest="${hit#*:}"
	line="${rest%%:*}"
	content="${rest#*:}"
	stripped="$(printf '%s' "$content" | sed -E "s/$public//g; s/$allow//g")"
	if printf '%s\n' "$stripped" | grep -qIE "$pattern"; then
		printf '%s:%s\n' "$file" "$line"
		status=1
	fi
done <<< "$matches"

exit "$status"
