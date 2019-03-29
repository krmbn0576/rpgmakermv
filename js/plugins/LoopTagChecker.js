//=============================================================================
// LoopTagChecker.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2016/11/02 チェックするフォルダと表示情報を指定できるようにしました
// 2019/03/29 v1.6.0以降で動作しない不具合を修正しました
//=============================================================================

/*:
 * @plugindesc bgmとbgsの音楽ファイルにループタグがついているかチェックします。
 * @author くらむぼん
 *
 * @param folder
 * @desc チェックする音楽ファイルのフォルダ。(bgm:bgmフォルダのみ bgs:bgsフォルダのみ both:両方)
 * @default both
 *
 * @param display
 * @desc 表示する情報。(exist:ループタグが有るもののみ表示 none:ループタグが無いもののみ表示 both:両方表示)
 * @default both
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
	var parameters = PluginManager.parameters('LoopTagChecker');
	var folder = parameters['folder'];
	var display = parameters['display'];
	var exist = display !== 'none';
	var none = display !== 'exist';

	var _WebAudio__readLoopComments = WebAudio.prototype._readLoopComments;
	WebAudio.prototype._readLoopComments = function(array) {
		_WebAudio__readLoopComments.apply(this, arguments);
		if (this._afterReadLoopComments) this._afterReadLoopComments();
	};

	require('nw.gui').Window.get().showDevTools();

	var path = require('path').dirname(process.mainModule.filename) + '/audio/';
	var fs = require('fs');

	if (folder !== 'bgs') check('bgm');
	if (folder !== 'bgm') check('bgs');

	function check(folder) {
		fs.readdirSync(path + folder).forEach(function(file) {
			new WebAudio('audio/' + folder + '/' + file)._afterReadLoopComments = function() {
				if (this._loopStart || this._loopLength) {
					if (exist) console.log(this._url + ': ループタグ有り！ LOOPSTART=' + this._loopStart + ' LOOPLENGTH=' + this._loopLength);
				} else {
					if (none) console.error(this._url + ': ループタグ無し…');
				}
			};
		});
	}
})();
