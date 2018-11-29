var io = io('');
var GameStatus = {
	playerId : -1,
	myInfo : {},
	state : "InRoom",
	timelimit : 180,
	playersInfo : [],
	// Only available in Gaming state
	word : "",
	time : -1,
	correct : 0,
	skip : 0
}
io.on("id", (id) => {
	GameStatus.playerId = id;
});
io.on("roomInfo",(info) => {
	GameStatus.timelimit = info.timelimit;
	GameStatus.playersInfo = info.players;
	for(var i=0;i<info.players.length;i++){
		var player = info.players[i];
		if(player.playerID==GameStatus.playerId){
			GameStatus.myInfo=player;
		}
	}
});

io.on("wordToGuess",(word) =>{
	GameStatus.word = word;
});

io.on("Start",() =>{
	GameStatus.state = "Gaming";
});

io.on("gameInfo",(info) => {
	GameStatus.time = info.time;
	GameStatus.correct = info.correctNum;
	GameStatus.skip = info.skipNum;
});

io.on("gameEnd",()=>{
	GameStatus.state = "InRoom";
});
function bindInteractions(){
	$('#timelimit').off("click");
	$('#timelimit').click(()=>{
		io.emit("changeTimeLimit","");
	});
	$('#uname').off("focusout");
	$('#uname').off("keydown");
	$('#uname').keydown((e) =>{
		if(e.keyCode=="13"){
			return false;
		}
		return true;
	});
	$('#uname').focusout(() => {
		io.emit("changeName",$('#uname').text());
	});
	$("#correct").off("click");
	$("#correct").click(()=>{
		io.emit("Next","Correct");
	});
	$("#skip").off("click");
	$("#skip").click(()=>{
		io.emit("Next","Skip");
	});
}
function render(){
	if(GameStatus.state=="InRoom"){
		$("#View1").show();
		$("#View2").hide();
		// Update room info
		$('#timelimit').text(GameStatus.timelimit.toString());
		
		for(var i=0;i<4;i++){
			var element = $(".Player").eq(i);
			if(i>=GameStatus.playersInfo.length){
				element.addClass("unavailable-block");
				element.children("div.PName").hide();
				element.children("div.MasterSymbol").hide();
				element.children("div.ReadySymbol").hide();
			}
			else{
				var player = GameStatus.playersInfo[i];
				if(player.playerID==GameStatus.playerId){
					// Get my condition
					GameStatus.myInfo = player;
					$("#ready").off("click");
					if(GameStatus.myInfo.isRoomMaster){
						$("#ready").text("开始");
						$("#ready").click(()=>{
							io.emit("Start","");
						});
					}
					else{
						if(!GameStatus.myInfo.isReady4Gaming){
							$("#ready").text("准备");
							$("#ready").click(()=>{
								io.emit("Ready","");
							});
						}
						else{
							$("#ready").text("取消准备");
							$("#ready").click(()=>{
								io.emit("Unready","");
							});
						}
					}
				}
				element.removeClass("unavailable-block");
				element.children("div.PName").text(player.playerName)
				element.children("div.PName").show();
				if(player.isRoomMaster){
					element.children("div.MasterSymbol").show();
				}
				else{
					element.children("div.MasterSymbol").hide();
				}
				if(player.isReady4Gaming){
					element.children("div.ReadySymbol").show();
				}
				else{
					element.children("div.ReadySymbol").hide();
				}
			}
		}
		setTimeout(render,33);
	}
	else{
		$("#View2").show();
		$("#View1").hide();
		$("#time").text(GameStatus.time.toString()+"s");
		$("#credit").text(GameStatus.correct.toString()+"/"+GameStatus.skip.toString());
		$("#word").text(GameStatus.word);
		if(GameStatus.myInfo.playerRole=="Player"){
			$("#correct").hide();
			$("#skip").hide();
		}
		else{
			$("#correct").show();
			$("#skip").show();
		}
		setTimeout(render,33);
	}
}
bindInteractions();
render();