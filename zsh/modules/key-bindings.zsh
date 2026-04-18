# Map 'jj' to ESC when in insert mode
bindkey -M viins 'jj' vi-cmd-mode

# Fix backspace not working after returning to insert mode
bindkey -M viins '^?' backward-delete-char
bindkey -M viins '^H' backward-delete-char

# History substring search (type partial command, then arrow/j/k to cycle)
bindkey -M vicmd 'k' history-substring-search-up
bindkey -M vicmd 'j' history-substring-search-down
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# Edit command in vim
autoload -Uz edit-command-line
zle -N edit-command-line
bindkey -M vicmd v edit-command-line
