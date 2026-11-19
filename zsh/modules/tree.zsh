# tree isn't installed on Linux (mise has no package for it); eza does the same job.
if command -v tree &>/dev/null; then
  alias tree="tree -C -I 'node_modules|build|dist'"
else
  alias tree="eza --tree -I 'node_modules|build|dist'"
fi
