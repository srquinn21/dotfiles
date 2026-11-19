#!/usr/bin/env bash
#
# Install from a clone:
#   ~/.dotfiles/install.sh
#
# Or on a machine with nothing on it yet (installs git, clones, then runs the
# clone's copy of this script):
#   curl -fsSL https://raw.githubusercontent.com/srquinn21/dotfiles/master/install.sh | bash
#
# Safe to re-run. Every step checks what is already in place.
set -e

###############################################################################
# Bootstrap (only when piped from curl)
###############################################################################

# Piped into bash there is no file behind this script, so there is no repo yet.
# Make sure git and a current clone exist, then hand off to the clone's copy.
# This is a function called on the next line, so a partial download runs
# nothing and the rest of this piped copy is never read.
bootstrap() {
  local repo_url="https://github.com/srquinn21/dotfiles.git"
  local target="$HOME/.dotfiles"

  if ! command -v git &>/dev/null; then
    echo "Installing git"
    if [[ "$(uname)" == "Darwin" ]]; then
      # Opens a GUI installer; wait for it to finish.
      xcode-select --install || true
      until xcode-select -p &>/dev/null; do sleep 5; done
    elif command -v apt-get &>/dev/null; then
      sudo apt-get update && sudo apt-get install -y git
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y git
    elif command -v yum &>/dev/null; then
      sudo yum install -y git
    else
      echo "No supported package manager found. Install git and re-run." >&2
      exit 1
    fi
  fi

  if [[ ! -d "$target/.git" ]]; then
    git clone "$repo_url" "$target"
  elif [[ -z "$(git -C "$target" status --porcelain)" ]]; then
    echo "Updating $target"
    git -C "$target" pull --ff-only || echo "Could not fast-forward $target. Using it as-is."
  else
    echo "$target has local changes. Using it as-is."
  fi

  # stdin is this script; give the real install the terminal for its prompts,
  # or nothing when there is no terminal (e.g. ssh without -t).
  if { : </dev/tty; } 2>/dev/null; then
    exec "$target/install.sh" </dev/tty
  else
    exec "$target/install.sh" </dev/null
  fi
}
[[ -f "${BASH_SOURCE[0]:-}" ]] || bootstrap

dotfiles_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Some remote shells (e.g. DevSpaces over ssh) don't set USER.
export USER="${USER:-$(id -un)}"

# Without a terminal (ssh without -t, CI), nothing may prompt: Homebrew skips
# its "press RETURN", and new SSH keys get no passphrase.
if [[ -t 0 ]]; then
  interactive=true
else
  interactive=false
  export NONINTERACTIVE=1
fi

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

# A real directory at the target (e.g. one a machine image created) would get
# the link put inside it, so move it aside first.
symlink() {
  log_info "$1" "$2"
  if [[ -d "$2" && ! -L "$2" ]]; then
    local backup="$2.bak.$(date +%Y%m%d%H%M%S)"
    echo "Moving existing directory $2 to $backup"
    mv "$2" "$backup"
  fi
  ln -nfs "$1" "$2"
}

# sudo that never prompts without a terminal. Fails if sudo isn't allowed.
can_sudo() {
  command -v sudo &>/dev/null || return 1
  sudo -n true 2>/dev/null && return 0
  $interactive && sudo -v
}

is_mac() { [[ "$(uname)" == "Darwin" ]]; }

###############################################################################
# System prerequisites (Linux)
###############################################################################

# A C toolchain (Rust's linker), zsh and tmux come from the system package
# manager, so the login shell survives anything else breaking. Node's arm64
# Linux builds (installed by mise) also need libatomic, which minimal images
# leave out. Machines without root (e.g. DevSpaces) are expected to ship these.
has_libatomic() {
  [[ "$(uname -m)" != aarch64 ]] && return 0
  { /sbin/ldconfig -p 2>/dev/null || ldconfig -p 2>/dev/null; } | grep -q 'libatomic\.so\.1'
}
if ! is_mac && { ! command -v cc &>/dev/null || [[ ! -x /usr/bin/zsh ]] || ! command -v tmux &>/dev/null || ! has_libatomic; }; then
  banner "Installing system prerequisites"

  if ! can_sudo; then
    echo "warning: no sudo here -- skipping. Missing system packages stay missing"
    echo "         (need a C toolchain, zsh, tmux, and libatomic on arm64)."
  elif command -v apt-get &>/dev/null; then
    sudo apt-get update
    sudo apt-get install -y build-essential procps curl file git zsh tmux libatomic1
  elif command -v dnf &>/dev/null; then
    # curl is left out: Amazon Linux 2023 ships curl-minimal, and installing
    # the full curl package conflicts with it. This script needs curl already.
    # Group ID differs between Fedora and Amazon Linux 2023; try both.
    sudo dnf group install -y development-tools || sudo dnf group install -y "Development Tools"
    sudo dnf install -y procps-ng file git zsh tmux libatomic
  elif command -v yum &>/dev/null; then
    # Amazon Linux 2
    sudo yum groupinstall -y "Development Tools"
    sudo yum install -y procps-ng curl file git zsh tmux libatomic
  else
    echo "warning: unknown package manager -- install a C toolchain, zsh and tmux yourself"
  fi

  log_done
