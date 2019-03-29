//=============================================================================
// SymbolReplacer.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2019/03/29 v1.6.0以降で動作しない不具合を修正しました
//=============================================================================

/*:
 * @plugindesc ファイル名の!と$を別の語に置き換えます。
 * @author くらむぼん
 *
 * @param method
 * @desc 変換方法。「convert」で変換、「restore」で記号に戻します。
 * @default off
 *
 * @param exclamationmark
 * @desc !マークを置き換えるワードです。
 * @default Exc_
 *
 * @param dollar
 * @desc $マークを置き換えるワードです。
 * @default Dol_
 *
 * @help
 * geocitiesやfc2など古めのレンタルサーバーで「ファイル名には記号は使えません」
 * というエラーが出たのでむしゃくしゃして作りました。以上。
 * 
 * デフォルトでは画像ファイル名に含まれる!マークを「Exc_」に、
 * $マークを「Dol_」に置き換えます。（なお、「_」は使える記号なので大丈夫です）
 * 
 * GitHubなど新しめのサイトではファイル名に記号使えるのでこのプラグインは不要です。
 * 
 * 使い方：
 * １．公開直前までは、普通にゲームを作ります。
 * ２．デプロイメントする前に、methodに「convert」を指定して
 * 　　　「一度テストプレイすると」ファイル名が記号から置き換わります。
 * ３．ゲームの編集に戻るときは、methodに「restore」を指定して
 * 　　　一度テストプレイし、「記号に戻してから」作業を再開するようにしましょう。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var parameters = PluginManager.parameters('SymbolReplacer');
	var name = parameters['method'].toLowerCase();
	var method = {convert: convert, restore: restore}[name];
	var exc = parameters['exclamationmark'];
	var dol = parameters['dollar'];

	if (method && Utils.isOptionValid('test') && Utils.isNwjs()) {
		var imgPath = require('path').dirname(process.mainModule.filename) + '/img/';
		var fs = require('fs');
		action(imgPath + 'characters/');
		action(imgPath + 'parallaxes/');
		require('nw.gui').Window.get().showDevTools();
		if (name === 'convert') console.log('変換成功： ! -> ' + exc + ' , $ -> ' + dol);
		else console.log('復元成功： ' + exc + ' -> ! , ' + dol + ' -> $');
	}

	if (name === 'convert') {
		var _ImageManager_loadBitmap = ImageManager.loadBitmap;
		ImageManager.loadBitmap = function(folder, filename, hue, smooth) {
			return _ImageManager_loadBitmap.call(this, folder, convert(filename), hue, smooth);
		};
	}

	function convert(filename) {
		if (filename) {
			filename = filename.replace(/\!/g, exc);
			filename = filename.replace(/\$/g, dol);
		}
		return filename;
	}

	function restore(filename) {
		if (filename) {			
			filename = filename.replace(new RegExp(exc, 'g'), '!');
			filename = filename.replace(new RegExp(dol, 'g'), '$');
		}
		return filename;
	}

	function action(path) {
		var files = fs.readdirSync(path);
		files.forEach(function(file) {fs.renameSync(path + file, path + method(file));});
	}
})();
