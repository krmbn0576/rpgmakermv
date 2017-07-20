//=============================================================================
// MessageCount.js
// MIT License (C) 2017 くらむぼん
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc 文章だけの長いシーンを検出します。
 * @author くらむぼん
 *
 * @param warningCount
 * @desc 警告を表示するクリック回数
 * @default 10
 *
 * @help
 * このプラグインは、プレイヤーが自由に操作できずにただ文章を
 * 読み進めるだけのシーンが長く続くのを検出してお知らせするプラグインです。
 * 選択肢や戦闘、移動などのプレイヤーからのアクションを挟むことなく
 * warningCountで指定した回数以上のメッセージ送りが発生すると、
 * 右上にメッセージ送り回数が警告表示されます。
 * プレイヤーが操作できない長いシーンを検出する際にご活用下さい。
 * 
 * 
 * 「プレイヤーからのアクション」の定義：
 * 選択肢の表示・数値入力の処理・アイテム選択の処理
 * 条件分岐（「ボタンが押されている」を用いた時のみ）
 * 「シーン制御」系命令（戦闘の処理～タイトル画面へ戻る）
 * プレイヤーが通常歩行できるようになった時
 * 
 * 
 * 警告表示の見方：
 * [メッセージ（先頭の10文字）]メッセージ送り回数(かかった時間)
 * 
 * 
 * ライセンス：
 * このプラグインを利用する時は、作者名をプラグインから削除しないでください。
 * それ以外の制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var parameters = PluginManager.parameters('MessageCount');
	var warningCount = toNumber(parameters['warningCount'], 10);
	var inScene, sceneName, messageCount, startTime;

	var element = document.createElement('div');
	element.style.position = 'fixed';
	element.style.color = 'white';
	element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
	element.style.border = '2px solid black';
	element.style.padding = '5px';
	element.style.top = '20px';
	element.style.right = '0px';
	element.innerHTML = 'メッセージ・カウント<br>';
	document.body.appendChild(element);

	function isNumber(str) {
		return !!str && !isNaN(str);
	}

	function toNumber(str, def) {
		return isNumber(str) ? +str : def;
	}

	function onSceneStarted(text) {
		if (!inScene && !$gameParty.inBattle()) {
			inScene = true;
			sceneName = text.length > 10 ? text.slice(0, 10) + '～' : text;
			messageCount = 0;
			startTime = Date.now();
		}
	}

	function onSceneEnded() {
		if (inScene && !$gameParty.inBattle() && messageCount >= warningCount) {
			var deltaTime = Date.now() - startTime;
			var minutes = Math.floor(deltaTime / 1000 / 60);
			var seconds = Math.floor(deltaTime / 1000) % 60;
			element.innerHTML += '[%1] %2回 (%3:%4)<br>'.format(sceneName, messageCount, minutes, seconds.padZero(2));
		}
		inScene = false;
	}

	var _Game_Message_add = Game_Message.prototype.add;
	Game_Message.prototype.add = function(text) {
		_Game_Message_add.apply(this, arguments);
		onSceneStarted(text);
	};

	var _Window_Message_startPause = Window_Message.prototype.startPause;
	Window_Message.prototype.startPause = function() {
		_Window_Message_startPause.apply(this, arguments);
		messageCount++;
	};

	var _Window_Message_startInput = Window_Message.prototype.startInput;
	Window_Message.prototype.startInput = function() {
		var result = _Window_Message_startInput.apply(this, arguments);
		if (result) {
			onSceneEnded();
		}
		return result;
	};

	var _Game_Interpreter_command111 = Game_Interpreter.prototype.command111;
	Game_Interpreter.prototype.command111 = function() {
		var result = _Game_Interpreter_command111.apply(this, arguments);
		if (this._params[0] === 11) {
			onSceneEnded();
		}
		return result;
	};

	var _SceneManager_goto = SceneManager.goto;
	SceneManager.goto = function(sceneClass) {
		_SceneManager_goto.apply(this, arguments);
		if (sceneClass !== Scene_Map) {
			onSceneEnded();
		}
	};

	var _Scene_Map_update = Scene_Map.prototype.update;
	Scene_Map.prototype.update = function() {
		_Scene_Map_update.apply(this, arguments);
		element.style.zIndex = 12;
		if ($gamePlayer.canMove()) {
			onSceneEnded();
		}
	};
})();