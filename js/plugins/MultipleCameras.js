//=============================================================================
// MultipleCameras.js
// PUBLIC DOMAIN
//=============================================================================

/*:
 * @plugindesc 画面に複数のカメラ（視点）を配置します。
 * @author くらむぼん
 *
 * @help
 * 画面の数を増やして複数の場所を映し出すプラグインです。
 * 対戦型ゲームなどによくある画面の分割はもちろん、
 * 注目させたい遠隔地の一部分を小窓で抜き出すなど
 * 使い方次第で色んな演出ができます。
 * 
 * 
 * プラグインコマンド：
 * 基本的に(枠線設定、)カメラの配置、ターゲットの順番で設定します。
 * コマンド中に変数を使いたい時は\V[変数番号]でどうぞ。
 * 
 * ・カメラの配置
 * camera set horizontal（またはvertical、quarter）
 * あらかじめ用意された設定でカメラを配置します。
 * 　horizontal：横に２分割。上がカメラ0、下がカメラ1です。
 * 　vertical：縦に２分割。左がカメラ0、右がカメラ1です。
 * 　quarter：４分割。左上がカメラ0、右上が1、左下が2、右下が3です。
 * なお描画節約のため、それまで表示されていたカメラとメイン画面は消去されます。
 * 
 * camera set カメラ番号 左上x座標 左上y座標 幅 高さ
 * 新しいカメラを、指定したカメラ番号・位置・幅・高さで作り出します。
 * 位置と幅、高さの指定は画面左上を(0,0)として「マス単位」で指定します。
 * （中途半端な値にしたい場合は、普通に小数で指定すればOK）
 * カメラ同士が重なった時は、カメラ番号が大きい方が手前に映ります。
 * 
 * removeコマンドでメイン画面を消去していた場合、「camera set -1」で
 * 再表示することができますが、この時に位置やサイズを変更することはできません。
 * 
 * 
 * ・ターゲット（カメラの映し出す対象）
 * 配置された直後のカメラの追跡対象はすべて「プレイヤー」です。
 * 以下の二種類のtargetコマンドを駆使して上手にターゲットを設定しましょう。
 * なおカメラ番号に「-1」を指定しても、メイン画面のターゲットは変えられません。
 * 
 * camera target カメラ番号 xy 左上x座標 左上y座標
 * 指定したカメラ番号のカメラが映し出す対象を固定座標で指定します。
 * 
 * camera target カメラ番号 event イベントID
 * 指定したカメラ番号のカメラが追跡して映し出す対象イベントを指定します。
 * カメラをスクロールさせる演出がしたい時は、透明なイベントを対象にして
 * それをスクロールしたい方向に歩かせるといい感じです。
 * イベントIDに「0」を指定した場合は対象が「このイベント」に、
 * 「-1」を指定した場合は対象が「プレイヤー」になります。
 * 
 * 
 * ・カメラの枠線設定
 * camera frame 枠の幅 枠の色
 * カメラの枠線に関する設定を変更します。
 * 幅は数字で、色はblackかwhiteかカラーコード(例：ff0000)で指定します。
 * 初期幅は2、初期色はblackです。
 * 
 * このコマンドは「これから作り出すカメラ」の枠線の設定ですので、
 * カメラを配置する前に先に設定しておきましょう。
 * また、枠の幅を0にすれば枠線なしでカメラを配置できます。
 * もっと凝った枠にしたい時は枠線を消し、代わりにピクチャーを表示しましょう。
 * 
 * ・カメラの消去
 * camera remove カメラ番号
 * 指定したカメラ番号のカメラを消去します。
 * カメラ番号に「-1」を指定した場合はメイン画面を消します。
 * 裏で無駄な画面を映しているとゲームが重くなるので
 * メイン画面が必要ない時は積極的に消していきましょう。
 * 
 * ・リセット
 * camera reset
 * すべてのカメラ配置を解除し、メイン画面一つの状態に戻します。
 * 
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var _Graphics_render = Graphics.render;
	Graphics.render = function(stage) {
		if (this._skipCount === 0 && stage instanceof Scene_Map) {
			stage._spriteset.renderCameras();
		}
		_Graphics_render.apply(this, arguments);
	};

	var _Spriteset_Map_createWeather = Spriteset_Map.prototype.createWeather;
	Spriteset_Map.prototype.createWeather = function() {
		this.createCameraContainer();
		_Spriteset_Map_createWeather.apply(this, arguments);
	};

	Spriteset_Map.prototype.createCameraContainer = function() {
		this._cameraContainer = new PIXI.Container();
		this.addChild(this._cameraContainer);
	};

	Spriteset_Map.prototype.createNewCamera = function(camera, index) {
		var tw = $gameMap.tileWidth();
		var th = $gameMap.tileHeight();
		var texture = PIXI.RenderTexture.create(camera.width * tw, camera.height * th);
		var sprite = new PIXI.Sprite(texture);
		sprite.x = camera.x * tw;
		sprite.y = camera.y * th;
		if (camera.lineWidth > 0) {
			var lineWidth = camera.lineWidth;
			var lineColor = camera.lineColor;
			var frame = new PIXI.Graphics();
			frame.x = -lineWidth / 2;
			frame.y = -lineWidth / 2;
			frame.lineStyle(lineWidth, lineColor, 1);
			frame.drawRect(0, 0, texture.width + lineWidth, texture.height + lineWidth);
			sprite.addChild(frame);
		}
		this._cameras = this._cameras || [];
		this._cameras[index] = {texture: texture, sprite: sprite};
		for (var i = index - 1; i >= 0; i--) {
			if (this._cameras[i]) {
				i = this._cameraContainer.getChildIndex(this._cameras[i].sprite);
				break;
			}
		}
		this._cameraContainer.addChildAt(sprite, i + 1);
	};

	Spriteset_Map.prototype.createAllCameras = function() {
		if ($gameMap._cameras) {
			$gameMap._cameras.forEach(this.createNewCamera, this);
		}
	};

	Spriteset_Map.prototype.removeCamera = function(index) {
		if (this._cameras && this._cameras[index]) {
			this._cameraContainer.removeChild(this._cameras[index].sprite);
			delete this._cameras[index];
		}
	};

	Spriteset_Map.prototype.removeAllCameras = function() {
		this._cameraContainer.removeChildren();
		delete this._cameras;
	};

	Spriteset_Map.prototype.renderCameras = function() {
		if (this._cameras) {
			var dx = $gameMap.displayX();
			var dy = $gameMap.displayY();
			this._baseSprite.visible = true;
			this._cameras.forEach(function(camera, index) {
				$gameMap.changeDisplayPos(index);
				this.changePositions();
				Graphics._renderer.render(this._baseSprite, camera.texture);
			}, this);
			$gameMap.setDisplayPos(dx, dy);
			this.changePositions();
		}
		this._baseSprite.visible = !$gameMap._mainCameraDisabled;
	};

	Spriteset_Map.prototype.changePositions = function() {
		this.updateParallax();
		this.updateTilemap();
		this._characterSprites.forEach(function(character) {
			character.updatePosition();
		});
		this.updateShadow();
		this._destinationSprite.updatePosition();
	};

	Game_Map.prototype.addCamera = function(index, x, y, width, height) {
		if (index === -1) {
			delete this._mainCameraDisabled;
			return;
		}
		this._cameras = this._cameras || [];
		this._cameras[index] = {x: x, y: y, width: width, height: height, target: -1, targetX: 0, targetY: 0};
		this._cameraFrame = this._cameraFrame || {lineWidth: 2, lineColor: 0x000000};
		this._cameras[index].lineWidth = this._cameraFrame.lineWidth;
		this._cameras[index].lineColor = this._cameraFrame.lineColor;
		if (SceneManager._scene instanceof Scene_Map) {
			SceneManager._scene._spriteset.removeCamera(index);
			SceneManager._scene._spriteset.createNewCamera(this._cameras[index], index);
		}
	};

	Game_Map.prototype.removeCamera = function(index) {
		if (index === -1) {
			this._mainCameraDisabled = true;
			return;
		}
		if (this._cameras) {
			delete this._cameras[index];
		}
		if (SceneManager._scene instanceof Scene_Map) {
			SceneManager._scene._spriteset.removeCamera(index);
		}
	};

	Game_Map.prototype.removeAllCameras = function() {
		delete this._mainCameraDisabled;
		delete this._cameras;
		if (SceneManager._scene instanceof Scene_Map) {
			SceneManager._scene._spriteset.removeAllCameras();
		}
	};

	Game_Map.prototype.cameraToXy = function(cameraId, x, y) {
		if (this._cameras && this._cameras[cameraId]) {
			this._cameras[cameraId].target = 0;
			this._cameras[cameraId].targetX = x;
			this._cameras[cameraId].targetY = y;
		}
	};

	Game_Map.prototype.cameraToEvent = function(cameraId, eventId) {
		if (this._cameras && this._cameras[cameraId]) {
			this._cameras[cameraId].target = eventId;
		}
	};

	Game_Map.prototype.updateCameras = function() {
		if (this._cameras) {
			this._cameras.forEach(function(camera) {
				var character = camera.target === -1 ? $gamePlayer : $gameMap.event(camera.target);
				if (character) {
					character.centering(camera);
				}
			});
		}
	};

	Game_Map.prototype.changeDisplayPos = function(index) {
		var camera = this._cameras[index];
		var x = camera.targetX;
		var y = camera.targetY;
		if (this.isLoopHorizontal()) {
			this._displayX = x.mod(this.width());
			this._parallaxX = x;
		} else {
			var endX = this.width() - camera.width;
			this._displayX = endX < 0 ? endX / 2 : x.clamp(0, endX);
			this._parallaxX = this._displayX;
		}
		if (this.isLoopVertical()) {
			this._displayY = y.mod(this.height());
			this._parallaxY = y;
		} else {
			var endY = this.height() - camera.height;
			this._displayY = endY < 0 ? endY / 2 : y.clamp(0, endY);
			this._parallaxY = this._displayY;
		}
	};

	Game_CharacterBase.prototype.isNearTheScreen = function() {
		return true;
	};

	Game_CharacterBase.prototype.centering = function(camera) {
		camera.targetX = this._realX + 0.5 - camera.width / 2;
		camera.targetY = this._realY + 0.5 - camera.height / 2;
	};

	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.apply(this, arguments);
		if (command.toLowerCase() === 'camera') {
			args = args.map(function(arg) {
				return arg.replace(/\\V\[(\d+)\]/gi, function() {
					return $gameVariables.value(parseInt(arguments[1]));
				});
			});
			switch (args.shift().toLowerCase()) {
				case 'set':
					this.setCamera.apply(this, args);
					break;
				case 'target':
					this.targetCamera.apply(this, args);
					break;
				case 'remove':
					this.removeCamera.apply(this, args);
					break;
				case 'frame':
					this.frameCamera.apply(this, args);
					break;
				case 'reset':
					this.resetCamera();
					break;
				default:
					break;
			}
		}
	};

	Game_Interpreter.prototype.setCamera = function(typeOrIndex, x, y, width, height) {
		switch (typeOrIndex.toLowerCase()) {
			case 'vertical':
				var halfWidth = $gameMap.screenTileX() / 2;
				var fullHeight = $gameMap.screenTileY();
				$gameMap.removeAllCameras();
				$gameMap.removeCamera(-1);
				$gameMap.addCamera(0, 0, 0, halfWidth, fullHeight);
				$gameMap.addCamera(1, halfWidth, 0, halfWidth, fullHeight);
				break;
			case 'horizontal':
				var fullWidth = $gameMap.screenTileX();
				var halfHeight = $gameMap.screenTileY() / 2;
				$gameMap.removeAllCameras();
				$gameMap.removeCamera(-1);
				$gameMap.addCamera(0, 0, 0, fullWidth, halfHeight);
				$gameMap.addCamera(1, 0, halfHeight, fullWidth, halfHeight);
				break;
			case 'quarter':
				var halfWidth = $gameMap.screenTileX() / 2;
				var halfHeight = $gameMap.screenTileY() / 2;
				$gameMap.removeAllCameras();
				$gameMap.removeCamera(-1);
				$gameMap.addCamera(0, 0, 0, halfWidth, halfHeight);
				$gameMap.addCamera(1, halfWidth, 0, halfWidth, halfHeight);
				$gameMap.addCamera(2, 0, halfHeight, halfWidth, halfHeight);
				$gameMap.addCamera(3, halfWidth, halfHeight, halfWidth, halfHeight);
				break;
			default:
				$gameMap.addCamera(+typeOrIndex, +x, +y, +width, +height);
				break;
		}
	};

	Game_Interpreter.prototype.targetCamera = function(index, type, eventIdOrX, y) {
		switch (type.toLowerCase()) {
			case 'xy':
				$gameMap.cameraToXy(+index, +eventIdOrX, +y);
				break;
			case 'event':
				var eventId = +eventIdOrX;
				$gameMap.cameraToEvent(+index, eventId === 0 ? this._eventId : eventId);
				break;
			default:
				break;
		}
	};

	Game_Interpreter.prototype.removeCamera = function(index) {
		$gameMap.removeCamera(+index);
	};

	Game_Interpreter.prototype.frameCamera = function(lineWidth, lineColor) {
		lineWidth = +lineWidth;
		switch (lineColor.toLowerCase()) {
			case 'black':
				lineColor = 0x000000;
				break;
			case 'white':
				lineColor = 0xffffff;
				break;
			default:
				lineColor = lineColor[0] === '#' ? lineColor.slice(1) : lineColor;
				lineColor = parseInt(lineColor, 16);
				break;
		}
		$gameMap._cameraFrame = {lineWidth: lineWidth, lineColor: lineColor};
	};

	Game_Interpreter.prototype.resetCamera = function() {
		$gameMap.removeAllCameras();
	};

	var _Scene_Map_start = Scene_Map.prototype.start;
	Scene_Map.prototype.start = function() {
		_Scene_Map_start.apply(this, arguments);
		this._spriteset.createAllCameras();
	};

	var _Scene_Map_update = Scene_Map.prototype.update;
	Scene_Map.prototype.update = function() {
		_Scene_Map_update.apply(this, arguments);
		$gameMap.updateCameras();
	};
})();