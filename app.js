// Module setting
var express = require('express')
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
const fs = require('fs');
var parse = require('csv-parse/lib/sync');
require('should');

// Path and listen setting
server.listen(8080);
app.use("/guess",express.static(path.join(__dirname, 'public')));

// global data structure

// TODO2: Introduce configurable wordlist
// TODO3: Add Room feature

var wordList;
var globalIDStamp = 0;
var playerState = {};
var viableTimeLimit = [60,120,180,360];
var roomInfo = {
  playerList : [],
  timelimit : 60,
  TLCur : 0,
  noDupMode : false
};
var gameInfo;

function remove(array,val){
  var index = array.indexOf(val);
  if (index > -1) {
    array.splice(index, 1);
  }
  return array;
}
loadVocabulary("normal.csv");
function loadVocabulary(filename){
  fs.readFile(filename,{encoding : "UTF-8",flag: "r"}, (err,fd) => {
    if(err) throw err;
    var input = fd;
    wordList = parse(input)[0];
  }); 
}

function registerNewPlayer(socket){
  var newclient = {
    playerID : globalIDStamp,
    playerName : "Nobody",
    state : "InRoom",
    isRoomMaster : false,
    isReady4Gaming: false,
    // Player/Watcher
    playerRole : "",
    _socket : socket
  };
  if(roomInfo.playerList.length==0){
    newclient.isRoomMaster = true;
    newclient.isReady4Gaming = true;
  }
  roomInfo.playerList.push(globalIDStamp);
  playerState[(globalIDStamp).toString()] = newclient;
  globalIDStamp+=1;
  return playerState[(globalIDStamp-1).toString()];
}
function notifyRoomInfo(){
  // TODO: Pushing all info to client
  playerBuf = []
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id = roomInfo.playerList[i];
    var pinfo = playerState[id.toString()];
    playerBuf.push({
      playerID : pinfo.playerID,
      playerName : pinfo.playerName,
      state : pinfo.state,
      isRoomMaster : pinfo.isRoomMaster,
      isReady4Gaming: pinfo.isReady4Gaming,
      // Player/Watcher
      playerRole : pinfo.playerRole
    });
  }
  io.emit('roomInfo',{
    timelimit : roomInfo.timelimit,
    players : playerBuf
  });
}

function notifyNextWord(){
  var nextword = getNextWord();
  if(roomInfo.noDupMode){
    while(!gameInfo.wordGuessed[nextword]){
      nextword = getNextWord();
    }
  }
  gameInfo.wordGuessed[nextword] = true;
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id=roomInfo.playerList[i];
    var pinfo = playerState[id.toString()];
    if(pinfo.playerRole!="Player"){
      pinfo._socket.emit('wordToGuess',nextword);
    }
    else{
      pinfo._socket.emit('wordToGuess',""); 
    }
  }
}
function notifyGameEnd(){
  notifyGameInfo();
  io.emit('gameEnd',"");
  cleanUpGame();
}
function notifyGameInfo(){
  // TODO: Pushing time & credit update
  io.emit('gameInfo',gameInfo);
}

function cleanUpGame(){
  initGameInfo();
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id=roomInfo.playerList[i];
    var pinfo = playerState[id.toString()];
    pinfo.state = "InRoom";
  }
  notifyRoomInfo();
}

function reelectMaster(){
  var len = roomInfo.playerList.length;
  if(len==0){
    // It's no point to do anymore.
    return;
  }
  var target = Math.floor((Math.random()*len));
  var id = roomInfo.playerList[target];
  playerState[id].isRoomMaster = true;
  playerState[id].isReady4Gaming = true;
}

function removePlayer(playerID){
  roomInfo.playerList = remove(roomInfo.playerList,playerID);
  var player = playerState[playerID.toString()];
  playerState[playerID.toString()] = null;
  if(player.isRoomMaster){
    //When RoomMaster was removed we need reelection
    reelectMaster();
  }
  notifyRoomInfo();
}

function isAllReady(){
  if(roomInfo.playerList.length<2){
    return false;
  }
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id=roomInfo.playerList[i];
    var pinfo = playerState[id.toString()];
    if(pinfo.isReady4Gaming==false){
      return false;
    }
  }
  return true;
}
function initGameInfo(){
  gameInfo = {
    time : roomInfo.timelimit,
    wordGuessed : {},
    correctNum : 0,
    skipNum : 0,
  };
}
function getNextWord(){
  var len = wordList.length;
  var target = Math.floor((Math.random()*len));
  return wordList[target];
}
function clockTimeout(){
  if(gameInfo.time!=0){
      gameInfo.time-=1;
      notifyGameInfo();
      setTimeout(clockTimeout,1000);
    }
    else{
      notifyGameEnd();
    }
}
function initGame(){
  // Select the player
  var len = roomInfo.playerList.length;
  var target = Math.floor((Math.random()*len));
  for(var i=0;i<len;i++){
    var id = roomInfo.playerList[i];
    var player = playerState[id.toString()];
    player.state = "Gaming";
    if(i!=target){
      player.playerRole = "Watcher";
    }
    else{
      player.playerRole = "Player";
    }
  }
  notifyRoomInfo();
}
function startGame(){
  initGame();
  initGameInfo();
  notifyGameInfo();
  // Start
  setTimeout(clockTimeout,1000);
  io.emit("Start","");
  notifyNextWord();
}

io.on('connection', function (socket) {
  // Client States: Outside -> InRoom <--> Gaming 
  var ClientState = registerNewPlayer(socket);
  socket.emit("id",ClientState.playerID);
  notifyRoomInfo();
  socket.on("disconnect",(reason) => {
    removePlayer((ClientState.playerID));
  });
  socket.on("changeTimeLimit",()=>{
    if(ClientState.state!="InRoom"){
      return;
    }
    roomInfo.TLCur = (roomInfo.TLCur + 1) % viableTimeLimit.length;
    roomInfo.timelimit = viableTimeLimit[roomInfo.TLCur];
    notifyRoomInfo();
  });
  socket.on("changeName",(newName) => {
    if(ClientState.state!="InRoom"){
      return;
    }
    ClientState.playerName = newName;
    notifyRoomInfo();
  });
  socket.on("Ready",() => {
    if(ClientState.state!="InRoom"){
      return;
    }
    ClientState.isReady4Gaming = true;
    notifyRoomInfo();
  });

  socket.on("Unready",() => {
    if(ClientState.state!="InRoom"){
      return;
    }
    ClientState.isReady4Gaming = false;
    notifyRoomInfo();
  });
  
  socket.on("Start",() => {
    if(ClientState.state!="InRoom"){
      return;
    }
    if(ClientState.isRoomMaster){
      if(isAllReady()){
        startGame();
      }
    }
  });

  socket.on("Next",(result) => {
    if(ClientState.state!="Gaming"){
      return;
    }
    if(result=="Correct"){
      gameInfo.correctNum += 1;
      notifyNextWord(); 
    }
    else if(result=="Skip"){
      gameInfo.skipNum += 1
      notifyNextWord();
    }
  });
});
