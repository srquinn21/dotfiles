" ========================================
" Vim plugin configuration
" ========================================

" Plugins are split up by category into smaller files
" This reduces churn and makes it easier to fork. See
" ~/.vim/plugins/ to edit them:

call plug#begin('~/.vim/plugged')
runtime appearance.plugin
runtime project.plugin
runtime rust.plugin
call plug#end()
