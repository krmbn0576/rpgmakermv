//=============================================================================
// BiimSystem.js
// MIT License (C) 2018 くらむぼん
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// 2019/01/05 アツマールのスクショにbiim枠部分が映らない問題を修正
//=============================================================================

/*:
 * @plugindesc biimシステム・タイムアタック機能を実装するプラグインです。
 * @author くらむぼん
 *
 * @param biimFrame
 * @type boolean
 * @text biim枠
 * @desc biim枠を有効にします。画面が左上に少し縮められ、残りの部分に実況枠がつきます。
 * @default true
 *
 * @param timerX
 * @type number
 * @text タイマーX座標
 * @desc タイマーの横位置です。
 * @default 626
 *
 * @param timerY
 * @type number
 * @text タイマーY座標
 * @desc タイマーの縦位置です。
 * @default 0
 *
 * @help
 * biimシステム・タイムアタック機能を実装するプラグインです。
 * このプラグインをONにすると、画面が横1040px、縦585px(16:9)に変更されて
 * ゲーム画面が左上部に縮められ、残りの部分に実況枠がつくようになります。
 * 
 * また、以下のプラグインコマンドを用いてタイムを計測＆ランキング登録したり、
 * 簡単にbiim枠上に文章を表示したりすることができます。
 * 
 * 
 * プラグインコマンド：
 * BiimSystem frame
 * このコマンド以降、「文章の表示」コマンドでbiim枠下部へ文章の表示が、
 * 「注釈」コマンドでbiim枠右部への文章の表示が行えるようになります。
 * 
 * BiimSystem game
 * 「文章の表示」「注釈」コマンドの効果をもとに戻します。
 * 
 * BiimSystem start
 * タイマーを０秒からスタートします。
 * このタイマーはメニュー画面や戦闘画面などでも止まらずに動いてくれます。
 * ただし、現在のタイマーの値をセーブすることはできません。
 * 
 * BiimSystem stop
 * タイマーをストップします。
 * 
 * BiimSystem send 1
 * 1つ目のタイムランキングに現在のタイムを登録します。（アツマール外では無効）
 * 2つ目以降のランキングに登録したい場合は、「1」の代わりにその数字を指定してください。
 * 
 * BiimSystem show 1
 * 1つ目のタイムランキングを表示します。（アツマール外では仮データが表示されます）
 * 2つ目以降のランキングを表示したい場合は、「1」の代わりにその数字を指定してください。
 * 
 * BiimSystem waitse
 * 直前に再生開始したSEが鳴り止むまで待機します。
 * 主にボイスが終了するまでウェイトする目的での使用を想定しています。
 * 
 * 
 * 備考：
 * ・biim枠をONにすると、画面が狭くなる都合上メニューなどのUIが少し調節されます。
 *   また、左上のゲーム画面は13マスx9マスに縮められます。（縦横4マスずつ減少）
 * ・ピクチャは1~50番がbiim枠より下に、51~100番が枠より上に表示されます。
 * ・「biim枠」パラメータをOFFにすると、枠無し（画面サイズの変更もなし）で
 * 　タイマーなどの機能だけを利用することができます。
 * ・タイマーの位置は「タイマーX座標」「タイマーY座標」パラメータで調節できます。
 * ・タイムランキングはアツマールのスコアボード機能を利用していますが、
 *   スコアボードに登録するためタイム(秒)を-60倍にしたポイントに変換して登録しています。
 *   そのため、アツマールのAPI設定画面などではポイントの値で表示されることにご注意ください。
 *   また、タイムランキングの上限数はスコアボードのボード上限数と同じです。
 * 
 * ライセンス：
 * このプラグインを利用する時は、作者名をプラグインから削除しないでください。
 * それ以外の制限はありません。お好きなようにどうぞ。
 */

