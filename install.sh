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
# Nerd Font (MesloLGS NF)
###############################################################################

banner "Installing Nerd Font (MesloLGS NF)"

if [[ "$(uname)" == "Darwin" ]]; then
  if ! brew list --cask font-meslo-lg-nerd-font &>/dev/null; then
    brew install --cask font-meslo-lg-nerd-font
  else
    already_installed "MesloLGS Nerd Font"
  fi
else
  font_dir="$HOME/.local/share/fonts"
  if ! fc-list | grep -qi "MesloLGS"; then
    mkdir -p "$font_dir"
    nf_version="v3.3.0"
    nf_url="https://github.com/ryanoasis/nerd-fonts/releases/download/${nf_version}/Meslo.tar.xz"
    echo "Downloading MesloLGS Nerd Font ${nf_version}..."
    curl -fsSL "$nf_url" | tar -xJ -C "$font_dir"
    fc-cache -f "$font_dir"
  else
    already_installed "MesloLGS Nerd Font"
  fi
fi

log_done

###############################################################################
# Shell
###############################################################################

banner "Configuring zsh"

# Log in with the system zsh, never Homebrew's: if Homebrew's zsh goes
# missing, a login shell pointing at it locks you out of SSH.
# ~/.zprofile hands interactive logins off to Homebrew's zsh instead.
if [[ "$(uname)" == "Darwin" ]]; then
  login_zsh=/bin/zsh
  current_shell="$(dscl . -read "$HOME" UserShell | awk '{print $2}')"
else
  login_zsh=/usr/bin/zsh
  current_shell="$(getent passwd "$USER" | cut -d: -f7)"

  # The one exception to Homebrew-first: the login shell has to come from
  # the system package manager so it survives Homebrew breaking. Most
  # distros don't ship zsh by default.
  if [[ ! -x $login_zsh ]]; then
    if command -v apt-get &>/dev/null; then
      sudo apt-get update && sudo apt-get install -y zsh
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y zsh
    fi
  fi
fi

if [[ ! -x $login_zsh ]]; then
  echo "warning: no system zsh at $login_zsh -- leaving the login shell as $current_shell."
  echo "         Install zsh with your system package manager, then re-run to log in with zsh."
elif [[ $current_shell != "$login_zsh" ]]; then
  # sudo because cloud users like Lightsail's `ubuntu` have no password
  sudo chsh -s "$login_zsh" "$USER"
else
  already_installed "zsh (default shell)"
fi

ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
if [[ ! -d "$ZINIT_HOME" ]]; then
  mkdir -p "$(dirname $ZINIT_HOME)"
  git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
else
  git -C "$ZINIT_HOME" pull
fi

symlink "$dotfiles_dir/zsh/zshrc" "$HOME/.zshrc"
symlink "$dotfiles_dir/zsh/zprofile" "$HOME/.zprofile"
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
elif [[ "$(uname)" == "Darwin" ]]; then
  # Re-export latest terminfo from local Ghostty install. Mac only: on other
  # hosts it would just echo back our own copy and dirty the repo.
  infocmp -x xterm-ghostty > "$dotfiles_dir/ghostty/xterm-ghostty.terminfo"
  already_installed "xterm-ghostty terminfo (re-exported)"
else
  already_installed "xterm-ghostty terminfo"
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
if tmux list-sessions &>/dev/null; then
  echo "tmux is running — skipping TPM install (use prefix + I to install plugins)"
elif TERM=xterm-256color tmux start-server \; kill-server 2>/dev/null; then
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
symlink "$dotfiles_dir/starship/starship.toml" "$HOME/.config/starship.toml"
symlink "$dotfiles_dir/glow" "$HOME/.config/glow"
symlink "$dotfiles_dir/bat" "$HOME/.config/bat"
symlink "$dotfiles_dir/btop" "$HOME/.config/btop"
symlink "$dotfiles_dir/mise" "$HOME/.config/mise"
symlink "$dotfiles_dir/prettier/.prettierrc" "$HOME/.prettierrc"
symlink "$dotfiles_dir/eslint/eslint.config.mjs" "$HOME/eslint.config.mjs"
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
# Node globals
###############################################################################

banner "Installing Node globals"

if command -v npm &>/dev/null; then
  npm ls -g prettier &>/dev/null || npm install -g prettier
  npm ls -g eslint &>/dev/null || npm install -g eslint
else
  echo "npm not found — skipping global installs (run 'mise install' first)"
fi
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
