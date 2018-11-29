# Say and Guess

## Gameplay
'Say and Guess' is a multiplayer game where one of the players is blinded and all other players are given the same word. The other players is called watcher and the sole blind player is called guesser.

The watchers need to hint the guesser without explicitly say any part of the word. The guesser need to use their hints to guess what the underlieing word is. Also, a timelimit is set for each guess to make the gameflow fluent. Everytime the guesser made a right guess, he got one point. Also, the guess could choose to pass this word and move on before the timelimit end. The goal is to reach the maximum point as possible.

It is recommendded to have a sideway voice chating software to help the game. Audio chating feature is not considered worth to implemented in this game.

## Dependency
* Node.js
* NPM
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
* Reconnect feature
* Optimized frontend and backend(for better gameflow)
