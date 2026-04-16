#
# ls aliases (from Prezto's utility module)
#

if [[ "$OSTYPE" == darwin* || "$OSTYPE" == *bsd* ]]; then
  alias ls='ls -G'
else
  alias ls='ls --color=auto --group-directories-first'
fi

alias l='ls -1A'         # One column, hidden files
alias ll='ls -lh'        # Long, human-readable sizes
alias lr='ll -R'         # Long, recursive
alias la='ll -A'         # Long, hidden files
alias lm='la | "$PAGER"' # Long, hidden files, paged
alias lk='ll -Sr'        # Sorted by size, largest last
alias lt='ll -tr'        # Sorted by date, most recent last
alias lc='lt -c'         # Sorted by change time
alias lu='lt -u'         # Sorted by access time
