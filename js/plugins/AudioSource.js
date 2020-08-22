//=============================================================================
// AudioSource.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2016/10/18 BGMとBGSの音源化を、一度指定すれば自動調節としました
// 2016/10/21 音量・位相調節の距離測定単位をマス単位からドット単位に変更しました
// 2016/12/04 セーブ・ロードに対応、BGS並行演奏プラグイン(ParallelBgs.js)との連携
// 2017/01/07 アニメーションの音源化に対応、戦闘を挟んでも正常動作するようにした
// 2017/01/09 ルート設定のSE音源化もoffに設定できるようにした
// 2017/03/25 プラグインパラメータに0を指定できないバグを修正しました
// 2017/06/04 BGMとBGSの再生コマンドを連打するとノイズが発生する不具合と、オプション音量を変更した瞬間音量調節が無効になるバグを修正しました
// 2017/10/05 FootstepSound.jsとの連携
// 2018/06/27 panが0と0以外の値をまたぐ時、ノイズが入る（環境がある）バグを対策
// 2018/07/31 ロード直後、一瞬だけ音源処理が反映されないバグを修正しました
// 2018/09/16 2018/06/27が無意味だったので打ち消し。ノイズが入ったら本体バージョンを1.6.1以上に上げましょう
// 2020/08/22 RPGツクールMZに対応
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 音源と聞き手の位置関係に応じて自動的に音量・位相を調節します。
 * @author くらむぼん
 *
 * @param listener
 * @type select
 * @text 音の聞き手
 * @option 画面の中央
 * @value screen
 * @option プレイヤー
 * @value player
 * @default screen
 *
 * @param decay
 * @type number
 * @text 音の減衰率
 * @desc 音源と聞き手の距離が一歩広がった時の音量変化倍率（％）。小さくするほど、一歩ごとに極端に音量が減ります。
 * @default 85
 *
 * @param pan
 * @type number
 * @text 音の左右移動率
 * @desc 音源が聞き手の一歩右に居る時の変化位相。大きくするほど、一歩ごとに極端に左右に音が振られます。
 * @default 10
 *
 * @param cutoff
 * @type number
 * @text 最小再生音量
 * @desc 音を鳴らすことを許可する最小の音量（％）
 * @default 1
 *
 * @help
 * 「ある特定の場所から音が聞こえてくる」という演出を可能にするプラグインです。
 * 具体的には特定のマップイベントを音源（音の発し手）として音声を演奏でき、
 * 音の聞き手（初期設定では画面の中央）との距離感によって音量などが変化します。
 * 音源と聞き手の距離が縮まるほど音量が大きくなりますし、
 * 音源が聞き手よりも右の方にあれば、音が右から聞こえてくる（位相が増える）ようになります。
 * 
 * 
 * ---RPGツクールMZでの使い方---
 * プラグインコマンドの「音源から音声を演奏」を用いて、
 * 音声を特定の場所（音源）から聞こえるように演奏することができます。
 * 
 * ※BGM,BGSについては、音源から演奏したまま別のマップへ移動すると
 * 　音源が行方不明になるため、聞こえ方がおかしくなります。
 * 　移動前に演奏を止めるか、移動後にプラグインコマンドを再設定しましょう。
 * 
 * この他にも、音の聞き手を特定のマップイベントに変更するコマンドや
 * 「移動ルートの設定」「アニメーションの表示」におけるSEを自動で音源化するコマンドもあります。
 * 慣れたらそちらも使ってみてください。
 * 
 * 
 * 
 * ---RPGツクールMVでの使い方---
 * マップイベントの「ルート設定」内で効果音を鳴らすと、プラグインの効果が発動します。
 * ※イベントコマンドの「SEの演奏」では自動調節しません。うまく使い分けましょう。
 * また、「アニメーションの表示」の効果音も対象の位置から聞こえるようになります。
 * 
 * さらに、プラグインコマンドによりBGMやBGSを特定の位置から鳴らすことができます。
 * トリアコンタンさんのBGS並行演奏プラグインとも連携可能にしてみました。
 * 詳しくは下の方の「プラグインコマンド」を見てください。
 * 
 * なお基準となる音量は効果音(,BGM,BGS)の演奏を指定した時の音量です。
 * 音源と聞き手が同じかすぐ隣のマスに居る時は基準音量で鳴らされ、
 * そこから一歩離れるたびに音が小さくなっていきます。
 * 
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
 * 
 * audiosource bgm 1
 * audiosource bgs 1
 * 現在流れているBGM/BGSの音量と位相を、
 * 「指定したIDのマップイベントから鳴っている」風に聞こえるように調節します。
 * （0を指定すると「このイベント」から鳴らします）
 * 設置されたラジオから曲が流れている演出などにお使いください。
 * 
 * また、BGS並行演奏プラグインと連携する場合は、
 * BGSライン変更→audiosourceの順番で指定すれば
 * それぞれのBGSに音源を指定できます。
 * 例
 * ◆プラグインコマンド：PB_BGSライン変更 2
 * ◆プラグインコマンド：audiosource bgs 1
 * 
 * audiosource bgm reset
 * audiosource bgs reset
 * BGM/BGSの音源化を解除し、通常通りの演奏に戻します。
 * 
 * 
 * audiosource se on
 * audiosource se off
 * 「ルート設定」や「アニメーションの表示」では自動的に効果音が
 * 対象キャラの位置から音が鳴っているように調節されますが、
 * 調節してほしくない時はこのプラグインコマンドでoffにしましょう。
 * 初期値はonです。
 * 
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 * 
 * @command play
 * @text 音源から音声を演奏
 * @desc 音源（音の発し手）と聞き手の位置関係を計算し、音声を音源から聞こえてくるように演奏します。
 *
 * @arg path
 * @type file
 * @dir audio
 * @text 音声ファイル
 * 
 * @arg volume
 * @type number
 * @default 90
 * @text 音量（％）
 * 
 * @arg pitch
 * @type number
 * @default 100
 * @text ピッチ（％）
 * 
 * @arg source
 * @type number
 * @default 0
 * @text 音源イベント
 * @desc 音源にするマップイベントをIDで指定します。0のときは「このイベント」になります。
 * 
 * @command listener
 * @text 音の聞き手の変更
 * @desc 音の聞き手にするマップイベントをIDで指定します。0で解除（聞き手が画面の中央/プレイヤーに戻る）します。
 * 
 * @arg listener
 * @type number
 * @default 0
 * @text 聞き手イベント
 * 
 * @command adjustRouteSe
 * @text 移動ルートのSEを音源化
 * @desc 「移動ルートの設定」の内部に「SEの演奏」があるとき、自動的に対象のイベントから音が聞こえるようにします。
 * 
 * @arg value
 * @type boolean
 * 
 * @command adjustAnimationSe
 * @text アニメーションのSEを音源化
 * @desc 「アニメーションの表示」でアニメにSEが含まれるとき、自動的に対象のイベントから音が聞こえるようにします。
 * 
 * @arg value
 * @type boolean
 */

