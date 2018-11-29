// TODO4: Reconnect feature (Instead of register new we could use old playerID if player has)


// ----------------------------------------------------------------
// -- Module setting
// ----------------------------------------------------------------

var express = require('express')
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
const fs = require('fs');
var parse = require('csv-parse/lib/sync');
require('should');

// ----------------------------------------------------------------
// -- Path and listen setting
// ----------------------------------------------------------------

server.listen(8080);
app.use("/guess",express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------
// -- Global DSs
// ----------------------------------------------------------------

// Global timestamp issuing PID to players
var globalIDStamp = 0;
// Global dictionary to maintain player states
var playerState = {};
var roomStates = {}
var viableTimeLimit = [60,120,180,360];

var wordList;



// ----------------------------------------------------------------
// -- Configuration funcs
// ----------------------------------------------------------------

function parseGameConfiguration(filename = "game.conf"){
  // Parse viableTimeLimit, DictionaryList from game.conf
  fs.readFile(filename,{encoding : "UTF-8",flag: "r"}, (err,fd) => {
    if(err) throw err;
    var input = fd;
    conf = JSON.parse(input);
    cwordList = conf["wordLists"][0][1];
    loadVocabulary(cwordList);
    timeLimits = conf["viableTimeLimit"];
    viableTimeLimit = timeLimits;
  }); 
}

function loadVocabulary(filename){
  fs.readFile(filename,{encoding : "UTF-8",flag: "r"}, (err,fd) => {
    if(err) throw err;
    var input = fd;
    wordList = parse(input)[0];
  }); 
}

// ----------------------------------------------------------------
// -- RoomRelated funcs
// ----------------------------------------------------------------

function initRoomInfo(rid){
  var roomInfo =
  {
    playerList : [],
    timelimit : 60,
    TLCur : 0,
    noDupMode : false,
    gameInfo : {}
  };
  setRoomInfo(rid,roomInfo);
}
function setRoomInfo(rid,info){
  roomStates[rid.toString()] = info;
}

function getRoomInfo(rid){
  if (!(rid in roomStates)){
    initRoomInfo(rid);
  }
  return roomStates[rid.toString()];
}

function getGameInfo(rid){
  return roomStates[rid.toString()].gameInfo;
}
function setGameInfo(rid,info){
  roomStates[rid.toString()].gameInfo = info;
}

// ----------------------------------------------------------------
// -- InRoom & Game funcs
// ----------------------------------------------------------------

function getPlayerState(pid){
  return playerState[pid.toString()];
}

function setPlayerState(pid,state){
  playerState[pid.toString()] = state;
}

// TODO: Add room feature & control broadcast domain

function registerNewPlayer(socket){
  var newclient = {
    playerID : globalIDStamp,
    // This is a replicated pointer from RoomInfo.playerList, Consistency should be cared
    currentRoom : -1,
    playerName : "Nobody",
    state : "Outside",
    isRoomMaster : false,
    isReady4Gaming: false,
    // Player/Watcher
    playerRole : "",
    _socket : socket
  };
  setPlayerState(globalIDStamp,newclient);
  globalIDStamp+=1;
  return getPlayerState(globalIDStamp-1);
}

function playerLeaveRoom(pid){
  var rid = getPlayerState(pid).currentRoom;
  if(rid == -1){
    return;
  }
  var roomInfo = getRoomInfo(rid);
  roomInfo.playerList = remove(roomInfo.playerList,pid);
  var player = getPlayerState(pid);
  player.state = "Outside";
  player.playerRole = "";
  player.currentRoom = -1;
  if(player.isRoomMaster){
    //When RoomMaster was removed we need reelection
    reelectMaster(rid);
  }
  notifyRoomInfo(rid);
}

function playerJoinRoom(pid,rid){
  var plyState = getPlayerState(pid);
  var roomInfo = getRoomInfo(rid);
  playerLeaveRoom(pid);
  // Join new Room
  if(roomInfo.playerList.length==0){
    plyState.isRoomMaster = true;
    plyState.isReady4Gaming = true;
  }
  plyState.currentRoom = rid;
  plyState.state = "InRoom";
  roomInfo.playerList.push(pid);
}

function notifyRoomInfo(rid){
  // Pushing all info to client
  playerBuf = []
  var roomInfo = getRoomInfo(rid);
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id = roomInfo.playerList[i];
    var pinfo = getPlayerState(id);
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
  // FIXME: Change this to a local broadcast inside room
  io.to(roomchannel(rid)).emit('roomInfo',{
    timelimit : roomInfo.timelimit,
    players : playerBuf
  });
}

function reelectMaster(rid){
  var roomInfo = getRoomInfo(rid);
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

function removePlayer(pid){
  var rid = getPlayerState(pid).currentRoom;
  var roomInfo = getRoomInfo(rid);
  roomInfo.playerList = remove(roomInfo.playerList,pid);
  var player = getPlayerState(pid);
  setPlayerState(pid,null);
  if(player.isRoomMaster){
    //When RoomMaster was removed we need reelection
    reelectMaster(rid);
  }
  notifyRoomInfo(rid);
}

function isAllReady(rid){
  var roomInfo = getRoomInfo(rid);
  // If only one player in room, refuse to start
  if(roomInfo.playerList.length<2){
    return false;
  }
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id=roomInfo.playerList[i];
    var pinfo = getPlayerState(id);
    if(pinfo.isReady4Gaming==false){
      return false;
    }
  }
  return true;
}
function initGameInfo(rid){
  var roomInfo = getRoomInfo(rid);
  var gameInfo = {
    time : roomInfo.timelimit,
    wordGuessed : {},
    correctNum : 0,
    skipNum : 0,
  };
  setGameInfo(rid,gameInfo);
}

function getNextWord(){
  var len = wordList.length;
  var target = Math.floor((Math.random()*len));
  return wordList[target];
}
function notifyNextWord(rid){
  var roomInfo = getRoomInfo(rid);
  var gameInfo = getGameInfo(rid);
  var nextword = getNextWord();
  if(roomInfo.noDupMode){
    while(!gameInfo.wordGuessed[nextword]){
      nextword = getNextWord();
    }
  }
  gameInfo.wordGuessed[nextword] = true;
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id=roomInfo.playerList[i];
    var pinfo = getPlayerState(id);
    if(pinfo.playerRole!="Player"){
      pinfo._socket.emit('wordToGuess',nextword);
    }
    else{
      pinfo._socket.emit('wordToGuess',""); 
    }
  }
}
function notifyGameEnd(rid){
  notifyGameInfo(rid);
  // FIXME: Change this to a local broadcast inside room
  io.to(roomchannel(rid)).emit('gameEnd',"");
  cleanUpGame(rid);
}
function notifyGameInfo(rid){
  // TODO: Pushing time & credit update
  // FIXME: Change this to a local broadcast inside room
  io.to(roomchannel(rid)).emit('gameInfo',getGameInfo(rid));
}

