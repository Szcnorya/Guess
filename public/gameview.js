'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var e = React.createElement;

var Client = function (_React$Component) {
    _inherits(Client, _React$Component);

    function Client(props) {
        _classCallCheck(this, Client);

        var _this = _possibleConstructorReturn(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this, props));

        _this.state = {
            playerId: -1,
            myInfo: {},
            state: "Outside",
            timelimit: 180,
            playersInfo: [],
            // Only available in Gaming state
            word: "",
            time: -1,
            correct: 0,
            skip: 0
        };
        _this.io = io('');
        return _this;
    }

    _createClass(Client, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            this.setRemoteUpdateCallback();
        }
    }, {
        key: "setRemoteUpdateCallback",
        value: function setRemoteUpdateCallback() {
            var _this2 = this;

            this.io.on("id", function (id) {
                _this2.setState(function (state, props) {
                    state.playerId = id;
                    return state;
                });
            });
            this.io.on("roomInfo", function (info) {
                _this2.setState(function (state, props) {
                    state.timelimit = info.timelimit;
                    state.playersInfo = info.players;
                    for (var i = 0; i < info.players.length; i++) {
                        var player = info.players[i];
                        if (player.playerID == state.playerId) {
                            state.myInfo = player;
                        }
                    }
                    return state;
                });
            });

            this.io.on("wordToGuess", function (word) {
                _this2.setState(function (state, props) {
                    state.word = word;
                    return state;
                });
            });

            this.io.on("Start", function () {
                _this2.setState(function (state, props) {
                    state.state = "Gaming";
                    return state;
                });
            });
            this.io.on("gameInfo", function (info) {
                _this2.setState(function (state, props) {
                    state.time = info.time;
                    state.correct = info.correctNum;
                    state.skip = info.skipNum;
                    return state;
                });
            });

            this.io.on("gameEnd", function () {
                _this2.setState(function (state, props) {
                    state.state = "InRoom";
                    return state;
                });
            });
        }
    }, {
        key: "componentWillUnmount",
        value: function componentWillUnmount() {
            this.io = null;
        }
    }, {
        key: "render",
        value: function render() {
            var _this3 = this;

            if (this.state.state == "Outside") {
                return React.createElement(
                    "button",
                    { className: "InitButton", onClick: function onClick(e) {
                            var ID = window.prompt("Please input the room ID you want to join", "");
                            var rid = parseInt(ID);
                            if (isNaN(rid) || rid < 0) {
                                return;
                            }
                            _this3.io.emit("join", rid);
                            _this3.setState(function (state, props) {
                                state.state = "InRoom";
                                return state;
                            });
                        } },
                    "Join"
                );
            } else if (this.state.state == "InRoom") {
                return React.createElement(RoomView, { GameStatus: this.state, io: this.io });
            } else {
                return React.createElement(GameView, { GameStatus: this.state, io: this.io });
            }
        }
    }]);

    return Client;
}(React.Component);

function RoomView(props) {
    return React.createElement(
        "div",
        null,
        React.createElement(PlayersArea, { players: props.GameStatus.playersInfo }),
        React.createElement(RoomOperateArea, { name: props.GameStatus.myInfo.playerName, timelimit: props.GameStatus.timelimit,
            isMaster: props.GameStatus.myInfo.isRoomMaster, isReady: props.GameStatus.myInfo.isReady4Gaming, io: props.io })
    );
}

function PlayersArea(props) {
    var playersItems = props.players.map(function (p, i) {
        return React.createElement(Player, { key: i, unavilable: i >= props.players.length, Name: p.playerName, isMaster: p.isRoomMaster, isReady: p.isReady4Gaming });
    });
    // TODO: Find better one line later
    var unavailablePlayers = [];
    for (var i = props.players.length; i < 4; i++) {
        unavailablePlayers.push(React.createElement(Player, { key: i, unavilable: i >= props.players.length }));
    }
    return React.createElement(
        "div",
        { className: "RoomArea flex-container" },
        playersItems,
        unavailablePlayers
    );
}

function RoomOperateArea(props) {
    return React.createElement(
        "div",
        { className: "OpArea" },
        React.createElement(ConfigurationArea, { name: props.name, timelimit: props.timelimit, io: props.io }),
        React.createElement(
            "div",
            { className: "IntArea", align: "center" },
            React.createElement(
                "div",
                { className: "Button", onClick: function onClick(e) {
                        if (props.isMaster) {
                            props.io.emit("Start", "");
                        } else {
                            if (props.isReady) {
                                props.io.emit("Unready", "");
                            } else {
                                props.io.emit("Ready", "");
                            }
                        }
                    } },
                props.isMaster ? "开始" : props.isReady ? "取消准备" : "准备"
            )
        ),
        ")"
    );
}

