FROM node:18

RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh --output /wait-for-it.sh

RUN chmod +x /wait-for-it.sh

WORKDIR /usr/src/backend
RUN yarn install