function initGame(rid){
  // Select the player
  var roomInfo = getRoomInfo(rid);
  var len = roomInfo.playerList.length;
  var target = Math.floor((Math.random()*len));
  for(var i=0;i<len;i++){
    var id = roomInfo.playerList[i];
    var player = getPlayerState(id);
    player.state = "Gaming";
    if(i!=target){
      player.playerRole = "Watcher";
    }
    else{
      player.playerRole = "Player";
    }
  }
  notifyRoomInfo(rid);
}

function cleanUpGame(rid){
  var roomInfo = getRoomInfo(rid);
  initGameInfo(rid);
  for(var i=0;i<roomInfo.playerList.length;i++){
    var id=roomInfo.playerList[i];
    var pinfo = getPlayerState(id);
    pinfo.state = "InRoom";
    pinfo.playerRole = "";
  }
  notifyRoomInfo(rid);
}

function clockTimeout(rid){
  var gameInfo = getGameInfo(rid);
  if(gameInfo.time!=0){
      gameInfo.time-=1;
      notifyGameInfo(rid);
      setTimeout(clockTimeout,1000,rid);
    }
    else{
      notifyGameEnd(rid);
    }
}

function startGame(rid){
  initGame(rid);
  initGameInfo(rid);
  notifyGameInfo(rid);
  // Start
  setTimeout(clockTimeout,1000,rid);
  // FIXME: Local broadcast
  io.to(roomchannel(rid)).emit("Start","");
  notifyNextWord(rid);
}

function roomchannel(rid){
  return "_room" +rid.toString();
}

// ----------------------------------------------------------------
// -- Main Loop part
// ----------------------------------------------------------------

// Start
parseGameConfiguration("game.conf");

// Register all request handling func
io.on('connection', function (socket) {
  // Client States: Outside -> InRoom <--> Gaming 
  var clientState = registerNewPlayer(socket);
  var roomId = -1;
  socket.emit("id",clientState.playerID);
  // Can notify the basic setting of players (or declined until player join room)
  socket.on("join",(rid) =>{
    playerJoinRoom(clientState.playerID,rid);
    roomId = rid;
    clientState._socket.join(roomchannel(rid));
    notifyRoomInfo(rid);
  });
  socket.on("disconnect",(reason) => {
    removePlayer((clientState.playerID));
  });
  // InRoom Related
  socket.on("changeTimeLimit",()=>{
    if(!sanityCheckR(clientState,roomId)){
      return;
    }
    var roomInfo = getRoomInfo(roomId);
    roomInfo.TLCur = (roomInfo.TLCur + 1) % viableTimeLimit.length;
    roomInfo.timelimit = viableTimeLimit[roomInfo.TLCur];
    notifyRoomInfo(roomId);
  });
  socket.on("changeName",(newName) => {
    if(!sanityCheckR(clientState,roomId)){
      return;
    }
    clientState.playerName = newName;
    notifyRoomInfo(roomid);
  });
  socket.on("Ready",() => {
    if(!sanityCheckR(clientState,roomId)){
      return;
    }
    clientState.isReady4Gaming = true;
    notifyRoomInfo(roomId);
  });

  socket.on("Unready",() => {
    if(!sanityCheckR(clientState,roomId)){
      return;
    }
    clientState.isReady4Gaming = false;
    notifyRoomInfo(roomId);
  });
  socket.on("Start",() => {
    if(!sanityCheckR(clientState,roomId)){
      return;
    }
    if(clientState.isRoomMaster){
      if(isAllReady(roomId)){
        startGame(roomId);
      }
    }
  });

  // Game Related
  socket.on("Next",(result) => {
    if(!sanityCheckG(clientState,roomId)){
      return;
    }
    var gameInfo = getGameInfo(roomId);
    if(result=="Correct"){
      gameInfo.correctNum += 1;
      notifyNextWord(roomId); 
    }
    else if(result=="Skip"){
      gameInfo.skipNum += 1
      notifyNextWord(roomId);
    }
  });
});

function sanityCheckR(clientState,roomId){
  if(clientState.state!="InRoom"){
    return false;
  }
  if(roomId == -1){
    return false;
  }
  return true;
}
function sanityCheckG(clientState,roomId){
  if(clientState.state!="Gaming"){
    return false;
  }
  if(roomId == -1){
    return false;
  }
  return true;
}
// ----------------------------------------------------------------
// -- Utility functions
// ----------------------------------------------------------------

function remove(array,val){
  var index = array.indexOf(val);
  if (index > -1) {
    array.splice(index, 1);
  }
  return array;
}