fi

###############################################################################
# Packages
###############################################################################

# macOS: Homebrew, from the Brewfile.
# Linux: mise, from the os = ["linux"] entries in mise/config.toml. Homebrew
# on Linux needs root to create /home/linuxbrew, which machines like DevSpaces
# don't give you. mise installs everything under $HOME.
if is_mac; then
  banner "Installing Homebrew"

  if ! command -v brew &>/dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  eval "$(/opt/homebrew/bin/brew shellenv)"
  log_done

  banner "Installing packages"
  brew bundle --file="$dotfiles_dir/Brewfile"
  log_done
else
  banner "Installing mise"

  export PATH="$HOME/.local/bin:$PATH"
  if ! command -v mise &>/dev/null; then
    curl -fsSL https://mise.run | sh
  else
    # A machine image's mise can be months old, and old mise has stale
    # download rules for some tools. Fails if a package manager owns mise.
    mise self-update --yes || echo "warning: could not update mise ($(mise --version)). Some tools may fail to install."
  fi
  log_done
fi

###############################################################################
# Nerd Font (MesloLGS NF)
###############################################################################

banner "Installing Nerd Font (MesloLGS NF)"

if is_mac; then
  if ! brew list --cask font-meslo-lg-nerd-font &>/dev/null; then
    brew install --cask font-meslo-lg-nerd-font
  else
    already_installed "MesloLGS Nerd Font"
  fi
elif ! command -v fc-cache &>/dev/null; then
  # No fontconfig means a headless box (e.g. a remote server). Fonts are
  # rendered by the terminal on the machine you connect from, not here.
  echo "fontconfig not found (headless machine?). Skipping font install."
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
fi

if [[ ! -x $login_zsh ]]; then
  echo "warning: no system zsh at $login_zsh -- leaving the login shell as $current_shell."
  echo "         Install zsh with your system package manager, then re-run to log in with zsh."
elif [[ ! $current_shell -ef $login_zsh ]]; then
  # -ef: /bin/zsh and /usr/bin/zsh are the same file where /bin links to /usr/bin
  # sudo because cloud users like Lightsail's `ubuntu` have no password
  if can_sudo; then
    sudo chsh -s "$login_zsh" "$USER"
  else
    echo "warning: no sudo here -- leaving the login shell as $current_shell."
  fi
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
if command -v tmux &>/dev/null; then
  # Install plugins against a throwaway tmux server on its own socket. A
  # server that's already running may predate ~/.tmux.conf, and TPM would
  # read its stale settings and install nothing.
  tpm_tmpdir="$(mktemp -d)"
  env -u TMUX TMUX_TMPDIR="$tpm_tmpdir" TERM=xterm-256color \
    "$HOME/.tmux/plugins/tpm/bin/install_plugins"
  env -u TMUX TMUX_TMPDIR="$tpm_tmpdir" tmux kill-server 2>/dev/null || true
  rm -rf "$tpm_tmpdir"

  # tmux only reads its config at server start, so apply it to a running one
  if tmux list-sessions &>/dev/null; then
    tmux source-file "$HOME/.tmux.conf"
    echo "Reloaded config into the running tmux server"
  fi
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
symlink "$dotfiles_dir/fd" "$HOME/.config/fd"
symlink "$dotfiles_dir/btop" "$HOME/.config/btop"
# Only config.toml: herdr keeps sockets and session state next to it.
mkdir -p "$HOME/.config/herdr"
symlink "$dotfiles_dir/herdr/config.toml" "$HOME/.config/herdr/config.toml"
symlink "$dotfiles_dir/mise" "$HOME/.config/mise"
symlink "$dotfiles_dir/prettier/.prettierrc" "$HOME/.prettierrc"
symlink "$dotfiles_dir/eslint/eslint.config.mjs" "$HOME/eslint.config.mjs"
log_done

###############################################################################
# Rust
###############################################################################

banner "Configuring Rust"

