//=============================================================================
// TMVplugin - 自動ニューゲーム
// 作者: tomoaky (http://hikimoki.sakura.ne.jp/)
// Version: 1.1
// 最終更新日: 2015/12/25
//=============================================================================

/*:
 * @plugindesc 起動時に自動ではじめからゲームを開始します。
 * Web用ミニゲームなど、タイトルが不要な場合に使えます。
 * @author tomoaky (http://hikimoki.sakura.ne.jp/)
 *
 * @param autoNewGame
 * @desc 自動ではじめからゲームを開始する。
 * 初期値: 1（ 0 で無効 / 1 で有効）
 * @default 1
 *
 * @param allwaysOnTop
 * @desc 常にゲームウィンドウを最前面に表示する。
 * 初期値: 1（ 0 で無効 / 1 で有効）
 * @default 1
 *
 * @param autoDevTool
 * @desc 自動でデベロッパツールを開く。
 * 初期値: 1（ 0 で無効 / 1 で有効）
 * @default 1
 *
 * @help プラグインコマンドはありません。
 * 
 */

var Imported = Imported || {};
Imported.TMAutoNewGame = true;

(function() {

  var parameters = PluginManager.parameters('TMAutoNewGame');
  var autoNewGame  = parameters['autoNewGame'] === '1' ? true : false;
  var allwaysOnTop = parameters['allwaysOnTop'] === '1' ? true : false;
  var autoDevTool  = parameters['autoDevTool'] === '1' ? true : false;

  Scene_Boot.prototype.start = function() {
    Scene_Base.prototype.start.call(this);
    SoundManager.preloadImportantSounds();
    if (DataManager.isBattleTest()) {
      DataManager.setupBattleTest();
      SceneManager.goto(Scene_Battle);
    } else if (DataManager.isEventTest()) {
      DataManager.setupEventTest();
      SceneManager.goto(Scene_Map);
    } else {
      this.checkPlayerLocation();
      DataManager.setupNewGame();
      if (Utils.isNwjs() && Utils.isOptionValid('test') && autoDevTool) {
        require('nw.gui').Window.get().showDevTools().moveTo(0, 0);
        require('nw.gui').Window.get().setAlwaysOnTop(allwaysOnTop);
        window.focus();
      }
      SceneManager.goto(autoNewGame ? Scene_Map : Scene_Title);
      Window_TitleCommand.initCommandPosition();
    }
    this.updateDocumentTitle();
  };

})();
