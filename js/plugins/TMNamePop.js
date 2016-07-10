//=============================================================================
// TMVplugin - ネームポップ
// 作者: tomoaky (http://hikimoki.sakura.ne.jp/)
// Version: 1.32
// 最終更新日: 2016/07/05
//=============================================================================

/*:
 * @plugindesc イベントの頭上に文字列を表示する機能を追加します。
 *
 * @author tomoaky (http://hikimoki.sakura.ne.jp/)
 *
 * @param backOpacity
 * @desc 背景の不透明度。
 * 初期値: 96
 * @default 96
 *
 * @param fontSize
 * @desc フォントの大きさ。
 * 初期値: 20
 * @default 20
 *
 * @param fontOutlineWidth
 * @desc フォントの縁取りの太さ。
 * 初期値: 4
 * @default 4
 *
 * @param fontOutlineColor
 * @desc フォントの縁取りの色。
 * 初期値: rgba(0, 0, 0, 0.5)
 * @default rgba(0, 0, 0, 0.5)
 *
 * @param width
 * @desc ネームポップの幅
 * 初期値: 160
 * @default 160
 *
 * @param useRoundRect
 * @desc 背景に角丸矩形を使用する（要TMBitmapEx.js）
 * 初期値: 0（ 0 で使用しない / 1 で使用する）
 * @default 0
 *
 * @param roundRectRadius
 * @desc 角丸矩形の丸部分の半径
 * 初期値: 6
 * @default 6
 *
 * @help
 * イベントの透明化をオンにするとネームポップも非表示になります。
 * ネームポップだけを表示したい場合はイベントの画像を (なし) にしてください。
 *
 * フォントの縁取りの色はRGB値と不透明度で設定します。
 * R, G, B の３つは 0 ～ 255、不透明度は 0 ～ 1 の範囲で値を設定してください。
 * rgba(255, 0, 255, 1)     # 不透明なピンク
 *
 * 背景に角丸矩形を利用する場合はTMBitmapEx.jsをこのプラグインよりも上に
 * 導入したうえで、パラメータuseRoundRectの値を 1 にする必要があります。
 *
 * プラグインコマンド:
 *   namePop 1 名前         # イベント１番に名前をセット
 *   namePop 1 名前 -48     # イベント１番に名前をセット、上へ４８ドットずらす
 *
 *   ネームポップを消去したい場合は namePop 1 を実行してください。
 *   名前が省略されるとネームポップが消去されます。
 * 
 * メモ欄（イベント）タグ:
 *   <namePop:名前>         # 名前をイベントの頭上に表示
 *   <namePopY:12>          # ネームポップの位置を下へ１２ドットずらす
 * 
 *   イベントのメモ欄以外に、実行内容の一番上にある注釈コマンド内でも
 *   同様のタグで名前を設定することができます。
 *   メモ欄と注釈の両方にタグがある場合は注釈が優先されます。
 *
 *   名前には一部の制御文字を使用することができます。
 *   \V, \N, \P, \G, \\, \C が使えます、使い方は『文章の表示』と
 *   同じですが、\C はネームポップ全体の文字色を変更します。
 *   名前の一部だけ別の色にするような使い方はできません。
 *
 *   制御文字による置換はプラグインコマンドやイベントページの切り替えにより
 *   名前が変化したときにのみ実行されます。つまり \V で変数の値を名前として
 *   設定し、その後変数の値を別の値に変更してもネームポップは変化しません。
 * 
 */

var Imported = Imported || {};
Imported.TMNamePop = true;

if (!Imported.TMEventBase) {
  Imported.TMEventBase = true;
  (function() {
  
    //-----------------------------------------------------------------------------
    // Game_Event
    //
  
    var _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
      _Game_Event_setupPage.call(this);
      if (this._pageIndex >= 0) {
        this.loadCommentParams();
      }
    };

    Game_Event.prototype.loadCommentParams = function() {
      this._commentParams = {};
      var re = /<([^<>:]+)(:?)([^>]*)>/g;
      var list = this.list();
      for (var i = 0; i < list.length; i++) {
        var command = list[i];
        if (command && command.code == 108 || command.code == 408) {
          for (;;) {
            var match = re.exec(command.parameters[0]);
            if (match) {
              if (match[2] === ':') {
                this._commentParams[match[1]] = match[3];
              } else {
                this._commentParams[match[1]] = true;
              }
            } else {
              break;
            }
          }
        } else {
          break;
        }
      }
    };

    Game_Event.prototype.loadTagParam = function(paramName) {
      if (this._commentParams[paramName]) {
        return this._commentParams[paramName];
      } else if (this.event().meta[paramName]) {
        return this.event().meta[paramName];
      } else {
        return null;
      }
    };

  })();
}

