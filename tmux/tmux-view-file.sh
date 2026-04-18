#!/bin/sh
fd --type f --hidden --exclude .git | fzf \
  --preview 'bat --color=always --style=plain {}' \
  --bind 'enter:execute(
    case {} in
      *.md|*.markdown) glow -s ~/.config/glow/onedark.json -p {} ;;
      *) bat --paging=always --style=full --color=always {} ;;
    esac
  )+abort'
