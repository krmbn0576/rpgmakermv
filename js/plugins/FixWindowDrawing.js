//=============================================================================
// FixWindowDrawing.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2018/09/23 このプラグインを使っている時だけメッセージウィンドウに前の内容が残存するバグを修正
//=============================================================================

/*:
 * @plugindesc ウィンドウ表示が稀におかしくなるバグを修正します。
 * @author くらむぼん
 *
 * @help
 * 最新のWindows版Chromeで、メニュー画面を素早く繰り返し切り替えると
 * 稀にウィンドウ表示がおかしくなって中身が空になったり、
 * 背景色が透明になったりするバグがあるため、それを修正します。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */

(function() {
    'use strict';
    Bitmap.prototype.checkDirty = function() {
        if (this._dirty) {
            setTimeout(this.clearDirty.bind(this), 0);
        }
    };

    Bitmap.prototype.clearDirty = function() {
        this._baseTexture.update();
        this._dirty = false;
    };
    
    var _Window_Message_terminateMessage =
        Window_Message.prototype.terminateMessage;
    Window_Message.prototype.terminateMessage = function() {
        _Window_Message_terminateMessage.call(this);
        this.contents.clear();
    };
})();