(function() {
    'use strict';
    function hook(baseClass, target, addition) {
        if (baseClass.prototype[target]) baseClass = baseClass.prototype;
        baseClass[target] = addition(baseClass[target]);
    }

    function padSpace(str, length) {
        str = String(str);
        while (str.length < length) {
            str = ' ' + str;
        }
        return str;
    }

    function formatTime(second) {
        var hour = Math.floor(second / 60 / 60);
        var min = Math.floor(second / 60) % 60;
        var sec = Math.floor(second % 60);
        var centisec = Math.floor(second * 100) % 100;
        return hour.padZero(2) + ':' + min.padZero(2) + ':' + sec.padZero(2) + '.' + centisec.padZero(2);
    }

    function formatMyRecord(myRecord) {
        return '%1位　\\C[24]%2\\C[0]　%3'.format(padSpace(myRecord.rank, 3), formatTime(-myRecord.score / 60), myRecord.isNewRecord ? '\\C[6]自己新記録！\\C[0]' : '');
    }

    function formatRanking(ranking) {
        return '%1位　\\C[24]%2\\C[0]　%3 \\C[8]さん'.format(padSpace(ranking.rank, 3), formatTime(-ranking.score / 60), ranking.userName);
    }

    var parameters = PluginManager.parameters('BiimSystem');
    var biimFrame = parameters['biimFrame'] === 'true';
    var timerX = +parameters['timerX'];
    var timerY = +parameters['timerY'];
    var width = biimFrame ? 13 * 48 : 816;
    var height = biimFrame ? 9 * 48 : 624;
    var root = new Stage();
    var texture = PIXI.RenderTexture.create(width, height);

    SceneManager._screenWidth = biimFrame ? 1040 : 816;
    SceneManager._screenHeight = biimFrame ? 585 : 624;
    SceneManager._boxWidth = width;
    SceneManager._boxHeight = height;

    var blackScreen = new ScreenSprite();
    blackScreen.opacity = 255;
    blackScreen.setWhite();
    root.addChild(blackScreen);

    var sprite = new PIXI.Sprite(texture);
    root.addChild(sprite);

    var faceSprite;
    var talkWindow;
    var timerWindow;
    var assistWindow;
    var scoreWindow;
    var pictureContainer;
    //TMAutoNewGame.jsとの競合回避（こちらが必ず後からフックする）
    hook(SceneManager, 'run', function(origin) { return function(sceneClass) {
        hook(Scene_Boot, 'start', function(origin) { return function() {
            origin.apply(this, arguments);
            blackScreen.setBlack();
            var screenWidth = SceneManager._screenWidth;
            var screenHeight = SceneManager._screenHeight;
            var faceWidth = Window_Base._faceWidth;
            var faceHeight = Window_Base._faceHeight;

            if (Utils.isNwjs()) {
                var dw = screenWidth - window.innerWidth;
                var dh = screenHeight - window.innerHeight;
                window.moveBy(-dw / 2, -dh / 2);
                window.resizeBy(dw, dh);
            }

            //MakeScreenCapture.jsにBiim枠を写す
            if (SceneManager.makeCapture) {
                hook(SceneManager, 'makeCapture', function(origin) { return function() {
                    origin.apply(this, arguments);
                    var w = width;
                    var h = height;
                    width = this._screenWidth;
                    height = this._screenHeight;
                    var result = Bitmap.snap(root);
                    width = w;
                    height = h;
                    this._captureBitmap = result;
                }});
            }

            //アツマールのスクショにBiim枠を写す
            if (window.RPGAtsumaru && window.RPGAtsumaru.experimental && window.RPGAtsumaru.experimental.screenshot && window.RPGAtsumaru.experimental.screenshot.setScreenshotHandler) {
                window.RPGAtsumaru.experimental.screenshot.setScreenshotHandler(function() {
                    var w = width;
                    var h = height;
                    width = SceneManager._screenWidth;
                    height = SceneManager._screenHeight;
                    var result = Bitmap.snap(root).canvas.toDataURL('image/jpeg', 0.5);
                    width = w;
                    height = h;
                    return result;
                });
            }

            //(15, 11, 1152, 648)
            /*var faceY = height + 12;
            faceSprite = new Sprite();
            faceSprite.move(0, faceY);
            faceSprite.scale = new Point(3 / 4, 3 / 4);

            var talkX = faceWidth * 3 / 4;
            talkWindow = new Window_Base(talkX, faceY, screenWidth - talkX, Window_Base.prototype.fittingHeight(2));*/

            //(13, 9, 1040, 585)
            var faceY = height + 9;
            faceSprite = new Sprite();
            faceSprite.move(0, faceY);

            var talkX = faceWidth;
            talkWindow = new Window_Base(talkX, faceY, screenWidth - talkX, Window_Base.prototype.fittingHeight(3));

            var measureBitmap = new Bitmap();
            var formattedTime = formatTime(time / 60);
            var padding = Window_Base.prototype.standardPadding() * 2;
            var timerWidth = measureBitmap.measureTextWidth(formattedTime) + padding;
            var assistWidth = measureBitmap.measureTextWidth('全角で１２文字ほど入れば') + padding;
            timerWindow = new Window_Base(timerX, timerY, timerWidth, Window_Base.prototype.fittingHeight(1));
            timerWindow.setBackgroundType(1);
            timerWindow.drawMessage(formattedTime);

            var assistHeight = Window_Base.prototype.fittingHeight(6);
            assistWindow = new Window_Base(biimFrame ? (screenWidth + width - assistWidth) / 2 : screenWidth, height - assistHeight, assistWidth, assistHeight);

            scoreWindow = new Window_Score();

            pictureContainer = new Sprite();
            pictureContainer.setFrame(0, 0, screenWidth, screenHeight);
            for (var i = $gameScreen.maxPictures() + 1; i <= $gameScreen.maxPictures() * 2; i++) {
                pictureContainer.addChild(new Sprite_Picture(i));
            }

            root.addChild(faceSprite);
            root.addChild(talkWindow);
            root.addChild(timerWindow);
            root.addChild(assistWindow);
            root.addChild(scoreWindow);
            root.addChild(pictureContainer);
        }});
        origin.apply(this, arguments);
    }});

    Object.defineProperty(Graphics, 'width', {
        get: function() {
            return width;
        },
        configurable: true
    });

    Object.defineProperty(Graphics, 'height', {
        get: function() {
            return height;
        },
        configurable: true
    });

    hook(Graphics, 'render', function(origin) { return function(stage) {
        if (this._skipCount <= 0) {
            this._renderer.render(stage, texture);
        }
        origin.call(this, root);
    }});

    var mode = 'game';
    var measuring = false;
    var time = 0;
    var scoreboardsDefined = window.RPGAtsumaru && window.RPGAtsumaru.experimental && window.RPGAtsumaru.experimental.scoreboards;
    if (!scoreboardsDefined) {
        var nonAtsumaruScoreboardData = Promise.resolve({
            myRecord: { rank: 5, score: -100000, isNewRecord: true },
            ranking: [
                { rank: 1, userName: 'ユーザー1', score: -100 },
                { rank: 2, userName: 'ユーザー2', score: -1000 },
                { rank: 3, userName: 'ながいなまえながいなまえながいなまえ', score: -10000 },
                { rank: 4, userName: '', score: -50000 },
                { rank: 5, userName: 'あなた', score: -100000 },
                { rank: 5, userName: '同じタイムの人', score: -100000 },
                { rank: 7, userName: 'ここはRPGアツマールではないので', score: -500000 },
                { rank: 8, userName: 'スコアを受信することはできません。', score: -1000000 },
                { rank: 9, userName: 'そのかわりに、ここでは', score: -3000000 },
                { rank: 10, userName: '仮のデータを表示しています。', score: -5000000 }
            ]
        });
    }
    hook(Game_Interpreter, 'pluginCommand', function(origin) { return function(command, args) {
        origin.apply(this, arguments);
        var _this = this;
        if (command === 'BiimSystem') {
            switch (args[0]) {
                case 'game':
                case 'frame':
                    mode = args[0];
                    break;
                case 'start':
                    measuring = true;
                    time = 0;
                    break;
                case 'stop':
                    measuring = false;
                    break;
                case 'send':
                    if (scoreboardsDefined) {
                        _this._waitForBiimSystemPlugin = true;
                        window.RPGAtsumaru.experimental.scoreboards.setRecord(+args[1], -time)
                            .then(function() {
                                _this._waitForBiimSystemPlugin = false;
                            }, function(error) {
                                if (error.code === 'BAD_REQUEST') {
                                    SceneManager.catchException(error);
                                }
                                console.error(error);
                            });
                    } else {
                        console.warn('ここはRPGアツマールではないので、スコアを送信できません');
                    }
                    break;
                case 'show':
                    if (!$gameParty.inBattle()) {
                        var scoreboardPromise = nonAtsumaruScoreboardData || window.RPGAtsumaru.experimental.scoreboards.getRecords(+args[1]);
                        scoreboardPromise.then(function(scoreboardData) {
                            scoreWindow.setScoreboardData(scoreboardData);
                        }, function(error) {
                            if (error.code === 'BAD_REQUEST') {
                                SceneManager.catchException(error);
                            }
                            console.error(error);
                            scoreWindow.setScoreboardData(null);
                        });
                        SceneManager.push(Scene_Score);
                    } else {
                        console.error('バトル中は、スコアを表示できません');
                    }
                    break;
                case 'waitse':
                    _this._waitForBiimSystemPlugin = true;
                    var se = AudioManager._seBuffers[AudioManager._seBuffers.length - 1];
                    se.addStopListener(function() {
                        _this._waitForBiimSystemPlugin = false;
                    });
                    break;
            }
        }
    }});

    hook(Game_Interpreter, 'updateWait', function(origin) { return function() {
        return origin.apply(this, arguments) || this._waitForBiimSystemPlugin;
    }});

    //以下文章表示関連
    hook(Game_Interpreter, 'command101', function(origin) { return function() {
        if (mode === 'game') {
            origin.apply(this, arguments);
        } else if (mode === 'frame') {
            var x = this._params[1] % 4;
            var y = Math.floor(this._params[1] / 4);
            var w = Window_Base._faceWidth;
            var h = Window_Base._faceHeight;
            faceSprite.bitmap = ImageManager.loadFace(this._params[0]);
            faceSprite.setFrame(x * w, y * h, w, h);
            var talks = [];
            while (this.nextEventCode() === 401) {
                this._index++;
                talks.push(this.currentCommand().parameters[0]);
            }
            talkWindow.drawMessage(talks.join('\n'));
        }
        return false;
    }});

    hook(Game_Interpreter, 'command108', function(origin) { return function() {
        origin.apply(this, arguments);
        if (mode === 'frame') {
            assistWindow.drawMessage(this._comments.join('\n'));
        }
        return true;
    }});

    Window_Base.prototype.drawMessage = function(message) {
        this.contents.clear();
        this.drawTextEx(message, 0, 0);
    };

    //以下スコアボード表示関連
    function Scene_Score() {
        this.initialize.apply(this, arguments);
    }

    Scene_Score.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Score.prototype.constructor = Scene_Score;

    Scene_Score.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        scoreWindow.activate();
        scoreWindow.setHandler('ok', this.popScene.bind(this));
        scoreWindow.setHandler('cancel', this.popScene.bind(this));
    };

    Scene_Score.prototype.isReady = function() {
        return Scene_MenuBase.prototype.isReady.call(this) && (scoreWindow.isOpening() || scoreWindow.isOpen());
    };

    Scene_Score.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (TouchInput.isTriggered() && !scoreWindow.isTouchedInsideFrame()) {
            SoundManager.playCancel();
            this.popScene();
        }
    };

    Scene_Score.prototype.popScene = function() {
        Scene_MenuBase.prototype.popScene.call(this);
        scoreWindow.close();
    };

    Scene_Score.prototype.isBusy = function() {
        return Scene_MenuBase.prototype.isBusy.call(this) || scoreWindow.isClosing();
    };


    function Window_Score() {
        this.initialize.apply(this, arguments);
    }

    Window_Score.prototype = Object.create(Window_Command.prototype);
    Window_Score.prototype.constructor = Window_Score;

    Window_Score.prototype.initialize = function() {
        Window_Command.prototype.initialize.call(this, 0, 0);
        this.openness = 0;
    };

    Window_Score.prototype.windowWidth = function() {
        return Math.min(840, SceneManager._screenWidth);
    };

    Window_Score.prototype.windowHeight = function() {
        return Math.min(this.fittingHeight(Math.min(this.numVisibleRows(), 10)), SceneManager._screenHeight);
    };

    Window_Score.prototype.makeCommandList = function() {
        if (this._scoreboardData) {
            if (this._scoreboardData.myRecord) {
                this.addCommand('今回のスコア');
                this.addCommand(formatMyRecord(this._scoreboardData.myRecord));
                this.addCommand('');
            }
            this.addCommand('ランキングボード');
            this._scoreboardData.ranking.forEach(function(ranking) {
                this.addCommand(formatRanking(ranking));
            }, this);
        } else {
            this.addCommand('エラー');
            this.addCommand('スコアの読み込みに失敗しました');
            this.addCommand('');
            this.addCommand('画面をタッチorキー入力して進む');
        }
    };

    Window_Score.prototype.drawItem = function(index) {
        var rect = this.itemRectForText(index);
        var text = this.commandName(index);
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        if (text === '今回のスコア' || text === 'ランキングボード' || text === 'エラー') {
            this.changeTextColor(this.textColor(27));
            this.drawText(text, rect.x, rect.y, rect.width, 'center');
        } else {
            this.drawTextEx(text, rect.x, rect.y);
        }
    };

    Window_Score.prototype.setScoreboardData = function(scoreboardData) {
        this.select(0);
        this._scoreboardData = scoreboardData;
        this.refresh();
        this.width = this.windowWidth();
        this.height = this.windowHeight();
        this.x = (SceneManager._screenWidth - this.width) / 2;
        this.y = (SceneManager._screenHeight - this.height) / 2;
        this.refresh();
        this.open();
    };


    hook(Scene_Base, 'update', function(origin) { return function() {
        origin.apply(this, arguments);
        root.children.forEach(function(child) {
            if (child.update) {
                child.update();
            }
        });
        if (measuring) {
            time++;
            timerWindow.drawMessage(formatTime(time / 60));
        }
    }});

    //以下UI調整
    if (!biimFrame) {
        hook(Sprite_Timer, 'updatePosition', function(origin) { return function() {
            origin.apply(this, arguments);
            this.y += timerWindow.height;
        }});

        hook(Window_Message, 'updatePlacement', function(origin) { return function() {
            origin.apply(this, arguments);
            if (this._goldWindow.y === 0) this._goldWindow.y += timerWindow.height;
        }});
        return;
    }

    Window_Base.prototype.reserveFaceImages = function() {
        $gameParty.members().forEach(function(actor) {
            ImageManager.reserveCharacter(actor.characterName());
            ImageManager.reserveFace(actor.faceName());
        });
    };

    Window_MenuStatus.prototype.drawItemImage = function(index) {
        var actor = $gameParty.members()[index];
        var rect = this.itemRect(index);
        this.changePaintOpacity(actor.isBattleMember());
        //this.drawActorFace(actor, rect.x + 1, rect.y + 1, Window_Base._faceWidth, Window_Base._faceHeight);
        this.drawActorCharacter(actor, rect.x + 64, rect.y + 64);
        this.changePaintOpacity(true);
    };
    
    Window_MenuStatus.prototype.drawItemStatus = function(index) {
        var actor = $gameParty.members()[index];
        var rect = this.itemRect(index);
        var x = rect.x/* + 162*/;
        var y = rect.y + rect.height / 2 - this.lineHeight() * 1.5;
        var width = rect.width - x - this.textPadding();
        this.drawActorSimpleStatus(actor, x, y, width);
    };

    Game_Screen.prototype.maxPictures = function() {
        return 50;
    };

    // [1-50]biim枠より下のピクチャ [51-100]biim枠より下の戦闘用ピクチャ [101-150]biim枠より上のピクチャ
    Game_Screen.prototype.realPictureId = function(pictureId) {
        if (pictureId > this.maxPictures() || $gameParty.inBattle()) {
            return pictureId + this.maxPictures();
        } else {
            return pictureId;
        }
    };

    //[51-100]を消す
    Game_Screen.prototype.eraseBattlePictures = function() {
        for (var i = $gameScreen.maxPictures() + 1; i <= $gameScreen.maxPictures() * 2; i++) {
            this._pictures[i] = null;
        }
    };
})();