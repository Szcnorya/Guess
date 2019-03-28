'use strict';

const e = React.createElement;
class Client extends React.Component{
    constructor(props) {
        super(props);
        this.state = { 
                    playerId : -1,
                    myInfo : {},
                    state : "Outside",
                    timelimit : 180,
                    playersInfo : [],
                    // Only available in Gaming state
                    word : "",
                    time : -1,
                    correct : 0,
                    skip : 0
        };
        this.io = io('');
    }
    componentDidMount() {
        this.setRemoteUpdateCallback();
    }
    setRemoteUpdateCallback(){
        this.io.on("id", (id) => {
            this.setState((state, props) => {
                state.playerId = id;
                return state;
            });
        });
        this.io.on("roomInfo",(info) => {
            this.setState((state, props) => {
                state.timelimit = info.timelimit;
                state.playersInfo = info.players;
                for(var i=0;i<info.players.length;i++){
                    var player = info.players[i];
                    if(player.playerID==state.playerId){
                        state.myInfo=player;
                    }
                }
                return state;
            });
        });
        
        this.io.on("wordToGuess",(word) =>{
            this.setState((state, props) => {
                state.word = word;
                return state;
            });
        });
        
        this.io.on("Start",() =>{
            this.setState((state, props) => {
                state.state = "Gaming";
                return state;
            });
        });
        this.io.on("gameInfo",(info) => {
            this.setState((state, props) => {
                state.time = info.time;
                state.correct = info.correctNum;
                state.skip = info.skipNum;
                return state;
            });
        });
        
        this.io.on("gameEnd",()=>{
            this.setState((state, props) => {
                state.state = "InRoom";
                return state;
            }); 
        });
    }
    componentWillUnmount() {
        this.io = null;
    }
    
    render(){
        if(this.state.state=="Outside"){
            return (<button className="InitButton" onClick = {(e) =>{
                var ID = window.prompt("Please input the room ID you want to join","");
                var rid = parseInt(ID);
                if(isNaN(rid) || rid<0){
                    return;
                }
                this.io.emit("join",rid);
                this.setState((state, props) => {
                    state.state = "InRoom";
                    return state;
                });
            }}>Join</button>); 
        }
        else if(this.state.state=="InRoom"){
            return (<RoomView GameStatus={this.state} io = {this.io}/>);
        }
        else{
            return (<GameView GameStatus={this.state} io = {this.io}/>);
        }
    }
}

function RoomView(props){
    return (
        <div>
            <PlayersArea players={props.GameStatus.playersInfo}/>
            <RoomOperateArea name={props.GameStatus.myInfo.playerName} timelimit={props.GameStatus.timelimit}
                         isMaster={props.GameStatus.myInfo.isRoomMaster} isReady={props.GameStatus.myInfo.isReady4Gaming} io = {props.io}/>
        </div>
    );
}

function PlayersArea(props){
    const playersItems = props.players.map((p,i) => 
        <Player key={i} unavilable={i >= props.players.length} Name={p.playerName} isMaster={p.isRoomMaster} isReady={p.isReady4Gaming}/>);
    // TODO: Find better one line later
    var unavailablePlayers = []
    for(var i=props.players.length;i<4;i++){
        unavailablePlayers.push(<Player key={i} unavilable={i >= props.players.length}/>);
    }
    return (<div className="RoomArea flex-container">
        {playersItems}
        {unavailablePlayers}
    </div>);
}

function RoomOperateArea(props){
    return (<div className="OpArea">
        <ConfigurationArea name={props.name} timelimit={props.timelimit} io={props.io}/>
        <div className="IntArea" align="center">
            <div className="Button" onClick={
                (e) => {
                    if(props.isMaster){
                        props.io.emit("Start","");
                    }
                    else{
                        if(props.isReady){
                            props.io.emit("Unready","");
                        }
                        else{
                            props.io.emit("Ready","");
                        }
                    }
                }
            }>
            {
                (props.isMaster ? "开始" :
                (props.isReady ? "取消准备" : "准备"))
            }</div>
        </div>)
    </div>);
}

class EditConfigurationEntry extends React.Component{
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }
    keyCallback(e){
        if(e.keyCode=="13"){
            e.preventDefault();
		}
    }
    handleChange(e){
        this.props.onValueChange(e.target.value);
    }
    render() {
        const propValue = this.props.propValue;
        return (<div className="Conf">
            <span>{this.props.propName}：</span>
            <input className="Box" onKeyDown={this.keyCallback} onChange={this.handleChange} value={propValue}/>
        </div>);
    }
}

class ClickConfigurationEntry extends React.Component{
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }
    handleChange(e) {
        e.preventDefault();
        this.props.onValueChange(e.target.value);
    }
    render() {
        return (<div className="Conf">
            <span>{this.props.propName}：</span>
            <input className="Box" onClick={this.handleChange} value={this.props.propValue} readonly="readonly"/>
        </div>);
    }
}

function ConfigurationArea(props){
    return (<div className="ConfArea">
        <EditConfigurationEntry propName="名称" propValue={props.name} onValueChange={(v) => props.io.emit("changeName",v)}/>
        <ClickConfigurationEntry propName="时限" propValue={props.timelimit} onValueChange={(v) => props.io.emit("changeTimeLimit","")}/>
    </div>);
}

function Player(props){
    if(props.unavailable){
        return (<div className="Player unavailable-block"></div>);
    }
    else{
        return (
            <div className="Player">
                <div className="PName">{props.Name}</div>
                {props.isMaster &&
                    <div className="MasterSymbol">Master</div>
                }
                {props.isReady &&
                    <div className="ReadySymbol">Ready</div>
                }
            </div>
        );
    }
}

function GameView(props){
    return (
        <div>
            <GameInfo time={props.GameStatus.time} correct={props.GameStatus.correct} skip={props.GameStatus.skip}/>
            <WordArea word={props.GameStatus.word}/>
            {(props.GameStatus.myInfo.playerRole!="Player") &&
                <GameOperationArea io={props.io}/>
            }
        </div>
    );
}
function GameInfo(props){
    return (
        <div className="infoArea flex-container">
				<div>{props.time}s</div>
				<div>{props.correct}/{props.skip}</div>
        </div>
    );
}
function WordArea(props){
    return (
    <div className="wordArea flex-container">
        <div>{props.word}</div>
    </div>);
}

function GameOperationArea(props){
    return (
        <div className="OpArea flex-container">
            <div className="Button" onClick={(e) => props.io.emit("Next","Correct")}>正确</div>
            <div className="Button" onClick={(e) => props.io.emit("Next","Skip")}>跳过</div>
        </div>);
}

const domContainer = document.querySelector('#gameview');
ReactDOM.render(e(Client), domContainer);