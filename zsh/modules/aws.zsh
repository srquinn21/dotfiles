if command -v aws_completer &>/dev/null; then
  autoload bashcompinit && bashcompinit
  complete -C "$(command -v aws_completer)" aws
fi