(function() {

  var parameters = PluginManager.parameters('TMNamePop');
  var backOpacity = +parameters['backOpacity'];
  var fontSize = +parameters['fontSize'];
  var fontOutlineWidth = +parameters['fontOutlineWidth'];
  var fontOutlineColor = parameters['fontOutlineColor'];
  var width = +parameters['width'];
  var useRoundRect = parameters['useRoundRect'] === '1' ? true : false;
  var roundRectRadius = parameters['roundRectRadius'] === undefined ?
                        6 : +parameters['roundRectRadius'];
  
  //-----------------------------------------------------------------------------
  // Game_CharacterBase
  //

  Game_CharacterBase.prototype.setNamePop = function(namePop, shiftY) {
    if (namePop) {
      namePop = Window_Base.prototype.convertEscapeCharacters.call(
                new Window_Base(0, 0, 0, 0), namePop);
    }
    this._namePop = namePop;
    this._namePopY = shiftY;
  };

  //-----------------------------------------------------------------------------
  // Game_Event
  //

  var _Game_Event_setupPage = Game_Event.prototype.setupPage;
  Game_Event.prototype.setupPage = function() {
    _Game_Event_setupPage.call(this);
    this.setNamePop(null, 0);
    if (this._pageIndex >= 0) {
      this.setNamePop(this.loadTagParam('namePop'), +this.loadTagParam('namePopY'));
    }
  };
  
  //-----------------------------------------------------------------------------
  // Game_Interpreter
  //

  var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === 'namePop') {
      var character = this.character(args[0]);
      if (character) {
        character.setNamePop(args[1], Number(args[2] || 0));
      }
    }
    if (command === 'TMNamePop') {
      switch (args[0]) {
      case 'set':
        var character = this.character(args[1]);
        if (character) {
          character.setNamePop(args[2], Number(args[3] || 0));
        }
        break;
      }
    }
  };
  
  //-----------------------------------------------------------------------------
  // Sprite_Character
  //

  var _Sprite_Character_initMembers = Sprite_Character.prototype.initMembers;
  Sprite_Character.prototype.initMembers = function() {
    _Sprite_Character_initMembers.call(this);
    this._namePop = null;
  };

  var _Sprite_Character_update = Sprite_Character.prototype.update;
  Sprite_Character.prototype.update = function() {
    _Sprite_Character_update.call(this);
    this.updateNamePop();
  };

  Sprite_Character.prototype.updateNamePop = function() {
    if (this._namePop !== this._character._namePop) {
      this._namePop = this._character._namePop;
      if (this._namePop) {
        if (!this._namePopSprite) {
          this._namePopSprite = new Sprite_TMNamePop();
          this.addChild(this._namePopSprite);
          this._namePopSprite.y = this.namePopShiftY();
        }
        this._namePopSprite.refresh(this._namePop);
      } else {
        this.removeChild(this._namePopSprite);
        this._namePopSprite = null;
      }
    }
  };

  Sprite_Character.prototype.namePopShiftY = function() {
    return -this.patternHeight() + this._character._namePopY;
  };
  
  //-----------------------------------------------------------------------------
  // Sprite_TMNamePop
  //

  function Sprite_TMNamePop() {
    this.initialize.apply(this, arguments);
  }

  Sprite_TMNamePop.prototype = Object.create(Sprite.prototype);
  Sprite_TMNamePop.prototype.constructor = Sprite_TMNamePop;

  Sprite_TMNamePop.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this.bitmap = new Bitmap(width, fontSize + 4);
    this.bitmap.fontSize = fontSize;
    this.bitmap.outlineWidth = fontOutlineWidth;
    this.bitmap.outlineColor = fontOutlineColor;
    this.anchor.x = 0.5;
    this.anchor.y = 1;
  };

  Sprite_TMNamePop.prototype.update = function() {
    Sprite.prototype.update.call(this);
    this.y = this.parent.namePopShiftY();
  };

  Sprite_TMNamePop.prototype.refresh = function(text) {
    this.bitmap.clear();
    this.bitmap.textColor = '#ffffff';
    text = this.convertEscapeCharacters(text);
    var tw = this.bitmap.measureTextWidth(text);
    var x = Math.max((this.width - tw) / 2 - 4, 0);
    var w = Math.min(tw + 8, this.width);
    this.bitmap.paintOpacity = backOpacity;
    if (Imported.TMBitmapEx && useRoundRect) {
      this.bitmap.fillRoundRect(x, 0, w, this.height, roundRectRadius, '#000000');
    } else {
      this.bitmap.fillRect(x, 0, w, this.height, '#000000');
    }
    this.bitmap.paintOpacity = 255;
    this.bitmap.drawText(text, 0, 0, this.width, this.height, 'center');
  };
  
  Sprite_TMNamePop.prototype.convertEscapeCharacters = function(text) {
    text = text.replace(/\x1bC\[(\d+)\]/gi, function() {
      this.bitmap.textColor = this.textColor(arguments[1]);
      return '';
    }.bind(this));
    return text;
  };

  Sprite_TMNamePop.prototype.textColor = function(n) {
    var px = 96 + (n % 8) * 12 + 6;
    var py = 144 + Math.floor(n / 8) * 12 + 6;
    var windowskin = ImageManager.loadSystem('Window');
    return windowskin.getPixel(px, py);
  };

})();
