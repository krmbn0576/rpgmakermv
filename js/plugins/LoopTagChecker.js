//=============================================================================
// LoopTagChecker.js
// PUBLIC DOMAIN
//=============================================================================

/*:
 * @plugindesc bgmとbgsの音楽ファイルにループタグがついているかチェックします。
 * @author くらむぼん
 *
 * @help
 * 本プラグインをONにしてテストプレイすると、bgmフォルダとbgsフォルダの
 * すべての音楽ファイルにループタグがついているか（ついでにその値も）を表示します。
 * ループタグが無い場合は赤くエラー表示されますので一目瞭然！
 * 
 * 自分の耳で確かめる方法だと時間がかかりますし、テストプレイではogg版しか
 * 聞けないのでm4a版だけ失敗していると気づけないんですよね…（愚痴）
 * というわけで本プラグインで一斉に、ogg,m4a問わずくまなくチェックしましょう！
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	if (!Utils.isOptionValid('test') || !Utils.isNwjs()) return;

	var _WebAudio__readLoopComments = WebAudio.prototype._readLoopComments;
	WebAudio.prototype._readLoopComments = function(array) {
		_WebAudio__readLoopComments.apply(this, arguments);
		if (this._afterReadLoopComments) this._afterReadLoopComments();
	};

	var w = require('nw.gui').Window.get();
	if (!w.isDevToolsOpen()) {
		var d = w.showDevTools();
		d.moveTo(0, 0);
		w.focus();
	}

	var path = require('path').dirname(process.mainModule.filename) + '/audio/';
	var fs = require('fs');

	check('bgm');
	check('bgs');

	function check(folder) {
		fs.readdirSync(path + folder).forEach(function(file) {
			new WebAudio('audio/' + folder + '/' + file)._afterReadLoopComments = function() {
				if (this._loopStart || this._loopLength) {
					console.log(this._url + ': ループタグ有り！ LOOPSTART=' + this._loopStart + ' LOOPLENGTH=' + this._loopLength);
				} else {
					console.error(this._url + ': ループタグ無し…');
				}
			};
		});
	}
})();