#!/bin/bash

apt update
apt insatll cmake -y

apt install git -y

git clone --branch v0.8.0 https://github.com/alanxz/rabbitmq-c && cd rabbitmq-c

mkdir build && cd build
cmake --build . --target install

# далее пулишь все последние изменения с github
# открываешь QtCreator -> Open Project -> .pro файл, который лежит в папке GTC
# теперь кликаешь по проекту и выбираешь AddLibrary -> External Library и в Labrary Path указываешь путь к либе
# либа будет лежать в rabbitmq-c/build/librabbitmq/librabbitmq.so
# теперь можно попробовать собрать проект Ctrl-R
# если вдруг будет ругаться на билдовую папку, то заходи в Projects (слева панель) и там есть Build Directory (я сделал скрин, где она должна быть)
# внутри создай папку config и кинь туда прикрепленные файлы




