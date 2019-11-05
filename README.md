# Say and Guess

## Gameplay
'Say and Guess' is a multiplayer game where one of the players is blinded and all the other players are given view of a shared word. The other players are called "watcher" and the sole blind player is called "guesser".

The watchers need to hint the guesser without explicitly refer to any part of the hidden word. The guesser need to use hints and imagination to guess what the hidden word is. Also, a timelimit is set for each word to make the gameflow smooth(in case that one word can not get through and the game struck). Every times the guesser makes a right guess, he gets one point. Also, the guesser could choose to skip word and move on regardless of the timelimit. The goal of the guesser is to gain as much point as possible.

It is recommendded to have a group voice chating software to help the game. Audio chating feature is not considered to be implemented so far.

## Dependency
* Node.js
* NPM
* Babel
* React.js
* Socket.io
* express
* csv-parse
* fs

## Deployment

We are currently considering packageing the whole application as a docker image to support faster deployment. However, the current version use npm to deploy.

Simply run the following commands:
```sh
npm install
node app.js
```

The default access path is <http://localhost:8080/guess/>. It can be changed in the file "app.js".
```js
app.use("/guess",express.static(path.join(__dirname, 'public')));
```
Just change "/guess" to the target path you want to use.

## Future Target

* Multi-dictionary support
* Re-connection feature
* Optimized frontend and backend(for better gameflow)
