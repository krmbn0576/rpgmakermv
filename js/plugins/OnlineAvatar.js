//=============================================================================
// OnlineAvatar.js
// PUBLIC DOMAIN
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
 * @help
 * 外部のBaaSであるFirebaseと連携して、MMORPGのような
 * オンラインのアバター（プレイヤーキャラ）表示に対応するプラグインです。
 * 
 * 始め方：
 * １．Firebaseの公式サイト(https://console.firebase.google.com/)で、
 * 　　Googleアカウントを(持って無ければ)取得し、「新規プロジェクトを作成」する
 * ２．「ウェブアプリにFirebaseを追加」ボタンを押して
 * 　　apiKey、authDomain、databaseURLをプラグインのパラメータにコピペ
 * ３．左メニューから「Auth」→上部から「ログイン方法」→「匿名」を有効にする
 * ４．ゲームを多重起動すると、すべてのプレイヤーのアバターが画面に表示されます！
 * ※テストプレイボタンからは多重起動できないので、Firefoxからindex.htmlを開く
 * 
 * 応用編：
 * メモに<avatar>と書かれたマップイベントが現在のマップにあるとき、
 * そのイベントの「ページ１」が画面に表示されるアバターにコピーされます。
 * （ただし今のところ強制的に「並列処理」扱いになります）これと下記の
 * プラグインコマンドを組み合わせるとチャットとかできます詳しくはサンプル見てね
 * 
 * プラグインコマンド：
 * online 1 to chat　変数１番の内容を「chat」という名前で送信します。
 * online 1 from chat　「そのアバターが」送信した「chat」を変数１番に代入します。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var parameters = PluginManager.parameters('OnlineAvatar');

	(function() {
		var url = 'https://www.gstatic.com/firebasejs/live/3.0/firebase.js';

		//firebase側で発生したエラーでゲームを止めないようにする
		var _SceneManager_onError = SceneManager.onError;
		SceneManager.onError = function(e) {
			if (e.filename === url) return;
			_SceneManager_onError.apply(this, arguments);
		};

		//ネット上からfirebaseファイルを読み込む
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		script.async = true;
		script.onload = initialize;
		script.onerror = function(e) {
			setTimeout(function() {
				throw new Error('firebaseの読み込みに失敗しました。F5でやり直してみてください。');
			}, 100);
		};
		document.body.appendChild(script);
	})();

	//firebaseアプリにアクセスして匿名サインイン
	function initialize() {
		try {
			firebase.initializeApp({apiKey: parameters['apiKey'], authDomain: parameters['authDomain'], databaseURL: parameters['databaseURL']});
		} catch(e) {
			setTimeout(function() {
				throw new Error('apiKeyが正しく設定されていません。ご確認ください。');
			}, 100);
		}
		firebase.auth().signInAnonymously().then(start);
	}

	//サインイン完了後
	function start(user) {
		var avatarTemplate = {"id":0,"meta":{},"name":"","note":"","pages":[{"conditions":{"actorId":1,"actorValid":false,"itemId":1,"itemValid":false,"selfSwitchCh":"A","selfSwitchValid":false,"switch1Id":1,"switch1Valid":false,"switch2Id":1,"switch2Valid":false,"variableId":1,"variableValid":false,"variableValue":0},"directionFix":false,"image":{"tileId":0,"characterName":"","direction":2,"pattern":1,"characterIndex":0},"list":[{"code":0,"indent":0,"parameters":[]}],"moveFrequency":3,"moveRoute":{"list":[{"code":0,"parameters":[]}],"repeat":true,"skippable":false,"wait":false},"moveSpeed":5,"moveType":0,"priorityType":1,"stepAnime":false,"through":true,"trigger":4,"walkAnime":true}],"x":0,"y":0};
		var mapRef, selfRef, prevPlayerInfo;

		//歩行時
		var _Game_Player_moveStraight = Game_Player.prototype.moveStraight;
		Game_Player.prototype.moveStraight = function(direction) {
			_Game_Player_moveStraight.apply(this, arguments);
			//前回と同じ位置・方向の時は送らない
			var info = JSON.stringify(playerInfo()) + $gameMap.mapId();
			if (selfRef && info !== prevPlayerInfo) {
				selfRef.update(playerInfo());
				prevPlayerInfo = info;
			}
		};

		//グラフィック変更時
		var _Game_Player_setImage = Game_Player.prototype.setImage;
		Game_Player.prototype.setImage = function(characterName, characterIndex) {
			(_Game_Player_setImage || Game_Character.prototype.setImage).apply(this, arguments);
			if (selfRef && !this.isTransferring()) selfRef.update(playerInfo());	//場所移動した時は不要
		};

		//マップ切り替え時
		var _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
		Game_Player.prototype.performTransfer = function() {
			//前のマップのコールバックはデタッチして、座標情報をリムーブ
			if (mapRef) {
				mapRef.off();
				selfRef.onDisconnect().cancel();
				selfRef.remove();
			}

			//ここで$gamePlayerのプロパティが書き換わる
			_Game_Player_performTransfer.apply(this, arguments);

			mapRef = firebase.database().ref('map' + $gameMap.mapId().padZero(3));
			selfRef = mapRef.child(user.uid);
			selfRef.onDisconnect().remove();	//切断時にキャラ座標をリムーブ
			var avatarsInThisMap = {};
			$dataMap.events.forEach(function(event) {
				if (event && event.meta.avatar) avatarTemplate.pages[0].list = event.pages[0].list;
			});

			//他プレイヤーが同マップに入場
			mapRef.on('child_added', function(data) {
				if (data.key !== user.uid && isMapLoaded()) {
					avatarsInThisMap[data.key] = new Game_Avatar(avatarTemplate, data.val());
					avatarsInThisMap[data.key].online = data.val();
				}
			});

			//他プレイヤーが同マップで移動
			mapRef.on('child_changed', function(data) {
				if (data.key !== user.uid && isMapLoaded()) {
					if (avatarsInThisMap[data.key]) {
						avatarsInThisMap[data.key].moveSmooth(data.val());
					} else {	//念の為
						avatarsInThisMap[data.key] = new Game_Avatar(avatarTemplate, data.val());
					}
					avatarsInThisMap[data.key].online = data.val();
				}
			});

			//他プレイヤーが同マップから退場
			mapRef.on('child_removed', function(data) {
				if (data.key !== user.uid && isMapLoaded()) {
					if (avatarsInThisMap[data.key]) avatarsInThisMap[data.key].erase();
					delete avatarsInThisMap[data.key];
				}
			});

			selfRef.update(playerInfo());
		};

		//ロードした時はセーブ時点の残存アバターを消す
		//（Scene_Load.onLoadSuccessにフックすると$dataMapに触れないのでこのタイミング）
		var _Scene_Map_start = Scene_Map.prototype.start;
		Scene_Map.prototype.start = function() {
			_Scene_Map_start.apply(this, arguments);
			if (SceneManager.isPreviousScene(Scene_Load)) {
				$gameMap.events().forEach(function(event) {if (event instanceof Game_Avatar) event.erase();});
				$gamePlayer.performTransfer();
			}
		};

		//タイトルに戻った時にもキャラ座標をリムーブ
		var _Scene_Title_start = Scene_Title.prototype.start;
		Scene_Title.prototype.start = function() {
			if (selfRef) selfRef.remove();
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
					var info = playerInfo();
					info[args[2]] = $gameVariables.value(+args[0]);
					if (selfRef) selfRef.update(info);
					break;
				default:
					break;
				}
			}
		};

		//接続が最初のマップ読み込みよりも遅延した時は、今いるマップでコールバックを登録する
		if (isMapLoaded() && !$gamePlayer.isTransferring()) $gamePlayer.performTransfer();
	}

	//デバッグ用。引数の値をそのまま返してくれるのでどこにでも挟めるよ！
	function log(value) {
		console.log(value);
		return value;
	}

	//送信するプレイヤー情報
	function playerInfo() {
		var $ = $gamePlayer;
		return {x: $.x, y: $.y, direction: $.direction(), speed: $.realMoveSpeed(), charaName: $.characterName(), charaIndex: $.characterIndex()};
	}

	//$gameMapや$dataMapがnullでないことを保証
	function isMapLoaded() {
		return DataManager.isMapLoaded();
	}

	//アバターとして使用するマップイベントを定義
	function Game_Avatar() {
		this.initialize.apply(this, arguments);
	}

	Game_Avatar.prototype = Object.create(Game_Event.prototype);
	Game_Avatar.prototype.constructor = Game_Avatar;

	Game_Avatar.prototype.initialize = function(eventData, onlineData) {
		var mapId = $gameMap.mapId();
		for (var eventId = 1; eventId < $gameMap._events.length && !!$gameMap._events[eventId]; eventId++);

		['A', 'B', 'C', 'D'].forEach(function(switchId) {
			var key = [mapId, eventId, switchId];
			$gameSelfSwitches.setValue(key, false);
		});

		eventData = JsonEx.makeDeepCopy(eventData);
		eventData.id = eventId;
		eventData.x = onlineData.x;
		eventData.y = onlineData.y;
		this._eventData = eventData;

		Game_Event.prototype.initialize.call(this, mapId, eventId);
		this.setDirection(onlineData.direction);
		this.setMoveSpeed(onlineData.speed);
		this.setImage(onlineData.charaName, onlineData.charaIndex);
		$gameMap._events[eventId] = this;

		var scene = SceneManager._scene;
		if (scene instanceof Scene_Map) {
			var sprite = new Sprite_Character(this);
			scene._spriteset._characterSprites.push(sprite);
			scene._spriteset._tilemap.addChild(sprite);
		}
	};

	Game_Avatar.prototype.event = function() {
		return this._eventData;
	};

	//座標情報が飛び飛びでもスムーズに移動する
	Game_Avatar.prototype.moveSmooth = function(onlineData) {		
		var dx = onlineData.x - this.x;
		var dy = onlineData.y - this.y;
		var C = Game_Character;
		var route = {list: [], repeat: false, skippable: true, wait: false};

		this.setMoveSpeed(onlineData.speed);
		this.setImage(onlineData.charaName, onlineData.charaIndex);

		if (dx !== 0) {
			var l = Math.abs(dx);
			var d = dx > 0 ? C.ROUTE_MOVE_RIGHT : C.ROUTE_MOVE_LEFT;
			for (var i = 0; i < l; i++) {
				route.list.push({code: d, parameters: []});
			}
		}

		if (dy !== 0) {
			var l = Math.abs(dy);
			var d = dy > 0 ? C.ROUTE_MOVE_DOWN : C.ROUTE_MOVE_UP;
			for (var i = 0; i < l; i++) {
				route.list.push({code: d, parameters: []});
			}
		}

		var d = {2: C.ROUTE_TURN_DOWN, 4: C.ROUTE_TURN_LEFT, 6: C.ROUTE_TURN_RIGHT, 8: C.ROUTE_TURN_UP};
		route.list.push({code: d[onlineData.direction], parameters: []});
		route.list.push({code: 0, parameters: []});

		this.forceMoveRoute(route);
	};

	//グローバルオブジェクトに登録
	window.Game_Avatar = Game_Avatar;
})();