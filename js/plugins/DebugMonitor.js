//=============================================================================
// DebugMonitor.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2016/10/25 リアルタイム変更モードの起動キーをCtrlからTabに変更しました
// 2017/03/25 プラグインパラメータに0を指定できないバグを修正しました
//=============================================================================

/*:
 * @plugindesc スイッチ・変数の状態を画面上にリアルタイム表示します。
 * @author くらむぼん
 *
 * @param monitorX
 * @desc モニターのX座標
 * @default 0
 *
 * @param monitorY
 * @desc モニターのY座標
 * @default 0
 *
 * @param monitorW
 * @desc モニターの幅。「変数名が長くて潰れるんだけど！」という方は大きくしましょう
 * @default 240
 *
 * @help
 * デバッグメニューで指定したスイッチ・変数をモニターします。
 * テストプレイ中のみ機能します。
 * 
 * 使い方：
 * １．テストプレイ中にF9キーを押してデバッグメニューを表示
 * ２．監視したいスイッチ・変数の上でShiftキーを押す
 * 　　（監視対象に設定すると右端に*マークが表示されます）
 * ３．デバッグメニューを閉じると指定座標にモニターが現れ、監視対象が表示されます
 * 　　（通常のマップ上か、バトル中のみ表示されます。メニューや店などは非対応）
 * ４．Tabキーを押すと、監視対象の値をリアルタイムに変更できるモードになります
 * 　　（操作方法は普通のデバッグメニューと同じです。再度Tabで解除）
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	if (!Utils.isOptionValid('test') || !Utils.isNwjs()) return;
	var parameters = PluginManager.parameters('DebugMonitor');
	var monitorX = toNumber(parameters['monitorX'], 0);
	var monitorY = toNumber(parameters['monitorY'], 0);
	var monitorW = toNumber(parameters['monitorW'], 240);
	var active = false;
	var switches = {};
	var variables = {};

	function toNumber(str, def) {
		return isNaN(str) ? def : +(str || def);
	}

	//モニターの定義。Tabキーでリアルタイム変更モード
	function Window_Monitor() {
		this.initialize.apply(this, arguments);
	}

	Window_Monitor.prototype = Object.create(Window_Command.prototype);
	Window_Monitor.prototype.constructor = Window_Monitor;

	Window_Monitor.prototype.initialize = function(x, y) {
		Window_Command.prototype.initialize.call(this, x, y);
		this.active = active;
	};

	Window_Monitor.prototype.windowWidth = function() {
		return monitorW;
	};

	Window_Monitor.prototype.makeCommandList = function() {
		for (var switchId in switches) {
			if (switches[switchId]) {
				this.addCommand('', 'S', true, switchId);
			}
		}
		for (var variableId in variables) {
			if (variables[variableId]) {
				this.addCommand('', 'V', true, variableId);
			}
		}
		if (!this._list.length) {
			this.hide();
			active = this.active = false;
		}
	};

	Window_Monitor.prototype.isOkEnabled = function() {
		return false;
	};

	Window_Monitor.prototype.update = function() {
		Window_Command.prototype.update.call(this);
		if (Input.isTriggered('tab') && this.visible) active = this.active = !this.active;
		for (var i = 0; i < this._list.length; i++) {
			var k = this._list[i].symbol;
			var n = this._list[i].ext;
			if (this.active && this.index() === i) {
				if (k === 'S') {
					if (Input.isRepeated('ok') || Input.isRepeated('left') || Input.isRepeated('right')) {
						SoundManager.playCursor();
						$gameSwitches.setValue(n, !$gameSwitches.value(n));
					}
				} else {
					var value = $gameVariables.value(n);
					if (Input.isRepeated('right')) {
						value++;
					}
					if (Input.isRepeated('left')) {
						value--;
					}
					if (Input.isRepeated('pagedown')) {
						value += 10;
					}
					if (Input.isRepeated('pageup')) {
						value -= 10;
					}
					if ($gameVariables.value(n) !== value) {
						$gameVariables.setValue(n, value);
						SoundManager.playCursor();
					}
				}
			}
			if (k === 'S') {
				var name = $dataSystem.switches[n];
				var newValue = (name || 'S[' + n.padZero(4) + ']') + ':' + ($gameSwitches.value(n) ? '[ON]' : '[OFF]');
			} else {
				var name = $dataSystem.variables[n];
				var newValue = (name || 'V[' + n.padZero(4) + ']') + ':' + $gameVariables.value(n);
			}
			if (this._list[i].name !== newValue) {
				this._list[i].name = newValue;
				var update = true;
			}
		}
		if (update) {
			this.contents.clear();
			this.drawAllItems();
		}
	};

	Window_Monitor.prototype.isOpenAndActive = function() {
		return this.isOpen() && this.active;
	};



	//F9キーで出せるデバッグメニューを拡張し、Shiftキーで監視対象に登録できるようにする
	var _Window_DebugEdit_update = Window_DebugEdit.prototype.update;
	Window_DebugEdit.prototype.update = function() {
		_Window_DebugEdit_update.apply(this, arguments);
		this.updateMonitor();
	};

	Window_DebugEdit.prototype.updateMonitor = function() {
		if (this.active && Input.isRepeated('shift')) {
			if (this._mode === 'switch') {
				var switchId = this.currentId();
				switches[switchId] = !switches[switchId];
			} else {
				var variableId = this.currentId();
				variables[variableId] = !variables[variableId];
			}
			SoundManager.playCursor();
			this.redrawCurrentItem();
		}
	};

	Window_DebugEdit.prototype.itemStatus = function(dataId) {
		if (this._mode === 'switch') {
			return ($gameSwitches.value(dataId) ? '[ON]' : '[OFF]') + (switches[dataId] ? '*' : '');
		} else {
			return String($gameVariables.value(dataId)) + (variables[dataId] ? '*' : '');
		}
	};



	//リアルタイム変更モードの時、他のメニューのカーソルが動いたりプレイヤーが歩いたりしないようにする
	var _Window_Selectable_isOpenAndActive = Window_Selectable.prototype.isOpenAndActive;
	Window_Selectable.prototype.isOpenAndActive = function() {
		if (SceneManager._scene instanceof Scene_Map && active) return false;
		if (SceneManager._scene instanceof Scene_Battle && active) return false;
		return _Window_Selectable_isOpenAndActive.apply(this, arguments);
	};

	var _Game_Player_canMove = Game_Player.prototype.canMove;
	Game_Player.prototype.canMove = function() {
		return !active && _Game_Player_canMove.apply(this, arguments);
	};



	//モニターウインドウをマップorバトルシーンに登録
	var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
	Scene_Map.prototype.createAllWindows = function() {
		_Scene_Map_createAllWindows.apply(this, arguments);
		this.createMonitorWindow();
	};

	var _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
	Scene_Battle.prototype.createAllWindows = function() {
		_Scene_Battle_createAllWindows.apply(this, arguments);
		this.createMonitorWindow();
	};

	function createMonitorWindow() {
		this._monitorWindow = new Window_Monitor(monitorX, monitorY);
		this.addWindow(this._monitorWindow);
	}

	Scene_Map.prototype.createMonitorWindow = Scene_Battle.prototype.createMonitorWindow = createMonitorWindow;
})();