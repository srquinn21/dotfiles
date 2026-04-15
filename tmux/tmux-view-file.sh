#!/bin/sh
FILE=$(fd --type f --hidden --exclude .git | fzf --preview 'bat --color=always --style=plain {}')
[ -n "$FILE" ] || exit 0
case "$FILE" in
  *.md|*.markdown) glow -s ~/.config/glow/onedark.json -p "$FILE" ;;
  *) bat --paging=always --style=full --color=always "$FILE" ;;
esac
