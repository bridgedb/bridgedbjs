#! /bin/bash

while true; do
    read -p "One or more unexpected pm2 processes running. Shut down all? [y/N]" yn
    case $yn in
        [Yy]* ) pm2 --silent kill; break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done
