#!/usr/bin/env bash
# Build a tagged version into builds/<tag>/, where the UI will find it.
#
#   i.e:  ./scripts/build-version.sh v1.0

set -euo pipefail

tag="${1:?usage: build-version.sh <git tag>}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$root/builds/$tag"
worktree="$root/.builds-src/$tag"

if [ -x "$out/chess_uci" ]; then
    echo "$tag already built at $out/chess_uci"
    exit 0
fi

git -C "$root" rev-parse "$tag" > /dev/null 2>&1 || { echo "no such tag: $tag"; exit 1; }

rm -rf "$worktree"
git -C "$root" worktree add --force --detach "$worktree" "$tag" > /dev/null

cmake -S "$worktree" -B "$worktree/build" -DCMAKE_BUILD_TYPE=Release > /dev/null
cmake --build "$worktree/build" -j > /dev/null

mkdir -p "$out"
cp "$worktree/build/bin/chess_uci" "$out/chess_uci"

git -C "$root" worktree remove --force "$worktree" > /dev/null
echo "built $tag -> $out/chess_uci"
