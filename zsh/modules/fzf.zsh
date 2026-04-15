export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
export FZF_ALT_C_COMMAND='fd --type d --hidden --follow --exclude .git'

export FZF_DEFAULT_OPTS="
  --color=bg+:#3e4451,fg:#abb2bf,fg+:#e6e6e6
  --color=hl:#61afef,hl+:#61afef,info:#e5c07b,marker:#98c379
  --color=prompt:#e06c75,spinner:#c678dd,pointer:#c678dd,header:#56b6c2
  --color=border:#5c6370
"