(function() {
	'use strict';
	var pluginName = 'AudioSource';
	var parameters = PluginManager.parameters(pluginName);
	var listener = parameters['listener'];
	var decay = toNumber(parameters['decay'], 85).clamp(0, Infinity);
	var pan = toNumber(parameters['pan'], 10);
	var cutoff = toNumber(parameters['cutoff'], 1).clamp(0, 100);

	//効果音の音量調節（マップイベントのルート設定から鳴らした時のみ）
	var _Game_Character_processMoveCommand = Game_Character.prototype.processMoveCommand;
	Game_Character.prototype.processMoveCommand = function(command) {
		var adjust = typeof $gameSystem._adjustRouteSe === "boolean" ? $gameSystem._adjustRouteSe : !PluginManager.registerCommand;
		if (adjust && command.code === Game_Character.ROUTE_PLAY_SE) playAdjustSe(command.parameters[0], this);
		else _Game_Character_processMoveCommand.apply(this, arguments);
	};

	//アニメーション中の効果音を音量調節
	Sprite_Animation.prototype.processTimingData = function(timing) {
		var duration = timing.flashDuration * this._rate;
		switch (timing.flashScope) {
			case 1:
			this.startFlash(timing.flashColor, duration);
			break;
			case 2:
			this.startScreenFlash(timing.flashColor, duration);
			break;
			case 3:
			this.startHiding(duration);
			break;
		}
		if (!this._duplicated && timing.se) {
			var adjust = typeof $gameSystem._adjustAnimationSe === "boolean" ? $gameSystem._adjustAnimationSe : !PluginManager.registerCommand;
			playAdjustSe(timing.se, adjust && this._target && this._target._character);
		}
	};

	//戦闘終了直後、BGMとBGSの音量が初期値に戻っているので再度設定する
	//fadeInがcancelされてしまいそうだが、実際はfadeInの処理の方が遅延するのでうまくいく
	var _BattleManager_replayBgmAndBgs = BattleManager.replayBgmAndBgs;
	BattleManager.replayBgmAndBgs = function() {
		_BattleManager_replayBgmAndBgs.apply(this, arguments);
		AudioManager.updateAudioSource();
	};

	//BGM、BGSの音量調節（毎フレーム）
	AudioManager.updateAudioSource = function() {
		updateParameters(this._currentBgm, $gameMap.event($gameSystem._bgmSource), true);
		if ($gameSystem._bgsSources) {
			if (!this.iterateAllBgs) return delete $gameSystem._bgsSources;
			this.iterateAllBgs(function() {
				updateParameters(this._currentBgs, $gameMap.event($gameSystem._bgsSources[this.getBgsLineIndex()]));
			}.bind(this));
		}
		else updateParameters(this._currentBgs, $gameMap.event($gameSystem._bgsSource));
	};

	//BGM、BGSの音量が自動調節されている場合はイベントコマンドからのAudioBufferの調節を無効にする
	//（同一フレームに複数回の音量変化が含まれるとノイズが発生するため）
	var _AudioManager_updateBgmParameters = AudioManager.updateBgmParameters;
	AudioManager.updateBgmParameters = function(bgm) {
		if ($gameMap && $gameMap.event($gameSystem._bgmSource)) return;
		_AudioManager_updateBgmParameters.apply(this, arguments);
	};

	var _AudioManager_updateBgsParameters = AudioManager.updateBgsParameters;
	AudioManager.updateBgsParameters = function(bgs) {
		if ($gameMap && $gameSystem) {
			if ($gameSystem._bgsSources && this.getBgsLineIndex) {
				if ($gameMap.event($gameSystem._bgsSources[this.getBgsLineIndex()])) return;
			} else {
				if ($gameMap.event($gameSystem._bgsSource)) return;
			}
		}
		_AudioManager_updateBgsParameters.apply(this, arguments);
	};

	//BGM、BGSのオプション側の音量を変えた時にちゃんと音量調節されるようにする
	var _AudioManager_bgmVolume = Object.getOwnPropertyDescriptor(AudioManager, 'bgmVolume');
	Object.defineProperty(AudioManager, 'bgmVolume', {
		get: function() {
			return _AudioManager_bgmVolume.get.call(this);
		},
		set: function(value) {
			_AudioManager_bgmVolume.set.call(this, value);
			if ($gameMap && $gameSystem) this.updateAudioSource();
		},
		configurable: true
	});

	var _AudioManager_bgsVolume = Object.getOwnPropertyDescriptor(AudioManager, 'bgsVolume');
	Object.defineProperty(AudioManager, 'bgsVolume', {
		get: function() {
			return _AudioManager_bgsVolume.get.call(this);
		},
		set: function(value) {
			_AudioManager_bgsVolume.set.call(this, value);
			if ($gameMap && $gameSystem) this.updateAudioSource();
		},
		configurable: true
	});

	var bgmOnSave = null;
	var bgsOnSave = null;

	var _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
	Scene_Map.prototype.onMapLoaded = function() {
		_Scene_Map_onMapLoaded.apply(this, arguments);
		if (bgmOnSave) {
			AudioManager.playBgm(bgmOnSave);
			bgmOnSave = null;
		}
		if (bgsOnSave) {
			AudioManager.playBgs(bgsOnSave);
			bgsOnSave = null;
		}
		AudioManager.updateAudioSource();
	};

	var _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
	Game_System.prototype.onAfterLoad = function() {
		bgmOnSave = this._bgmOnSave;
		bgsOnSave = this._bgsOnSave;
		this._bgmOnSave = this._bgsOnSave = {};
		_Game_System_onAfterLoad.apply(this, arguments);
		this._bgmOnSave = bgmOnSave;
		this._bgsOnSave = bgsOnSave;
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
			var eventId = +args[1] === 0 ? this._eventId : +args[1];
			switch (args[0].toLowerCase()) {
				case 'listener':
					$gameSystem._listenerEvent = eventId;
					break;
				case 'bgm':
					$gameSystem._bgmSource = eventId;
					break;
				case 'bgs':
					if ($gameSystem.getBgsLine) {
						$gameSystem._bgsSources = $gameSystem._bgsSources || [];
						$gameSystem._bgsSources[$gameSystem.getBgsLine()] = eventId;
					}
					else $gameSystem._bgsSource = eventId;
					break;
				case 'se':
					$gameSystem._adjustRouteSe = $gameSystem._adjustAnimationSe = args[1].toLowerCase() !== 'off';
					break;
				default:
					break;
			}
		}
	};

	if (PluginManager.registerCommand) {
        PluginManager.registerCommand(pluginName, "play", function(args) {
			var { path, volume, pitch, source } = args;
			var [ dir, name ] = path.split("/");
			var eventId = +source || this._eventId;
			var pan = 0;
            switch (dir) {
				case "bgm": {
					$gameSystem._bgmSource = eventId;
					AudioManager.playBgm({ name, volume, pitch, pan });
					break;
				}
				case "bgs": {
					if ($gameSystem.getBgsLine) {
						$gameSystem._bgsSources = $gameSystem._bgsSources || [];
						$gameSystem._bgsSources[$gameSystem.getBgsLine()] = eventId;
					}
					else $gameSystem._bgsSource = eventId;
					AudioManager.playBgs({ name, volume, pitch, pan });
					break;
				}
				case "me": {
					playAdjustMe({ name, volume, pitch, pan }, $gameMap.event(eventId));
					break;
				}
				case "se": {
					playAdjustSe({ name, volume, pitch, pan }, $gameMap.event(eventId));
					break;
				}
			}
		});

		PluginManager.registerCommand(pluginName, "listener", function(args) {
			$gameSystem._listenerEvent = args.listener;
		});

		PluginManager.registerCommand(pluginName, "adjustRouteSe", function(args) {
			$gameSystem._adjustRouteSe = args.value === "true";
		});

		PluginManager.registerCommand(pluginName, "adjustAnimationSe", function(args) {
			$gameSystem._adjustAnimationSe = args.value === "true";
		});

		var _Game_Intepreter_command241 = Game_Interpreter.prototype.command241;
		Game_Interpreter.prototype.command241 = function(params) {
			$gameSystem._bgmSource = NaN;
			return _Game_Intepreter_command241.apply(this, arguments);
		};

		var _Game_Intepreter_command245 = Game_Interpreter.prototype.command245;
		Game_Interpreter.prototype.command245 = function(params) {
			if ($gameSystem.getBgsLine) {
				$gameSystem._bgsSources = $gameSystem._bgsSources || [];
				$gameSystem._bgsSources[$gameSystem.getBgsLine()] = NaN;
			}
			else $gameSystem._bgsSource = NaN;
			return _Game_Intepreter_command245.apply(this, arguments);
		};
    }

	function toNumber(str, def) {
		return isNaN(str) ? def : +(str || def);
	}

	//BGMとBGSの音量と位相を調節する
	function updateParameters(audio, source, isBgm) {
		if (audio && source) {
			var lastVolume = audio.volume;
			var lastPan = audio.pan;
			adjust(audio, source);
			if (audio.volume < cutoff) audio.volume = 0;
			var buffer = AudioManager[isBgm ? '_bgmBuffer' : '_bgsBuffer'];
			if (buffer && buffer._gainNode) buffer._gainNode.gain.cancelScheduledValues(0);
			AudioManager.updateBufferParameters(buffer, AudioManager[isBgm ? '_bgmVolume' : '_bgsVolume'], audio);
			audio.volume = lastVolume;
			audio.pan = lastPan;
		}
	}

	//MEの音量と位相を調節して再生する
	function playAdjustMe(me, source) {
		if (source) {
			var lastVolume = me.volume;
			var lastPan = me.pan;
			adjust(me, source);
			if (me.volume >= cutoff) AudioManager.playMe(me);
			me.volume = lastVolume;
			me.pan = lastPan;
		}
		else AudioManager.playMe(me);
	}

	//SEの音量と位相を調節して再生する
	function playAdjustSe(se, source) {
		if (source) {
			var lastVolume = se.volume;
			var lastPan = se.pan;
			adjust(se, source);
			if (se.volume >= cutoff) AudioManager.playSe(se);
			se.volume = lastVolume;
			se.pan = lastPan;
		}
		else AudioManager.playSe(se);
	}

	//実際に音量調節を担当する関数。第一引数にオーディオデータ、第二引数に音源キャラクターを指定する
	function adjust(audio, source) {
		if (!source) throw new Error('audiosourceエラー：音源となるイベントが存在しません');
		var listenerX, listenerY, listenerEvent = $gameMap.event($gameSystem._listenerEvent);
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
			}
		}
		var dx = $gameMap.deltaX(source._realX, listenerX);
		var dy = $gameMap.deltaY(source._realY, listenerY);
		var d = Math.sqrt(dx * dx + dy * dy);
		if (d > 1) audio.volume *= Math.pow(decay / 100, d - 1);
		audio.pan = (dx * pan).clamp(-100, 100);
	}

	//連携用の口
	AudioManager.playAdjustSe = playAdjustSe;
})();