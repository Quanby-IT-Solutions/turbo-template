#!/usr/bin/env bash
#
# MB-2 / F-42 — prove no env file rides inside the APK.
#
# `.env` used to be declared as a Flutter asset, so every build packaged it in
# cleartext. The unit suite asserts the pubspec no longer declares it, which is
# the cause; this asserts the effect, which is what the ticket's acceptance
# criterion actually states — "when the APK is unpacked in a test, then no env
# file exists inside it".
#
# Inspects whatever APKs are already built. Skips with a clear message when
# there are none rather than invoking Gradle, so it stays runnable without the
# Android toolchain; CI that builds an APK gets the real check for free.
#
# Usage:  bash scripts/check-apk-assets.sh [path/to/app.apk ...]

set -euo pipefail

MOBILE_DIR="apps/mobile"

# Anything that would be a packaged secret. `.env` is the finding; the rest are
# the obvious neighbours, so a future "just this once" addition is caught too.
FORBIDDEN='(^|/)(\.env(\..*)?|.*\.pem|.*\.p12|.*\.jks|.*\.keystore|google-services\.json)$'

apks=("$@")
if [ ${#apks[@]} -eq 0 ]; then
  while IFS= read -r line; do apks+=("$line"); done < <(
    find "$MOBILE_DIR/build" -name "*.apk" 2>/dev/null || true
  )
fi

if [ ${#apks[@]} -eq 0 ]; then
  echo "SKIP: no APK found under $MOBILE_DIR/build."
  echo "      Build one first, then re-run:"
  echo "        cd $MOBILE_DIR && flutter build apk --debug"
  exit 0
fi

# `unzip -Z1` lists entries without extracting. Fall back to the container when
# unzip is unavailable so this works on a bare machine too.
list_entries() {
  if command -v unzip >/dev/null 2>&1; then
    unzip -Z1 "$1"
  else
    python -c "import sys,zipfile;print('\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))" "$1"
  fi
}

fail=0
for apk in "${apks[@]}"; do
  [ -f "$apk" ] || continue
  echo "==> $apk"

  entries=$(list_entries "$apk")
  offenders=$(printf '%s\n' "$entries" | grep -E "$FORBIDDEN" || true)

  # Guard against a vacuous pass: an unreadable or empty archive must not look
  # like a clean one.
  count=$(printf '%s\n' "$entries" | grep -c . || true)
  if [ "$count" -lt 10 ]; then
    echo "  FAIL could not read the archive (only $count entries)"
    fail=$((fail + 1))
    continue
  fi

  if [ -n "$offenders" ]; then
    echo "  FAIL packaged secret material found:"
    printf '%s\n' "$offenders" | sed 's/^/         /'
    fail=$((fail + 1))
  else
    echo "  ok   no env file or key material among $count entries"
  fi
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "$fail APK(s) carry files that must not ship. See MB-2 / F-42:"
  echo "config belongs in --dart-define, secrets belong on the server."
  echo
  echo "If the APK predates the fix it is simply stale — build/ is gitignored and"
  echo "is not rebuilt automatically. Confirm against a fresh artifact before"
  echo "treating this as a regression:"
  echo "    cd $MOBILE_DIR && flutter clean && flutter build apk --debug"
  exit 1
fi

echo
echo "All inspected APKs are clean."
