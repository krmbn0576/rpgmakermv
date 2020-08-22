//=============================================================================
// InputForm.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// 2017/09/03 iOSで「決定」ボタンを押せないバグを修正＆裏のゲーム画面のクリックを無効に
// 2018/12/06 入力欄の大きさを画面サイズに追従＆iPhoneで画面がズレるバグ修正＆文字サイズ設定＆初期値設定
// 2020/08/22 RPGツクールMZに対応
//=============================================================================

/*:
 * @target MZ
 * @plugindesc フォーム作って文字入力（修正版）
 * @author １１１, くらむぼん
 *
 *
 * @help
 * 文字入力フォームを表示して、文字を入力させます。
 * イベントコマンドの「名前入力の処理」とは違い、
 * 慣れ親しんだキーボード入力やフリック入力などを用いられます。
 * また、漢字を含む自由な文字が入力できます。
 * 
 * ---準備---
 * ゲームフォルダにあるcssフォルダ（なければ作る）に111_InputForm.cssを入れましょう。
 * ちなみにこのファイルをいじって入力フォームのデザイン・幅などを変えられます。
 * いじり方がわからなかったら「css 書き方」などで検索だ！
 * 
 * ---RPGツクールMZでの使い方---
 * プラグインコマンドを用いて、入力欄を表示できます。
 * 最低限「入力欄のX位置」「入力欄のY位置」で表示位置を調整して、
 * 「入力結果の代入先」に変数を設定すれば動きます。
 * 必要なら他のパラメータも調節してみてください。
 * 
 * ---RPGツクールMVでの使い方---
 * ◆プラグインコマンド：InputForm x=350;y=200;v=11;max=5;
 * みたいな感じで。この例だとx350,y200の位置に表示、結果を11番の変数に保存。
 * 最大文字数は5（maxは省略すれば無制限にもできる）
 *
 * 時間切れなどを作りたい時は、if_s=3;を付けると
 * ”スイッチ３がONになった場合”に強制終了できます
 * 並列イベントの中で、スイッチ３をONにするイベントを作りましょう
 * （ハマリポイント１）なおこの際、強制終了した瞬間の
 * テキストが結果の変数にしっかり保存されていることに注意。
 *
 * 入力が終わるまで次のイベントコマンドは読み込みません
 * （ハマリポイント２）次のイベントコマンドの読み込みまでは
 * 少し間があるため結果の変数を他の並列処理で上書きしないよう注意。
 *
 *
 * 機能追加：
 * Inputform （中略）btn_x=100;btn_y=100;
 * という書き方で、「決定」ボタンの位置を細かく調整できるようにしました。
 * 値はテキストボックスからの相対位置で、デフォルトはbtn_x=0;btn_y=50;です。
 *
 * （2018/12/06追加）
 * 入力欄や決定ボタンの縮尺が画面の縮尺に合わせて伸び縮みするようになりました。
 *
 * Inputform （中略）font_size=30;
 * で入力欄・決定ボタンの文字の大きさを変更できます。
 * font_sizeを指定しなければfont_size=24になります。
 *
 * Inputform （中略）placeholder=文章;
 * で「文章」の内容を最初から入力欄に表示しておくことができます。
 * デフォルトネームを設定しておく場合などにご利用ください。
 * なお、placeholder=$;と指定すると変数vに入っている内容が表示されます。
 *
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 *
 * @command show
 * @text 文字入力の処理
 * @desc
 *
 * @arg target_x
 * @type number
 * @text 入力欄のX位置
 *
 * @arg target_y
 * @type number
 * @text 入力欄のY位置
 *
 * @arg variables_id
 * @type variable
 * @text 入力結果の代入先
 *
 * @arg max_count
 * @type number
 * @text 最大文字数
 *
 * @arg if_switch_id
 * @type switch
 * @text ONのとき入力を強制終了
 *
 * @arg button_x
 * @type number
 * @min -10000
 * @default 0
 * @text 決定ボタンの相対X位置
 *
 * @arg button_y
 * @type number
 * @min -10000
 * @default 50
 * @text 決定ボタンの相対Y位置
 *
 * @arg unit_font_size
 * @type number
 * @default 24
 * @text 文字サイズ
 *
 * @arg placeholder
 * @type string
 * @text 入力欄の初期値
*/
(function() {
    function stopPropagation(event) {
        event.stopPropagation();
    }

    // css追加
    (function(){
        var css = document.createElement('link');
        css.rel = "stylesheet";
        css.type = 'text/css';
        css.href = './css/111_InputForm.css';
        var b_top = document.getElementsByTagName('head')[0];
        b_top.appendChild(css);
    })();
    // キー入力不可にする為に
    Input.form_mode = false;
    var _Input_onKeyDown = Input._onKeyDown;
    Input._onKeyDown = function(event) {
        if(Input.form_mode)return;
        _Input_onKeyDown.call(this , event)
    };
    var _Input_onKeyUp = Input._onKeyUp;
    Input._onKeyUp = function(event) {
        if(Input.form_mode)return;
        _Input_onKeyUp.call(this , event)
    };
    // 入力終わるまで次のイベントコマンド読み込まない
    var _Game_Interpreter_updateWaitMode =
            Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function(){
        if(this._waitMode == 'input_form')return true;
        return _Game_Interpreter_updateWaitMode.call(this);
    }

    HTMLElement.prototype.postionAdjust = function(screen_postion , target_postion, unitFontSize){
        this.style.left = screen_postion[0] + target_postion[0] * Graphics._realScale + "px";
        this.style.top  = screen_postion[1] + target_postion[1] * Graphics._realScale + "px";
        this.style.fontSize = unitFontSize * Graphics._realScale + "px";
        this.style.maxWidth = 'calc(100% - ' + this.style.left + ')';
        this.style.maxHeight = 'calc(100% - ' + this.style.top + ')';
    };
    // 引数のx=350;y=200;みたいなのを可能にする
    var argHash = function(text , arg_names){
        var _args = new Array(arg_names.length);
        var ary = text.split(";");
        ary.forEach(function(str){
            var s_ary = str.split("=");
            var prop = s_ary[0].toLowerCase();
            var value = s_ary[1];
            _args[arg_names.indexOf(prop)] = value;
        });
        return _args;
    }
    //=============================================================================
    // Game_Interpreter - register plugin commands
    //=============================================================================
    var _Game_Interpreter_pluginCommand =
            Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'InputForm'){
            var _ary = argHash(args[0] , ["x" , "y" , "v" , "max" , "if_s", "btn_x", "btn_y", "font_size", "placeholder"]);
            var target_x = +_ary[0];
            var target_y = +_ary[1];
            var variables_id = +_ary[2];
            var max_count = _ary[3] || null;
            var if_switch_id = Number(_ary[4]) || null;
            var button_x = +_ary[5] || 0;
            var button_y = _ary[6] === '' || isNaN(_ary[6]) ? 50 : +_ary[6];
            var unit_font_size = _ary[7] === '' || isNaN(_ary[7]) ? 24 : +_ary[7];
            var placeholder = _ary[8];
            this._inputForm(target_x, target_y, variables_id, max_count, if_switch_id, button_x, button_y, unit_font_size, placeholder);
        }
    };

    if (PluginManager.registerCommand) {
        PluginManager.registerCommand("111_InputForm", "show", function(args) {
            var { target_x, target_y, variables_id, max_count, if_switch_id, button_x, button_y, unit_font_size, placeholder } = args;
            this._inputForm(+target_x, +target_y, +variables_id, +max_count, +if_switch_id, +button_x, +button_y, +unit_font_size, placeholder);
        });
    }

    Game_Interpreter.prototype._inputForm = function(target_x, target_y, variables_id, max_count, if_switch_id, button_x, button_y, unit_font_size, placeholder) {
            var interpreter = this;
            var gui = {
                input : null ,
                submit : null ,
                is_pc : true ,
                init : function(){
                    this.is_pc = Utils.isNwjs();
                    this.create();
                    this.input.focus();
                    this.screenAdjust();
                } ,
                create : function(){
                    // 入力フォーム
                    this.input = document.createElement('input');
                    this.input.setAttribute('id', '_111_input');
                    if(max_count)this.input.setAttribute('maxlength', max_count);

                    if (placeholder === '$') {
                        placeholder = $gameVariables.value(variables_id);
                    }
                    this.input.setAttribute('value', placeholder || '');
                    document.body.appendChild(this.input);
                    // 送信ボタン
                    this.submit = document.createElement('input');
                    this.submit.setAttribute('type', 'submit');
                    this.submit.setAttribute('id', '_111_submit');
                    this.submit.setAttribute('value', '決定');
                    document.body.appendChild(this.submit);
                } ,
                success : function(){
                    $gameVariables.setValue(variables_id , this.input.value);
                    this.end();
                } ,
                cancel : function(){
                    $gameVariables.setValue(variables_id , this.input.value);
                    this.end();
                } ,
                start : function(){
                    interpreter.setWaitMode('input_form');
                    Input.clear();
                    Input.form_mode = true;
                    // SceneManager._scene.stop();
                } ,
                end : function(){
                    this.input.remove(); // document.body.removeChild(this.input);
                    this.submit.remove();
                    window.removeEventListener("resize", resizeEvent, false);
                    interpreter.setWaitMode('');
                    Input.form_mode = false;
                    clearInterval(_event);
                    // SceneManager._scene.start();
                } ,
                screenAdjust : function(){ // canvasの左上を基準にした位置に合わせる
                    var screen_x , screen_y;
                    var _canvas = document.getElementById('UpperCanvas') || document.getElementById('gameCanvas');
                    var rect = _canvas.getBoundingClientRect();
                    screen_x = rect.left;
                    screen_y = rect.top;
                    this.input.postionAdjust([screen_x,screen_y] , [target_x,target_y], unit_font_size);
                    this.submit.postionAdjust([screen_x,screen_y] , [target_x + button_x,target_y + button_y], unit_font_size);
                }
            }
            //
            gui.init();
            // 送信するイベントgui.input.onkeydown = function(e){
            gui.input.addEventListener("keydown" ,function(e){
                if(e.keyCode === 13){ // 決定キーで送信
                    Input.clear();
                    gui.success();
                    // 親へのイベント伝播を止める（documentのkeydownが反応しないように）
                    e.stopPropagation();
                }
            });
            gui.input.addEventListener("mousedown", stopPropagation); // 裏のゲーム画面のクリック暴発を防ぐ
            gui.input.addEventListener("touchstart", stopPropagation); // iOSでclickイベント取れない対策
            gui.submit.addEventListener("mousedown", stopPropagation); // 裏のゲーム画面のクリック暴発を防ぐ
            gui.submit.addEventListener("touchstart", stopPropagation); // iOSでclickイベント取れない対策
            gui.submit.addEventListener("click" ,function(){ // 送信ボタンクリック
                gui.success();
                return false;
            });
            // キャンセルするイベント
            if (if_switch_id) {
                var _event = setInterval(function(){
                    if($gameSwitches.value(if_switch_id)){
                        // clearInterval(_event);
                        gui.cancel();
                    }
                }, 1);
            }

            // webではウィンドー大きさ変わる度に%求め直すイベントもいる
            //if(! gui.is_pc){
                var resizeEvent = gui.screenAdjust.bind(gui);
                window.addEventListener("resize", resizeEvent, false);
            //}
            //
            gui.start();
    };
})();
