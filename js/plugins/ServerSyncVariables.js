//=============================================================================
// ServerSyncVariables.js
// MIT License (C) 2019 くらむぼん
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc ツクール変数を、RPGアツマールのグローバルサーバー変数化します。
 * @author くらむぼん
 *
 * @help
 * RPGアツマールのグローバルサーバー変数を使うと、
 * インターネットを通じて全プレイヤーの間で同じ値を持つ変数を作れます。
 * （利用例：みんなで倒す巨大ボスを作る　全プレイヤーの累計死亡数をカウント）
 * 
 * このプラグインを使えば、いつものツクールの変数を「グローバルサーバー変数化」し、
 * 超お手軽にネットゲームを作ることができます！
 * 
 * 
 * 準備手順：
 * １．グローバルサーバー変数化したいツクールの変数にあらかじめ名前をつけておき、
 * 　　このプラグインをONにして、ゲームをRPGアツマールにアップロードします。
 * 
 * ２．RPGアツマール開発から配布されているドキュメント
 * 　　(https://atsumaru.github.io/api-references/global-server-variable/setting)を参考に、
 * 　　API設定画面からグローバルサーバー変数を１つ作ります。
 * 　　このとき、グローバルサーバー変数の名前は１でつけた名前と同じにします。
 * 　　現在値と最小値・最大値もここで忘れずに設定しておきましょう。
 * 
 * ３．２で作った変数に「ゲーム内で増減値を指定して実行」型のトリガーを１つ追加します。
 * 　　差分の最小値は-9999999999に、差分の最大値は9999999999にしておきましょう。
 * 
 * ４．グローバルサーバー変数化したい変数の数だけ２～３を繰り返します。
 * 
 * ５．RPGアツマールにアップロードしたゲームを遊ぶと、
 * 　　グローバルサーバー変数化した変数の値が全プレイヤー間で共有されるようになります！
 * 
 * 
 * 備考：
 * ・このプラグインは、同じ名前を持つグローバルサーバー変数とツクールの変数を
 * 　１：１で結びつけて、定期的にその値を同期する仕組みとなっています。
 * 　同じ名前を持つグローバルサーバー変数やツクールの変数が
 * 　２つ以上存在すると、不具合が発生しますのでご注意ください。
 * 
 * ・このプラグインではRPGアツマールAPIの利用回数を５～１０秒に１回程度までに抑えているため、
 * 　同期の頻度は高くはありません。リアルタイムではなく、数秒遅延するものとお考えください。
 * 　また、グローバルサーバー変数を変更したあとすぐにゲームを終了すると、
 * 　変更分がサーバーに反映されるのが間に合わず、無効になることがあります。
 * 
 * ・テストプレイ中や、RPGアツマール以外にアップロードした場合はグローバルサーバー変数化されません。
 * 　その場合は普通の変数のように動作します。
 * 
 * 
 * ライセンス：
 * このプラグインを利用する時は、作者名をプラグインから削除しないでください。
 * それ以外の制限はありません。お好きなようにどうぞ。
 */

(function() {
    'use strict';
    var globalServerVariable = window.RPGAtsumaru && window.RPGAtsumaru.experimental && window.RPGAtsumaru.experimental.globalServerVariable;
    var variables = {};

    function triggerEval(trigger) {
        return Math.min(Math.abs(trigger.argument1), Math.abs(trigger.argument2));
    }

    function sendDeltaServerVariable(gameVariable) {
        var variable = variables[gameVariable];
        if (globalServerVariable && variable.delta !== 0) {
            globalServerVariable.triggerCall(variable.trigger, variable.delta)
                .then(function() {
                    var value = $gameVariables.value(gameVariable);
                    variables[gameVariable].value = value;
                    $gameVariables.setValue(gameVariable, value);
                }, function(error) {
                    console.error(error);
                });
        }
    }

    function fetchServerVariables() {
        if (globalServerVariable && !document.hidden) {
            globalServerVariable.getAllGlobalServerVariables()
                .then(function(result) {
                    var deltas = {};
                    for (var gameVariable in variables) {
                        deltas[gameVariable] = variables[gameVariable].delta;
                    }
                    variables = {};
                    result.forEach(function(variable) {
                        var gameVariable = $dataSystem.variables.indexOf(variable.name);
                        if (gameVariable === -1) {
                            return;
                        }
                        variable.delta = deltas[gameVariable] || 0;
                        var triggers = variable.triggers.filter(function(t) { return t.triggerType === 'specifiedValue' });
                        if (triggers.length === 0) {
                            return;
                        }
                        variable.trigger = triggers.sort(function(a, b) { return triggerEval(b) - triggerEval(a) })[0].triggerId;
                        variables[gameVariable] = variable;
                        $gameVariables.setValue(gameVariable, variable.value + variable.delta);
                    });
                }, function(error) {
                    console.error(error);
                });
        }
    }

    function sendServerVariables() {
        var interval = 0;
        for (var gameVariable in variables) {
            var variable = variables[gameVariable];
            if (variable.delta !== 0) {
                setTimeout(sendDeltaServerVariable, interval, gameVariable);
                interval += 10000;
            }
        }
        setTimeout(sendServerVariables, Math.max(interval, 10000));
    };

    var _SceneManager_run = SceneManager.run;
    SceneManager.run = function(sceneClass) {
        var _Scene_Boot_start = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function() {
            _Scene_Boot_start.apply(this, arguments);
            setTimeout(sendServerVariables, 5000);
            fetchServerVariables();
            setInterval(fetchServerVariables, 10000);
        };
        _SceneManager_run.apply(this, arguments);
    };

    var _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.apply(this, arguments);
        for (var gameVariable in variables) {
            $gameVariables.setValue(gameVariable, variables[gameVariable].value + variables[gameVariable].delta);
        }
    };

    var _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        _DataManager_extractSaveContents.apply(this, arguments);
        for (var gameVariable in variables) {
            $gameVariables.setValue(gameVariable, variables[gameVariable].value + variables[gameVariable].delta);
        }
    };

    var _Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        var variable = variables[variableId];
        if (variable) {
            value = value.clamp(variable.minValue, variable.maxValue);
            variable.delta = value - variable.value;
        }
        _Game_Variables_setValue.call(this, variableId, value);
    };
})();