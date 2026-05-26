#!/bin/sh
file=$(fd --type f --hidden --no-ignore-vcs --exclude .git | fzf \
  --preview 'bat --color=always --style=plain {}')

[ -z "$file" ] && exit 0

bat --paging=always --pager=builtin --style=full --color=always "$file"
