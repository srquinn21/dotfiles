#!/usr/bin/env bash
set -e

dotfiles_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

###############################################################################
# Utilities
###############################################################################

banner() {
  echo
  echo -e "\033[0;34m=====================================================\033[0m"
  echo -e "\033[0;33m$@\033[0m"
  echo -e "\033[0;34m=====================================================\033[0m"
}

log_info() {
  echo -e "\033[0;33mSymlinking\033[0m $1 \033[0;35m-->\033[0m $2"
}

log_done() {
  echo -e "\033[0;35mDONE\033[0m"
}

already_installed() {
  echo -e "\033[0;33m$1 is already installed.\033[0m Skipping..."
}

symlink() {
  log_info "$1" "$2"
  ln -nfs "$1" "$2"
}

###############################################################################
# Homebrew
###############################################################################

banner "Installing Homebrew"

if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if [[ -f /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f /home/linuxbrew/.linuxbrew/bin/brew ]]; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

log_done

banner "Installing packages"
brew bundle --file="$dotfiles_dir/Brewfile"
log_done

###############################################################################
# Shell
###############################################################################

banner "Configuring zsh"

if [[ $SHELL != *"zsh" ]]; then
  chsh -s "$(which zsh)"
else
  already_installed "zsh (default shell)"
fi

if [[ ! -d $HOME/.zprezto ]]; then
  git clone --recursive https://github.com/sorin-ionescu/prezto.git "$HOME/.zprezto"
else
  git -C "$HOME/.zprezto" pull --recurse-submodules
fi

symlink "$dotfiles_dir/zsh/zshrc" "$HOME/.zshrc"
symlink "$dotfiles_dir/zsh/zpreztorc" "$HOME/.zpreztorc"
log_done

###############################################################################
# Git
###############################################################################

banner "Configuring git"

symlink "$dotfiles_dir/git/gitconfig" "$HOME/.gitconfig"
symlink "$dotfiles_dir/git/gitignore" "$HOME/.gitignore"
log_done

###############################################################################
# Ghostty terminfo
###############################################################################

banner "Configuring Ghostty terminfo"

if ! infocmp xterm-ghostty &>/dev/null; then
  tic -x -o "$HOME/.terminfo" "$dotfiles_dir/ghostty/xterm-ghostty.terminfo"
  echo "Installed xterm-ghostty terminfo"
else
  # Re-export latest terminfo from local Ghostty install
  infocmp -x xterm-ghostty > "$dotfiles_dir/ghostty/xterm-ghostty.terminfo"
  already_installed "xterm-ghostty terminfo (re-exported)"
fi
log_done

###############################################################################
# Tmux
###############################################################################

banner "Configuring tmux"

if [[ ! -d $HOME/.tmux/plugins/tpm ]]; then
  git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
else
  git -C "$HOME/.tmux/plugins/tpm" pull
fi

symlink "$dotfiles_dir/tmux/tmux.conf" "$HOME/.tmux.conf"
if TERM=xterm-256color tmux start-server \; kill-server 2>/dev/null; then
  TERM=xterm-256color "$HOME/.tmux/plugins/tpm/bin/install_plugins"
else
  echo "tmux unavailable — TPM plugins will install on first tmux launch (prefix + I)"
fi
log_done

###############################################################################
# Neovim
###############################################################################

banner "Configuring Neovim"

mkdir -p "$HOME/.config"
symlink "$dotfiles_dir/nvim" "$HOME/.config/nvim"
log_done

###############################################################################
# Tools
###############################################################################

banner "Configuring tools"

symlink "$dotfiles_dir/ghostty" "$HOME/.config/ghostty"
symlink "$dotfiles_dir/glow" "$HOME/.config/glow"
symlink "$dotfiles_dir/bat" "$HOME/.config/bat"
symlink "$dotfiles_dir/mise" "$HOME/.config/mise"
log_done

###############################################################################
# Rust
###############################################################################

banner "Configuring Rust"

if ! command -v rustup &>/dev/null; then
  rustup-init -y --no-modify-path
  source "$HOME/.cargo/env"
else
  already_installed "rustup"
fi

rustup component add clippy rust-analyzer 2>/dev/null

log_done

###############################################################################
# Local overrides
###############################################################################

if [[ -x "$HOME/.dotfiles-local/install.sh" ]]; then
  banner "Running local overrides"
  "$HOME/.dotfiles-local/install.sh"
  log_done
fi

banner "Install Complete"
echo "Restart your shell to apply changes."