var EditConfigurationEntry = function (_React$Component2) {
    _inherits(EditConfigurationEntry, _React$Component2);

    function EditConfigurationEntry(props) {
        _classCallCheck(this, EditConfigurationEntry);

        var _this4 = _possibleConstructorReturn(this, (EditConfigurationEntry.__proto__ || Object.getPrototypeOf(EditConfigurationEntry)).call(this, props));

        _this4.handleChange = _this4.handleChange.bind(_this4);
        return _this4;
    }

    _createClass(EditConfigurationEntry, [{
        key: "keyCallback",
        value: function keyCallback(e) {
            if (e.keyCode == "13") {
                e.preventDefault();
            }
        }
    }, {
        key: "handleChange",
        value: function handleChange(e) {
            this.props.onValueChange(e.target.value);
        }
    }, {
        key: "render",
        value: function render() {
            var propValue = this.props.propValue;
            return React.createElement(
                "div",
                { className: "Conf" },
                React.createElement(
                    "span",
                    null,
                    this.props.propName,
                    "\uFF1A"
                ),
                React.createElement("input", { className: "Box", onKeyDown: this.keyCallback, onChange: this.handleChange, value: propValue })
            );
        }
    }]);

    return EditConfigurationEntry;
}(React.Component);

var ClickConfigurationEntry = function (_React$Component3) {
    _inherits(ClickConfigurationEntry, _React$Component3);

    function ClickConfigurationEntry(props) {
        _classCallCheck(this, ClickConfigurationEntry);

        var _this5 = _possibleConstructorReturn(this, (ClickConfigurationEntry.__proto__ || Object.getPrototypeOf(ClickConfigurationEntry)).call(this, props));

        _this5.handleChange = _this5.handleChange.bind(_this5);
        return _this5;
    }

    _createClass(ClickConfigurationEntry, [{
        key: "handleChange",
        value: function handleChange(e) {
            e.preventDefault();
            this.props.onValueChange(e.target.value);
        }
    }, {
        key: "render",
        value: function render() {
            return React.createElement(
                "div",
                { className: "Conf" },
                React.createElement(
                    "span",
                    null,
                    this.props.propName,
                    "\uFF1A"
                ),
                React.createElement("input", { className: "Box", onClick: this.handleChange, value: this.props.propValue, readonly: "readonly" })
            );
        }
    }]);

    return ClickConfigurationEntry;
}(React.Component);

function ConfigurationArea(props) {
    return React.createElement(
        "div",
        { className: "ConfArea" },
        React.createElement(EditConfigurationEntry, { propName: "\u540D\u79F0", propValue: props.name, onValueChange: function onValueChange(v) {
                return props.io.emit("changeName", v);
            } }),
        React.createElement(ClickConfigurationEntry, { propName: "\u65F6\u9650", propValue: props.timelimit, onValueChange: function onValueChange(v) {
                return props.io.emit("changeTimeLimit", "");
            } })
    );
}

function Player(props) {
    if (props.unavailable) {
        return React.createElement("div", { className: "Player unavailable-block" });
    } else {
        return React.createElement(
            "div",
            { className: "Player" },
            React.createElement(
                "div",
                { className: "PName" },
                props.Name
            ),
            props.isMaster && React.createElement(
                "div",
                { className: "MasterSymbol" },
                "Master"
            ),
            props.isReady && React.createElement(
                "div",
                { className: "ReadySymbol" },
                "Ready"
            )
        );
    }
}

function GameView(props) {
    return React.createElement(
        "div",
        null,
        React.createElement(GameInfo, { time: props.GameStatus.time, correct: props.GameStatus.correct, skip: props.GameStatus.skip }),
        React.createElement(WordArea, { word: props.GameStatus.word }),
        props.GameStatus.myInfo.playerRole != "Player" && React.createElement(GameOperationArea, { io: props.io })
    );
}
function GameInfo(props) {
    return React.createElement(
        "div",
        { className: "infoArea flex-container" },
        React.createElement(
            "div",
            null,
            props.time,
            "s"
        ),
        React.createElement(
            "div",
            null,
            props.correct,
            "/",
            props.skip
        )
    );
}
function WordArea(props) {
    return React.createElement(
        "div",
        { className: "wordArea flex-container" },
        React.createElement(
            "div",
            null,
            props.word
        )
    );
}

function GameOperationArea(props) {
    return React.createElement(
        "div",
        { className: "OpArea flex-container" },
        React.createElement(
            "div",
            { className: "Button", onClick: function onClick(e) {
                    return props.io.emit("Next", "Correct");
                } },
            "\u6B63\u786E"
        ),
        React.createElement(
            "div",
            { className: "Button", onClick: function onClick(e) {
                    return props.io.emit("Next", "Skip");
                } },
            "\u8DF3\u8FC7"
        )
    );
}

var domContainer = document.querySelector('#gameview');
ReactDOM.render(e(Client), domContainer);