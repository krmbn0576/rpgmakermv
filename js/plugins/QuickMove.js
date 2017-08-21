//=============================================================================
// QuickMove.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2017/08/21 ver1.5.0以降で顔グラ左右反転時にエラーが出る問題を修正しました
//=============================================================================

/*:
 * @plugindesc 歩行とジャンプを軽快に(2000風に)します。
 * @author くらむぼん
 *
 * @help
 * キャラの移動に関するまだるっこしい振る舞いを改善しきびきび動かすプラグインです。
 * 主にRPGツクール2000を参考に修正していますので、
 * 2000の操作感に慣れている方にもおすすめです。
 * 
 * 機能一覧：
 * ・移動速度を２倍に
 * 　　１マス移動するのにかかる時間を2000と同じにします
 * ・ダッシュのON/OFF切り替えを即座に反映
 * 　　切り替えタイミングをマス単位からフレーム単位に
 * ・ジャンプを高速化、2000と同じ速さ・高さ・頻度に
 * 　　いわゆるウザイアンジャンプもできます
 * 
 * おまけ：
 * ・文章中に\Rと書くと顔グラが左右反転
 * ・F12でタイトルへ戻る
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var parameters = PluginManager.parameters('QuickMove');

	//F12でリロード
	var _SceneManager_onKeyDown = SceneManager.onKeyDown;
	SceneManager.onKeyDown = function(e) {
		if (e.keyCode === 123 && Utils.isNwjs()) location.reload();
		_SceneManager_onKeyDown.apply(this, arguments);
	};

	//新しい変数を定義
	var _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
	Game_CharacterBase.prototype.initMembers = function() {
		_Game_CharacterBase_initMembers.apply(this, arguments);
		this._jumpAdjust = 0;
	};

	//ジャンプを2000化
	var _Game_CharacterBase_jump = Game_CharacterBase.prototype.jump;
	Game_CharacterBase.prototype.jump = function(xPlus, yPlus) {
		_Game_CharacterBase_jump.apply(this, arguments);
		this._jumpPeak = 9;	//ジャンプの高さは移動距離や移動速度に関わらず一定
		this._jumpCount = (7 - this._moveSpeed) * 4;	//ジャンプにかかる時間は移動速度が速いほど短いが、移動距離には影響されない
		this._jumpAdjust = 2 * this._jumpPeak / this._jumpCount;	//ジャンプの軌道調整用
	};

	//ジャンプの軌道は二次関数なので、x軸方向に潰す
	Game_CharacterBase.prototype.jumpHeight = function() {
		return (this._jumpPeak * this._jumpPeak - Math.pow(this._jumpAdjust * this._jumpCount - this._jumpPeak, 2)) / 2;
	};

	//歩行にかかる時間を半分（2000と同じ）に
	Game_CharacterBase.prototype.distancePerFrame = function() {
		return Math.pow(2, this.realMoveSpeed()) / 128;
	};

	//ダッシュのON/OFF切り替えをマス単位からフレーム単位に
	Game_Player.prototype.updateDashing = function() {
		if (this.canMove() && !this.isInVehicle() && !$gameMap.isDashDisabled()) {
			this._dashing = this.isDashButtonPressed() || $gameTemp.isDestinationValid();
		} else {
			this._dashing = false;
		}
	};

	//左右反転して画像を描写
	Bitmap.prototype.bltReverse = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
		dw = dw || sw;
		dh = dh || sh;
		if (sx >= 0 && sy >= 0 && sw > 0 && sh > 0 && dw > 0 && dh > 0 &&　sx + sw <= source.width && sy + sh <= source.height) {
			this._context.globalCompositeOperation = 'source-over';
			this._context.transform(-1, 0, 0, 1, dw, 0);
			this._context.drawImage(source._canvas, sx, sy, sw, sh, dx, dy, dw, dh);
			this._context.transform(-1, 0, 0, 1, dw, 0);
			this._setDirty();
		}
	};

	Window_Base.prototype.drawFace = function(faceName, faceIndex, x, y, width, height) {
		width = width || Window_Base._faceWidth;
		height = height || Window_Base._faceHeight;
		var bitmap = ImageManager.loadFace(faceName);
		var pw = Window_Base._faceWidth;
		var ph = Window_Base._faceHeight;
		var sw = Math.min(width, pw);
		var sh = Math.min(height, ph);
		var dx = Math.floor(x + Math.max(width - pw, 0) / 2);
		var dy = Math.floor(y + Math.max(height - ph, 0) / 2);
		var sx = faceIndex % 4 * pw + (pw - sw) / 2;
		var sy = Math.floor(faceIndex / 4) * ph + (ph - sh) / 2;
		this.contents[this._faceReverse ? 'bltReverse' : 'blt'](bitmap, sx, sy, sw, sh, dx, dy);
	};

	//[\R]が文章中にある時、顔を左右反転
	var _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
	Window_Message.prototype.processEscapeCharacter = function(code, textState) {
		if (code === 'R') this.loadMessageFace(), this._faceReverse = !this._faceReverse;
		else _Window_Message_processEscapeCharacter.apply(this, arguments);
	};
})();