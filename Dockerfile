FROM node:slim
WORKDIR /home/app
COPY . /home/app/
RUN npm install 
CMD ["node","server.js"]

