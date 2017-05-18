if [[ $OSTYPE == "linux-gnu" ]]; then
  export DOCKER_HOST=tcp://127.0.0.1:4243
fi

alias dka='docker kill $(docker ps -aq)'
alias dra='docker rm $(docker ps -aq)'
alias dps='docker ps'
alias dpS='docker ps -a'

function remove_old_ground {
  local num_to_keep=${1:-4}
  docker rmi -f $(docker images | grep adnground-1 | sort -r | tail +$num_to_keep | awk '{print $3}')
}

function dsh {
  docker exec -it $1 /bin/bash
}