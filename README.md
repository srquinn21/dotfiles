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
git clone <repo-url> $HOME/.dotfiles
~/.dotfiles/install.sh
```

### Local Overrides

Machine-specific config goes in `$HOME/.dotfiles-local`:

- `zsh/*.zsh` — sourced automatically after main modules
- `git/user.gitconfig` — included via `~/.gitconfig.user`
- `install.sh` — runs at the end of the main install

### Configure Git Identity

Create `~/.gitconfig.user`:

```gitconfig
[user]
  name = Your Name
  email = you@example.com
```
