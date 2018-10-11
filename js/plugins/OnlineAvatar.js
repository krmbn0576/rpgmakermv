//=============================================================================
// OnlineAvatar.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// （これ以前の更新履歴は記録していません）
// 2016/10/25 スイッチ・変数同期時、ツクール上とサーバー上でデータが食い違う不具合を修正しました
// 2016/11/09 同じマップへの場所移動時、アバターが分身するのを修正しました
// 2016/11/14 イベント動的生成プラグイン(EventReSpawn.js)との競合対策
// 2018/10/12 firebaseのデータベース作成方法が変わったので、プラグインヘルプの手順に追記
//=============================================================================

/*:
 * @plugindesc Firebaseを使ってプレイヤーをオンライン同期します。
 * @author くらむぼん
 *
 * @param apiKey
 * @desc FirebaseのapiKey。各自コピペしてきてね
 * @default *******************
 *
 * @param authDomain
 * @desc FirebaseのauthDomain。各自コピペしてきてね
 * @default **********.firebaseapp.com
 *
 * @param databaseURL
 * @desc FirebaseのdatabaseURL。各自コピペしてきてね
 * @default https://**********.firebaseio.com
 *
 * @param avatarEvent
 * @desc アバターにコピーするコモンイベントの番号。0でアバター機能そのものをオフ
 * @default 1
 *
 * @param syncSwitchStart
 * @desc 全プレイヤーでオンライン共有するスイッチの番号の始まり。両方0で共有機能そのものをオフ
 * @default 11
 *
 * @param syncSwitchEnd
 * @desc 全プレイヤーでオンライン共有するスイッチの番号の終わり。両方0で共有機能そのものをオフ
 * @default 20
 *
 * @param syncVariableStart
 * @desc 全プレイヤーでオンライン共有する変数の番号の始まり。両方0で共有機能そのものをオフ
 * @default 11
 *
 * @param syncVariableEnd
 * @desc 全プレイヤーでオンライン共有する変数の番号の終わり。両方0で共有機能そのものをオフ
 * @default 20
 *
 * @help
 * 外部のBaaSであるFirebaseと連携して、MMORPGのような
 * オンラインのアバター（プレイヤーキャラ）表示に対応するプラグインです。
 * さらにスイッチ・変数同期機能も付け加えてみました。
 * 
 * 始め方：
 * １．Firebaseの公式サイト(https://console.firebase.google.com/)で、
 * 　　Googleアカウントを(持って無ければ)取得し、「新規プロジェクトを作成」する
 * ２．「ウェブアプリにFirebaseを追加」ボタンを押して
 * 　　apiKey、authDomain、databaseURLをプラグインのパラメータにコピペ
 * ３．左メニューから「Authentication」→上部から「ログイン方法」→「匿名」を有効にする
 * ４．左メニューから「Database」->「またはRealtime Databaseを選択」の中の「データベースを作成」を押す
 * ５．現れた選択肢の中から「テストモードで開始」を選択して、有効にする
 * ６．ゲームを多重起動すると、すべてのプレイヤーのアバターが画面に表示されます！
 * ※テストプレイボタンからは多重起動できないので、Firefoxからindex.htmlを開く
 * 
 * ！注意！
 * 多くの投稿サイトでは安全のためContent Security Policyという機能により
 * Firebaseへのオンライン通信が制限されています。
 * もしあなたがこのプラグインを使ったゲームを投稿する予定がある場合は、
 * その投稿先でこのプラグインが使えるかどうか必ず先に確かめておいてください！
 * 
 * 
 * スイッチ・変数の同期：
 * syncSwitchStart、syncSwitchEnd、syncVariableStart、syncVariableEndの
 * ４つのパラメータで「同期したいスイッチと変数の範囲」を設定します。
 * （初期設定ではスイッチ・変数共に11～20の番号が共有されます）
 * その範囲のスイッチ・変数はオンライン通信によって全プレイヤーで
 * 同じ値が共有されます！これによりアバターを出すだけに留まらず
 * オンラインを利用した様々な種類のゲームを作れる…と思います。
 * 
 * 応用編：
 * 画面に表示されるアバターは、avatarEventで指定した番号のコモンイベントの
 * 「実行内容」を自分自身の実行内容にコピーし、並列処理扱いで実行します。
 * これと下記のプラグインコマンドを組み合わせるとチャットとかも実装できます。
 * 詳しくはサンプル見てね→https://krmbn0576.github.io/rpgmakermv/
 * 
 * プラグインコマンド：
 * online 1 to chat　変数１番の内容を「chat」という名前で送信します。
 * online 1 from chat　「そのアバターが」送信した「chat」を変数１番に代入します。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

function OnlineManager() {
	throw new Error('This is a static class');
}

function Game_Avatar() {
	this.initialize.apply(this, arguments);
}

(function() {
	'use strict';
	OnlineManager.parameters = PluginManager.parameters('OnlineAvatar');
	OnlineManager.url = 'https://www.gstatic.com/firebasejs/live/3.0/firebase.js';
	OnlineManager.avatarTemplate = {"id":0,"meta":{},"name":"","note":"","pages":[{"conditions":{"actorId":1,"actorValid":false,"itemId":1,"itemValid":false,"selfSwitchCh":"A","selfSwitchValid":false,"switch1Id":1,"switch1Valid":false,"switch2Id":1,"switch2Valid":false,"variableId":1,"variableValid":false,"variableValue":0},"directionFix":false,"image":{"tileId":0,"characterName":"","direction":2,"pattern":1,"characterIndex":0},"list":null,"moveFrequency":5,"moveRoute":{"list":[{"code":45,"parameters":["this.moveOnlineXy()"],"indent":null},{"code":0,"parameters":[]}],"repeat":true,"skippable":false,"wait":false},"moveSpeed":5,"moveType":3,"priorityType":1,"stepAnime":false,"through":true,"trigger":4,"walkAnime":true}],"x":0,"y":0};
	OnlineManager.avatarsInThisMap = null;
	OnlineManager.mapRef = null;
	OnlineManager.selfRef = null;
	OnlineManager.switchRef = null;
	OnlineManager.variableRef = null;
	OnlineManager.user = null;
	OnlineManager.syncBusy = false;	//同期接続する瞬間、送信が受信を上書きするのを阻止

	//ネット上からfirebaseファイルを読み込む
	OnlineManager.initialize = function() {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = this.url;
		script.async = true;
		script.onload = this.awake.bind(this);
		script.onerror = function(e) {
			throw new Error('firebaseの読み込みに失敗しました。F5でやり直してみてください。');
		};
		document.body.appendChild(script);
	};

	//firebaseを起動
	OnlineManager.awake = function() {
		var ps = this.parameters;
		ps['avatarEvent'] = +ps['avatarEvent'];
		ps['syncSwitchStart'] = +ps['syncSwitchStart'];
		ps['syncSwitchEnd'] = +ps['syncSwitchEnd'];
		ps['syncVariableStart'] = +ps['syncVariableStart'];
		ps['syncVariableEnd'] = +ps['syncVariableEnd'];

		try {
			firebase.initializeApp({apiKey: ps['apiKey'], authDomain: ps['authDomain'], databaseURL: ps['databaseURL']});
		} catch(e) {
			throw new Error('apiKeyが正しく設定されていません。ご確認ください。');
		}

		this.auth();
	};

	//firebaseアプリにアクセスして匿名サインイン
	//パスワード認証とかTwitter連携認証でログインさせたい場合はこのメソッドを改造しましょう
	OnlineManager.auth = function() {
		firebase.auth().signInAnonymously().then(this.start.bind(this)).catch(SceneManager.catchException.bind(SceneManager));
	};

	//サインイン完了後
	//オンライン接続のイベント登録に関する記述(xxxRef.on()とか)が書いてある関数はこのメソッドから呼び出すと良さげ
	OnlineManager.start = function(user) {
		this.user = user;

		//再接続時にonDisconnectを張り直す
		var connectedRef = firebase.database().ref('.info/connected');
		connectedRef.on('value', function(data) {
			if (data.val() && OnlineManager.selfRef) OnlineManager.selfRef.onDisconnect().remove();
		});

		//接続が最初のマップ読み込みよりも遅延した時は、今いるマップのオンラインデータを購読
		if (this.mapExists()) this.connectNewMap();

		if ($gameSwitches) this.startSync();
	};

	//スイッチと変数のオンライン同期の開始
	OnlineManager.startSync = function() {
		if (!this.user) return;

		if (this.parameters['syncSwitchStart'] || this.parameters['syncSwitchEnd']) {
			if (this.switchRef) this.switchRef.off();
			else this.switchRef = firebase.database().ref('switches');
			OnlineManager.syncBusy = true;
			this.switchRef.once('value', function(data) {
				OnlineManager.syncBusy = false;
			});
			this.switchRef.on('child_added', function(data) {
				$gameSwitches.setValue(data.key, data.val(), true);
			});
			this.switchRef.on('child_changed', function(data) {
				$gameSwitches.setValue(data.key, data.val(), true);
			});
		}

		if (this.parameters['syncVariableStart'] || this.parameters['syncVariableEnd']) {
			if (this.variableRef) this.variableRef.off();
			else this.variableRef = firebase.database().ref('variables');
			OnlineManager.syncBusy = true;
			this.variableRef.once('value', function(data) {
				OnlineManager.syncBusy = false;
			});
			this.variableRef.on('child_added', function(data) {
				$gameVariables.setValue(data.key, data.val(), true);
			});
			this.variableRef.on('child_changed', function(data) {
				$gameVariables.setValue(data.key, data.val(), true);
			});
		}
	};

	//新しいマップのオンラインデータを購読してアバターの情報を受け取る
	OnlineManager.connectNewMap = function() {
		if (!this.user || !this.parameters['avatarEvent']) return;

		//前のマップのコールバックはデタッチして、座標情報をリムーブ
		if (this.mapRef) {
			this.mapRef.off();
			this.selfRef.onDisconnect().cancel();
			this.selfRef.remove();
		}

		if (!$dataMap.meta || $dataMap.meta.avatar_off) {
			this.mapRef = null;
			this.selfRef = null;
			this.avatarsInThisMap = null;
			return;
		}

		this.mapRef = firebase.database().ref('map' + $gameMap.mapId().padZero(3));
		this.selfRef = this.mapRef.child(this.user.uid);
		this.selfRef.onDisconnect().remove();	//切断時にキャラ座標をリムーブ

		var avatarTemplate = this.avatarTemplate;
		var avatarsInThisMap = this.avatarsInThisMap = {};
		if (!avatarTemplate.pages[0].list) {
			avatarTemplate.pages[0].list = $dataCommonEvents[this.parameters['avatarEvent']].list;
		}

		//他プレイヤーが同マップに入場
		this.mapRef.on('child_added', function(data) {
			if (OnlineManager.shouldDisplay(data)) {
				avatarsInThisMap[data.key] = new Game_Avatar(avatarTemplate, data.val());
			}
		});

		//他プレイヤーが同マップで移動
		this.mapRef.on('child_changed', function(data) {
			if (OnlineManager.shouldDisplay(data)) {
				if (avatarsInThisMap[data.key]) {
					avatarsInThisMap[data.key].setOnlineData(data.val());
				} else {	//念の為
					avatarsInThisMap[data.key] = new Game_Avatar(avatarTemplate, data.val());
				}
			}
		});

		//他プレイヤーが同マップから退場
		this.mapRef.on('child_removed', function(data) {
			if (OnlineManager.shouldDisplay(data)) {
				if (avatarsInThisMap[data.key]) avatarsInThisMap[data.key].erase();
				delete avatarsInThisMap[data.key];
			}
		});

		this.sendPlayerInfo();
	};

	//送信するプレイヤー情報
	OnlineManager.playerInfo = function() {
		var $ = $gamePlayer;
		return {x: $.x, y: $.y, direction: $.direction(), speed: $.realMoveSpeed(), charaName: $.characterName(), charaIndex: $.characterIndex()};
	};

	//プレイヤー情報をオンライン上に送信
	OnlineManager.sendPlayerInfo = function() {
		if (this.selfRef) this.selfRef.update(this.playerInfo());
	};

	//プラグインコマンドで指定した情報とプレイヤー情報をオンライン上に送信
	OnlineManager.sendCustomInfo = function(key, value) {
		var info = this.playerInfo();
		info[key] = value;
		if (this.selfRef) this.selfRef.update(info);
	};

	//プレイヤー情報を削除
	OnlineManager.removePlayerInfo = function() {
		if (this.selfRef) this.selfRef.remove();
	};

	//$gameMapや$dataMapがnullでないことを保証
	OnlineManager.mapExists = function() {
		return DataManager.isMapLoaded();
	};

	//送られたデータが自分自身でなく、マップが読み込まれている時は表示
	OnlineManager.shouldDisplay = function(data) {
		return data.key !== this.user.uid && this.mapExists();
	};

	//スイッチが同期範囲内
	OnlineManager.switchInRange = function(switchId) {
		return this.parameters['syncSwitchStart'] <= switchId && switchId <= this.parameters['syncSwitchEnd'];
	};

	//変数が同期範囲内
	OnlineManager.variableInRange = function(variableId) {
		return this.parameters['syncVariableStart'] <= variableId && variableId <= this.parameters['syncVariableEnd'];
	};

	//スイッチを送信
	OnlineManager.sendSwitch = function(switchId, value) {
		if (this.switchRef && !this.syncBusy && this.switchInRange(switchId)) {
			var send = {};
			send[switchId] = value;
			this.switchRef.update(send);
		}
	};

	//変数を送信
	OnlineManager.sendVariable = function(variableId, value) {
		if (this.variableRef && !this.syncBusy && this.variableInRange(variableId)) {
			var send = {};
			send[variableId] = value;
			this.variableRef.update(send);
		}
	};



	//OnlineManagerを起動
	var _SceneManager_initialize = SceneManager.initialize;
	SceneManager.initialize = function() {
		_SceneManager_initialize.apply(this, arguments);
		OnlineManager.initialize();
	};

	//同じマップの時は$dataMapを読み込み直さない
	var _DataManager_loadMapData = DataManager.loadMapData;
	DataManager.loadMapData = function(mapId) {
		if ($gamePlayer.isTransferring() || SceneManager.isPreviousScene(Scene_Load)) {
			_DataManager_loadMapData.apply(this, arguments);
		}
	};

	//歩行時
	var _Game_Player_moveStraight = Game_Player.prototype.moveStraight;
	Game_Player.prototype.moveStraight = function(d) {
		var prevD = this.direction();
		_Game_Player_moveStraight.apply(this, arguments);
		//前回と位置か方向が違う時のみ送信する
		if (this.isMovementSucceeded() || d !== prevD) {
			OnlineManager.sendPlayerInfo();
		}
	};

	//グラフィック変更時
	var _Game_Player_setImage = Game_Player.prototype.setImage;
	Game_Player.prototype.setImage = function(characterName, characterIndex) {
		_Game_Player_setImage.apply(this, arguments);
		if (!this.isTransferring()) OnlineManager.sendPlayerInfo();	//場所移動した時は不要
	};

	//マップ切り替え時
	var _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
	Game_Player.prototype.performTransfer = function() {
		if ($gameMap.mapId() === $gamePlayer.newMapId()) {
			for (var key in OnlineManager.avatarsInThisMap) OnlineManager.avatarsInThisMap[key].erase();
		}
		_Game_Player_performTransfer.apply(this, arguments);
		OnlineManager.connectNewMap();
	};

	//ロードした時はセーブ時点の残存アバターを消す
	//（Scene_Load.onLoadSuccessにフックすると$dataMapに触れないのでこのタイミング）
	var _Scene_Map_start = Scene_Map.prototype.start;
	Scene_Map.prototype.start = function() {
		_Scene_Map_start.apply(this, arguments);
		if (SceneManager.isPreviousScene(Scene_Load)) {
			$gameMap.events().forEach(function(event) {if (event instanceof Game_Avatar) event.erase();});
			OnlineManager.connectNewMap();
		}
	};

	//タイトルに戻った時にもキャラ座標をリムーブ
	var _Scene_Title_start = Scene_Title.prototype.start;
	Scene_Title.prototype.start = function() {
		OnlineManager.removePlayerInfo();
		_Scene_Title_start.apply(this, arguments);
	};

	//プラグインコマンド
	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.apply(this, arguments);
		if (command.toLowerCase() === 'online') {
			switch (args[1].toLowerCase()) {
				case 'from':
					var online = this.character(0).online;
					$gameVariables.setValue(+args[0], online && online[args[2]]);
					break;
				case 'to':
					OnlineManager.sendCustomInfo(args[2], $gameVariables.value(+args[0]));
					break;
				default:
					break;
			}
		}
	};

	//スイッチ同期
	var _Game_Switches_setValue = Game_Switches.prototype.setValue;
	Game_Switches.prototype.setValue = function(switchId, value, byOnline) {
		_Game_Switches_setValue.call(this, switchId, value);
		if (!byOnline) OnlineManager.sendSwitch(switchId, this.value(switchId));
	};

	//変数同期
	var _Game_Variables_setValue = Game_Variables.prototype.setValue;
	Game_Variables.prototype.setValue = function(variableId, value, byOnline) {
		_Game_Variables_setValue.call(this, variableId, value);
		if (!byOnline) OnlineManager.sendVariable(variableId, this.value(variableId));
	};

	//スイッチ・変数の初期化時に、再同期処理（タイミングはスイッチが代表する）
	var _Game_Switches_initialize = Game_Switches.prototype.initialize;
	Game_Switches.prototype.initialize = function() {
		_Game_Switches_initialize.apply(this, arguments);
		OnlineManager.startSync();
	};

	//オンライン経由でスイッチ・変数が変更された時、デバッグウィンドウ(F9)に反映
	//やや重い処理だが、F9はスマホやブラウザで実行されることはないためこれで大丈夫
	var _Window_DebugEdit_update = Window_DebugEdit.prototype.update;
	Window_DebugEdit.prototype.update = function() {
		_Window_DebugEdit_update.apply(this, arguments);
		this.refresh();
	};



	//Game_Avatar
	//アバターとして使用するマップイベントを定義
	Game_Avatar.prototype = Object.create(Game_Event.prototype);
	Game_Avatar.prototype.constructor = Game_Avatar;

	Game_Avatar.prototype.initialize = function(eventData, onlineData) {
		var mapId = $gameMap.mapId();
		var eventId = $gameMap.getEventIdSequence ? $gameMap.getEventIdSequence() : $gameMap._events.length;

		['A', 'B', 'C', 'D'].forEach(function(switchId) {
			var key = [mapId, eventId, switchId];
			$gameSelfSwitches.setValue(key, false);
		});

		this.eventData = eventData;
		Game_Event.prototype.initialize.call(this, mapId, eventId);
		this.locate(onlineData.x, onlineData.y);
		this.setDirection(onlineData.direction);
		this.setMoveSpeed(onlineData.speed);
		this.setImage(onlineData.charaName, onlineData.charaIndex);
		this.setOnlineData(onlineData);
		$gameMap._events.push(this);

		var scene = SceneManager._scene;
		if (scene instanceof Scene_Map) {
			var sprite = new Sprite_Character(this);
			scene._spriteset._characterSprites.push(sprite);
			scene._spriteset._tilemap.addChild(sprite);
		}
	};

	Game_Avatar.prototype.event = function() {
		return this.eventData;
	};

	Game_Avatar.prototype.setOnlineData = function(onlineData) {
		this.online = onlineData;
	};

	//オンライン座標と同じ位置まで歩く（avatarTemplateのカスタムルートに設定されています）
	Game_Avatar.prototype.moveOnlineXy = function() {
		this.setMoveSpeed(this.online.speed);
		this.setImage(this.online.charaName, this.online.charaIndex);
		var distance = $gameMap.distance(this.x, this.y, this.online.x, this.online.y);
		if (distance === 0) {	//座標に到達しているなら方向転換のみ
			this.setDirection(this.online.direction);
		} else if (distance > 5) {	//座標まで５歩を超えて離れているならワープ
			this.locate(this.online.x, this.online.y);
			this.setDirection(this.online.direction);
		} else {	//座標まで１～５歩ならその座標へ歩く
			this.moveTowardCharacter(this.online);
		}
	};
})();