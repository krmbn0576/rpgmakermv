//=============================================================================
// HyperLink.js
// PUBLIC DOMAIN
//=============================================================================

/*:
 * @plugindesc ゲーム中に外部ページへのリンクを貼ります。
 * @author くらむぼん
 *
 * @param description
 * @desc リンクと一緒に表示されるメッセージ。すべてのリンクにおいて共通です
 * @default Webサイトへのリンク
 *
 * @help
 * プラグインコマンドにより指定したタイミングで、他のページへのリンクを表示します。
 * 位置は画面中央固定。仕組み上ポップアップブロックされることはないはずです。
 * 
 * プラグインコマンド：
 * link on http://*** タイトル
 * 　「http://***」へのリンクを「タイトル」という名前で画面に表示します。
 * link off
 * 　表示しているリンクを消します。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
	'use strict';
	var parameters = PluginManager.parameters('HyperLink');
	var description = parameters['description'];

	function stopPropagation(event) {
		event.stopPropagation();
	}

	Graphics.printLink = function(url, title) {
		if (this._errorPrinter) {
			var link = '<a href="' + url + '" target="_blank" id="HyperLink">' + title + '</a>';
			this._errorPrinter.innerHTML = this._makeErrorHtml(description, link);
			var a = document.getElementById('HyperLink');
			a.addEventListener('mousedown', stopPropagation);
			a.addEventListener('touchstart', stopPropagation);
		}
	};

	Graphics.clearLink = function() {
		if (this._errorPrinter) {
			this._errorPrinter.innerHTML = '';
		}
	};

	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.apply(this, arguments);
		if (command.toLowerCase() === 'link') {
			switch (args[0].toLowerCase()) {
				case 'on':
					Graphics.printLink(args[1], args[2]);
					break;
				case 'off':
					Graphics.clearLink();
					break;
				default:
					break;
			}
		}
	};
})();