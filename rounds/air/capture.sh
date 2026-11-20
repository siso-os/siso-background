#!/usr/bin/env bash
set -euo pipefail
out=rounds/air
shot() {
  local name="$1" page="$2"
  local colors
  if [[ "$name" == before-* && -e "$out/$name.webp" ]]; then
    return
  fi
  for attempt in 1 2 3; do
    node tools/shoot.mjs "$page" "$out/$name.png" "${3:-1600}" "${4:-900}" --budget 9000
    colors=$(magick identify -format '%k' "$out/$name.png")
    if (( colors > 32 )); then break; fi
  done
  (( colors > 32 )) || { echo "Blank capture: $name" >&2; return 1; }
  magick "$out/$name.png" -quality 82 "$out/$name.webp"
  rm "$out/$name.png"
}
case "$1" in
  before|after|pass1)
    shot "$1-jets" "$out/probes.html?pair=jets"
    shot "$1-airliner" 'tools/probe.html?asset=air.airliner&mode=grid&hours=12,18.5,22&t=1.33'
    shot "$1-rotors" "$out/probes.html?pair=rotors"
    shot "$1-rocket" 'tools/probe.html?asset=air.rocket-ship&mode=grid&hours=12,18.5,22&p=0.35&t=4.9'
    shot "$1-missiles" 'tools/probe.html?asset=air.missile&mode=grid&hours=12,18.5,22'
    ;;
  pass2)
    for asset in jet-siso jet-enemy airliner helicopter drone rocket-ship missile; do
      local_progress=0.35
      case "$asset" in
        rocket-ship) ref=rocket-ship; local_progress=0.20;;
        missile) ref=hellfire-swarm;;
        *) ref=jet-fighter;;
      esac
      shot "pass2-$asset" "tools/probe.html?asset=air.$asset&mode=grid&hours=12,18.5,22&t=1.33&p=$local_progress&ref=refs/elements/$ref.webp"
    done
    ;;
  pass3)
    shot pass3-lineup "$out/lineup.html"
    shot pass3-small "$out/lineup.html?scale=0.3" 400 250
    shot pass3-swarm "$out/lineup.html?scale=0.3&swarm=1" 400 250
    ;;
esac
