#!/usr/bin/env bash
# ============================================================
# Vercels "Ignored Build Step": byg kun når siden kan have ændret sig
#
# Exit 0 springer bygget over, exit 1 bygger (Vercels regel). Hver
# deployment af alius.dk gemmer cirka 68 MB funktioner, og 22. oktober
# 2026 havde 44 deployments på to dage bragt holdet op på 75 procent af
# gratisgrænsen på 10 GB. Mange af dem ændrede kun scripts, workflows,
# dokumentation eller tests, som kører i GitHub Actions, ikke på Vercel.
#
# Sammenlignes med VERCEL_GIT_PREVIOUS_SHA, den senest deployede commit,
# ikke med HEAD^: pushes flere commits på én gang, bygger Vercel kun den
# sidste, og en ændring i siden i en af de tidligere må ikke gå tabt.
#
# I TVIVL BYGGES DER. Mangler variablen, er den forrige commit ikke i
# Vercels klon (dybde 10), eller fejler git, er svaret 1.
# ============================================================

PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
# Kun til test lokalt: hvilken commit der sammenlignes med. Vercel sætter den ikke.
TIL="${VERCEL_IGNORE_TIL:-HEAD}"
if [ -z "$PREV" ]; then
  echo "Ingen forrige deployment kendt. Bygger."
  exit 1
fi
if ! git cat-file -e "$PREV^{commit}" 2>/dev/null; then
  echo "Forrige deployede commit $PREV er ikke i klonen. Bygger."
  exit 1
fi

# Filer der ikke indgår i siden. Alt andet udløser et byg.
git diff --quiet "$PREV" "$TIL" -- . \
  ':(exclude)scripts/' \
  ':(exclude).github/' \
  ':(exclude)docs/' \
  ':(exclude)prisma/migrations/' \
  ':(exclude)prisma/_archive/' \
  ':(exclude,glob)**/*.test.ts' \
  ':(exclude)CLAUDE.md' \
  ':(exclude)AGENTS.md' \
  ':(exclude)README.md' \
  ':(exclude).gitignore'
rc=$?
if [ $rc -eq 0 ]; then
  echo "Kun scripts, workflows, dokumentation eller tests er ændret siden $PREV. Springer bygget over."
  exit 0
fi
if [ $rc -ne 1 ]; then
  echo "git diff fejlede ($rc). Bygger."
fi
echo "Siden kan have ændret sig siden $PREV. Bygger."
exit 1