[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"
if command -v rustup &>/dev/null; then
  already_installed "rustup"
elif command -v rustup-init &>/dev/null; then
  # From Homebrew
  rustup-init -y --no-modify-path
  source "$HOME/.cargo/env"
else
  curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path
  source "$HOME/.cargo/env"
fi

rustup component add clippy rust-analyzer 2>/dev/null

log_done

###############################################################################
# mise tools
###############################################################################

# Runtimes (node, python) everywhere, plus the Linux CLI tools.
banner "Installing mise tools"

mise trust --quiet "$dotfiles_dir/mise/config.toml"
mise install --yes
export PATH="${MISE_DATA_DIR:-$HOME/.local/share/mise}/shims:$PATH"
log_done

###############################################################################
# Node globals
###############################################################################

banner "Installing Node globals"

if command -v npm &>/dev/null; then
  npm ls -g prettier &>/dev/null || npm install -g prettier
  npm ls -g eslint &>/dev/null || npm install -g eslint
else
  echo "npm not found -- skipping global installs"
fi
log_done

###############################################################################
# GitHub SSH key
###############################################################################

# This repo is cloned over HTTPS, but pushing needs an SSH key registered with
# GitHub. Creates ~/.ssh/github if missing and adds a Host entry. If GitHub
# knows the key, the remote switches to SSH. Otherwise the public key is
# printed so it can be registered; re-run this script afterwards.
banner "Setting up GitHub SSH key"

github_key="$HOME/.ssh/github"
ssh_config="$HOME/.ssh/config"
dotfiles_ssh_url="git@github.com:srquinn21/dotfiles.git"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [ ! -f "$github_key" ]; then
  echo "Creating $github_key (press Enter twice for no passphrase)"
  if $interactive; then
    ssh-keygen -t ed25519 -C "$(whoami)@$(hostname -s)" -f "$github_key"
  else
    ssh-keygen -t ed25519 -C "$(whoami)@$(hostname -s)" -f "$github_key" -N ""
  fi
fi

if ! grep -q -E '^Host[[:space:]]+github\.com([[:space:]]|$)' "$ssh_config" 2>/dev/null; then
  github_host_block='Host github.com
  IdentityFile ~/.ssh/github
  IdentitiesOnly yes
  AddKeysToAgent yes
  IgnoreUnknown UseKeychain
  UseKeychain yes
'
  touch "$ssh_config"
  chmod 600 "$ssh_config"
  # Keep the entry outside the WSSH-managed block (Amazon machines), which WSSH rewrites.
  if grep -q '### Start of WSSH Config Block ###' "$ssh_config"; then
    GITHUB_HOST_BLOCK="$github_host_block" awk '
      /### Start of WSSH Config Block ###/ && !done { print ENVIRON["GITHUB_HOST_BLOCK"]; done = 1 }
      { print }
    ' "$ssh_config" > "$ssh_config.tmp" && mv "$ssh_config.tmp" "$ssh_config"
  else
    printf '\n%s\n' "$github_host_block" >> "$ssh_config"
  fi
fi

# Trust GitHub's published host keys, fetched over HTTPS, so the first SSH
# connection doesn't prompt. (StrictHostKeyChecking=accept-new would do this
# too, but needs OpenSSH 7.6+, and Amazon Linux 2 ships 7.4.)
known_hosts="$HOME/.ssh/known_hosts"
touch "$known_hosts"
chmod 600 "$known_hosts"
if ! ssh-keygen -F github.com -f "$known_hosts" &>/dev/null; then
  curl -fsSL https://api.github.com/meta \
    | grep -oE '"(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa) [A-Za-z0-9+/=]+"' \
    | tr -d '"' | sed 's/^/github.com /' >> "$known_hosts" \
    || echo "Could not fetch GitHub's host keys; the check below may fail."
fi

ssh_out="$(ssh -F /dev/null -T -i "$github_key" -o IdentitiesOnly=yes -o PasswordAuthentication=no -o BatchMode=yes -o UserKnownHostsFile="$known_hosts" git@github.com 2>&1 || true)"
if grep -q "successfully authenticated" <<<"$ssh_out"; then
  git -C "$dotfiles_dir" remote set-url origin "$dotfiles_ssh_url"
  echo "GitHub SSH key is registered. $dotfiles_dir now pushes over SSH."
else
  echo
  echo "GitHub does not know this SSH key yet. Pushing is disabled until it does."
  echo "  1. Add this key at https://github.com/settings/keys :"
  echo
  cat "$github_key.pub"
  echo
  echo "  2. Re-run: $dotfiles_dir/install.sh"
fi
log_done

banner "Install Complete"
echo "Restart your shell to apply changes."
