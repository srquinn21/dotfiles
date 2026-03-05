#! /usr/bin/env bash
set -e

dotfiles_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

###############################################################################
# UTILITIES
###############################################################################

function symlink_files {
  for file in $1*; do
    dotfile=$HOME/.$(basename $file)
    if [[ -e "$dotfile" && ! -L "$dotfile" ]]; then
      cp $dotfile $dotfile.bckp
    fi
    echo -e "\033[0;33mSymlinking\033[0m $file \033[0;35m-->\033[0m ~/.$(basename $file)"
    ln -nfs $file $dotfile
  done
}

function log_info {
  echo -e "\033[0;34m$1\033[0m"
}

function banner {
  echo
  echo -e "\033[0;34m=====================================================\033[0m"
  echo -e "\033[0;33m$@\033[0m"
  echo -e "\033[0;34m=====================================================\033[0m"
}

function log_done {
  echo -e "\033[0;35mDONE\033[0m"
}

function already_installed {
  echo -e "\033[0;33m$1 is already installed.\033[0m Skipping..."
}

###############################################################################
# TASKS
###############################################################################

function install_homebrew {
  banner "Installing Homebrew"

  local brew=$(which brew)
  if [ $? == 0 ]; then
    already_installed "brew"
  else
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
  fi

  banner "Updating Homebrew"
  brew update
  log_done
}

function install_packages {
  banner "Installing packages"
  if [[ $OSTYPE == darwin* ]]; then
    while read install_string; do
      local package=$(echo $install_string | awk '{ print $1 };')
      if brew ls --versions $package > /dev/null; then
        already_installed $package
      else
        brew install $install_string
      fi
    done <$dotfiles_dir/packages/osx.txt
  fi
  log_done
}

function install_vim_config {
  banner "Installing Vim Configuration"

  ln -nfs $dotfiles_dir/vim $HOME/.vim
  ln -nfs $dotfiles_dir/vim/vimrc $HOME/.vimrc

  # Update vim-plug
  vim -c 'PlugInstall'

  log_done
}

function set_zsh_to_default_shell {
  banner "Setting zsh to the default shell"

  if [[ $SHELL == *"zsh" ]]; then
    echo "Zsh is already configured"
  else
    echo "Setting zsh as the default shell"
    if [ -e /usr/local/bin/zsh ]; then
      if [ "$(cat /private/etc/shells | grep '/usr/local/bin/zsh')" != "" ]; then
        echo "Adding zsh to standard shell list"
        echo "/usr/local/bin/zsh" | sudo tee -a /private/etc/shells
      fi
      chsh -s /usr/local/bin/zsh
    else
      chsh -s /bin/zsh
    fi
  fi
  log_done
}

function install_zsh_config {
  banner "Installing zsh configuration"

  if [ ! -d $HOME/.zprezto ]; then
    git clone --recursive https://github.com/sorin-ionescu/prezto.git "$HOME/.zprezto"
  fi

  symlink_files "$dotfiles_dir/zsh/z"

  log_done
}

function install_glow_config {
  banner "Installing glow configuration"

  mkdir -p $HOME/.config/glow
  ln -nfs $dotfiles_dir/glow/onedark.json $HOME/.config/glow/onedark.json

  log_done
}

###############################################################################
#  Task Runner
###############################################################################

install_packages
install_vim_config
set_zsh_to_default_shell
install_zsh_config
install_glow_config

banner "Adding miscellaneous configurations"
symlink_files $dotfiles_dir/git/
symlink_files $dotfiles_dir/tmux/
log_done
