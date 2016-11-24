//=============================================================================
// AudioSource.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2016/10/18 BGMとBGSの音源化を、一度指定すれば自動調節としました
// 2016/10/21 音量・位相調節の距離測定単位をマス単位からドット単位に変更しました
//=============================================================================

/*:
 * @plugindesc 音源と聞き手の位置関係に応じて自動的に音量・位相を調節します。
 * @author くらむぼん
 *
 * @param listener
 * @desc 音の「聞き手」をscreenかplayerから選ぶ
 * @default screen
 *
 * @param decay
 * @desc 音源と聞き手の距離が一歩広がった時の音量変化倍率（％）
 * @default 85
 *
 * @param pan
 * @desc 音源が聞き手の一歩右に居る時の変化位相
 * @default 10
 *
 * @param cutoff
 * @desc 音を鳴らすことを許可する最小の音量（％）
 * @default 1
 *
 * @help
 * マップイベントの「ルート設定」内で効果音を鳴らすと、
 * そのイベントが配置されている座標から鳴ったかのように音量・位相を調節します。
 * 具体的には、「音源」と「聞き手」が離れているほど音量が小さくなり、
 * 「聞き手」より「音源」が右にあるほど位相が増加（＝右から聞こえる）します。
 * ※イベントコマンドの「SEの演奏」では自動調節しません。うまく使い分けましょう。
 * 
 * なお基準となる音量は効果音の演奏を指定した時の音量です。
 * 音源と聞き手が同じかすぐ隣のマスに居る時は基準音量で鳴らされ、
 * そこから一歩離れるたびに音が小さくなっていきます。
 * 
 * プラグインパラメータ：
 * listener : 発信される音の「聞き手」を設定します。
 * 　screen　「画面の中央マス」が聞き手になります。
 * 　player　「プレイヤー」が聞き手になります。
 * decay : 音源と聞き手との間の距離が「一歩」広がるたびに音量がdecay％倍されます。
 * 　基本的には0から100までの値を想定しています。100以上の値を入れると
 * 　遠ざかるほど音が大きくなる、というすこし不思議な演出もできます。
 * pan : 音源が「一歩」右に移動すると、位相がpanだけ変化します。
 * 　逆に音源が一歩左へ移動すると位相が-pan変化します。
 * cutoff : 音を鳴らすことを許可する最小の音量（％）です。
 * 　計算後の音量がこの値を下回ると強制的に音量０％になります。
 * 
 * プラグインコマンド：
 * audiosource listener 1
 * 指定したID（この場合は1）のマップイベントを聞き手にします。
 * （ちなみに0を指定すると「このイベント」を聞き手にします）
 * 聞き手は常に一つですので、スクリーンorプレイヤーは聞き手ではなくなります。
 * 
 * audiosource listener reset
 * マップイベントの聞き手化を解除し、スクリーンかプレイヤーに聞き手を戻します。
 * 
 * audiosource bgm 1
 * audiosource bgs 1
 * 現在流れているBGM/BGSの音量と位相を、
 * 「指定したIDのマップイベントから鳴っている」風に聞こえるように調節します。
 * （0を指定すると「このイベント」から鳴らします）
 * 設置されたラジオから曲が流れている演出などにお使いください。
 * 
 * audiosource bgm reset
 * audiosource bgs reset
 * BGM/BGSの音源化を解除し、通常通りの演奏に戻します。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var parameters = PluginManager.parameters('AudioSource');
	var listener = parameters['listener'];
	var decay = (+parameters['decay'] || 85).clamp(0, Infinity);
	var pan = +parameters['pan'] || 10;
	var cutoff = (+parameters['cutoff'] || 1).clamp(0, 100);
	var listenerEvent = null;
	var bgmSource = null;
	var bgsSource = null;

	//効果音の音量調節（マップイベントのルート設定から鳴らした時のみ）
	var _Game_Character_processMoveCommand = Game_Character.prototype.processMoveCommand;
	Game_Character.prototype.processMoveCommand = function(command) {
		if (command.code === Game_Character.ROUTE_PLAY_SE) {
			var se = command.parameters[0];
			var lastVolume = se.volume;
			var lastPan = se.pan;
			adjust(se, this);
			if (se.volume >= cutoff) AudioManager.playSe(se);
			se.volume = lastVolume;
			se.pan = lastPan;
		}
		else _Game_Character_processMoveCommand.apply(this, arguments);
	};

	//BGM、BGSの音量調節（毎フレーム）
	AudioManager.updateAudioSource = function() {
		var bgm = this._currentBgm;
		if (bgmSource && bgm) {
			var lastVolume = bgm.volume;
			var lastPan = bgm.pan;
			adjust(bgm, bgmSource);
			if (bgm.volume < cutoff) bgm.volume = 0;
			this.updateBgmParameters(bgm);
			bgm.volume = lastVolume;
			bgm.pan = lastPan;
		}
		var bgs = this._currentBgs;
		if (bgsSource && bgs) {
			var lastVolume = bgs.volume;
			var lastPan = bgs.pan;
			adjust(bgs, bgsSource);
			if (bgs.volume < cutoff) bgs.volume = 0;
			this.updateBgsParameters(bgs);
			bgs.volume = lastVolume;
			bgs.pan = lastPan;
		}
	};

	var _Game_Map_update = Game_Map.prototype.update;
	Game_Map.prototype.update = function(sceneActive) {
		_Game_Map_update.apply(this, arguments);
		AudioManager.updateAudioSource();
	};

	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.apply(this, arguments);
		if (command.toLowerCase() === 'audiosource') {
			switch (args[0].toLowerCase()) {
				case 'listener':
					if (!args[1] || args[1].toLowerCase() === 'reset') listenerEvent = null;
					else listenerEvent = this.character(+args[1]);
					break;
				case 'bgm':
					if (!args[1] || args[1].toLowerCase() === 'reset') bgmSource = null;
					else bgmSource = this.character(+args[1]);
					break;
				case 'bgs':
					if (!args[1] || args[1].toLowerCase() === 'reset') bgsSource = null;
					else bgsSource = this.character(+args[1]);
					break;
				default:
					break;
			}
		}
	};

	//実際に音量調節を担当する関数。第一引数にオーディオデータ、第二引数に音源キャラクターを指定する
	function adjust(audio, source) {
		if (!source) throw new Error('audiosourceエラー：音源となるイベントが存在しません');
		var listenerX, listenerY;
		if (listenerEvent) {
			listenerX = listenerEvent._realX;
			listenerY = listenerEvent._realY;
		} else {
			switch (listener.toLowerCase()) {
				case 'screen':
					listenerX = $gameMap.displayX() + $gamePlayer.centerX();
					listenerY = $gameMap.displayY() + $gamePlayer.centerY();
					break;
				case 'player':
					listenerX = $gamePlayer._realX;
					listenerY = $gamePlayer._realY;
					break;
				default:
					throw new Error('audiosourceエラー：listenerパラメータはscreenかplayerにしてください');
					break;
			}
		}
		var dx = $gameMap.deltaX(source._realX, listenerX);
		var dy = $gameMap.deltaY(source._realY, listenerY);
		var d = Math.sqrt(dx * dx + dy * dy);
		if (d > 1) audio.volume *= Math.pow(decay / 100, d - 1);
		audio.pan = (dx * pan).clamp(-100, 100);
	}
})();