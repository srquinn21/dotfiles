## Dotfiles

Development environment for macOS and Linux.

### What's Included

- **Shell**: zsh + [Prezto](https://github.com/sorin-ionescu/prezto) with vi keybindings
- **Editor**: [Neovim](https://neovim.io/) with native LSP, Treesitter, Telescope, lazy.nvim
- **Terminal**: [Ghostty](https://ghostty.org/) with One Double Dark theme
- **Multiplexer**: tmux with [Catppuccin](https://github.com/catppuccin/tmux) theme (via TPM)
- **Tools**: mise (node/python), ripgrep, fd, fzf, bat, glow
- **Languages**: TypeScript, Rust (rustup + rust-analyzer + clippy)

### Install

```sh
curl -fsSL https://raw.githubusercontent.com/srquinn21/dotfiles/master/install.sh | bash
```

Piped from curl, `install.sh` installs git if it's missing (Xcode command-line tools on macOS,
apt/dnf/yum on Linux), clones (or fast-forwards) this repo at `~/.dotfiles`, and runs the clone's `install.sh`.
If git is already installed:

```sh
git clone https://github.com/srquinn21/dotfiles.git ~/.dotfiles
~/.dotfiles/install.sh
```

The install clones over HTTPS and creates `~/.ssh/github`. If GitHub doesn't know
that key yet, it prints the public key. Add it at https://github.com/settings/keys and
re-run `install.sh`; the remote then switches to SSH so you can push.

### Local Overrides

Machine-specific config goes in `$HOME/.dotfiles-local`:

- `zsh/*.zsh` — sourced automatically after main modules

This repo does not install or call the local overrides. The local repo runs
this repo's `install.sh` itself, then applies its own setup.

### Git Identity

Identity is set in `git/gitconfig`. To override it on a single machine
(e.g. a work email), create `~/.gitconfig.user`:

```gitconfig
[user]
  email = you@work.com
```
