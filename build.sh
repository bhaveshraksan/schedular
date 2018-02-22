docker build -t dockerhub.raksan.in/fieldeagles/fieldrepo_schedular:crongen .
echo 'login in docker'
docker login dockerhub.raksan.in
docker push dockerhub.raksan.in/fieldeagles/fieldrepo_schedular:crongen

