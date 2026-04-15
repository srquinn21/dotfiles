unset DOCKER_HOST
unset DOCKER_TLS_VERIFY

alias dka='docker kill $(docker ps -aq)'
alias dra='docker rm $(docker ps -aq)'
alias dps='docker ps'
alias dpS='docker ps -a'

function dsh {
  docker exec -it $1 /bin/bash
}

function docker-ecr-auth {
  aws ecr get-login-password --region $2 | docker login --username AWS --password-stdin $1.dkr.ecr.$2.amazonaws.com
}