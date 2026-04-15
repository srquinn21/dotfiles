# Clear the formatting from the text in the clipboard (macOS only)
if [[ "$OSTYPE" == darwin* ]]; then
  alias clf="pbpaste | pbcopy"
fi

function set_ip {
  export EXTERNAL_IP=$({ ifconfig utun0 2>/dev/null || ifconfig en5 2>/dev/null || ifconfig en0 2>/dev/null || ip -4 addr show | awk '/inet / && !/127.0.0.1/ {print $2; exit}'; } | awk '$1 == "inet" {print $2}')
  echo -e "EXTERNAL_IP set to \033[0;36m$EXTERNAL_IP\033[0m"
}

function kill_all {
  ps aux | grep $1 | grep -v grep | awk '{print $2}' | xargs kill -9
}
