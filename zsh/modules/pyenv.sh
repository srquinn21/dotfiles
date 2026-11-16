# Load pyenv automatically by appending
# the following to
# your shell's login startup file (for login shells)
# and your shell's interactive startup file (for interactive shells) :

export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - -h)"

# Restart your shell for the changes to take effect.
