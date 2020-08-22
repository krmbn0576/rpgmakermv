//=============================================================================
// ServerTime.js
// MIT License (C) 2019 くらむぼん
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @target MZ
 * @plugindesc サーバータイムを取得します。
 * @author くらむぼん
 *
 * @help
 * ゲームで現在時刻を取得するとき、プレイヤーのPCやスマホの時計が
 * ズレていると、不正確な時刻を取得してしまうことがあります。
 * もしあなたのゲームがブラウザ版として公開されるなら、
 * サーバーの時刻（サーバータイム）を取得するのが確実です。
 * このプラグインでは、サーバータイムを取得できます。
 * 
 * 
 * 使い方：
 * イベントコマンド「変数の操作」からオペランド「スクリプト」を選び、
 * 記述欄にgetServerTime()と書きます。以下のようになればOKです。
 * 　◆変数の操作：#0001 変数名 = getServerTime()
 * これで、変数1番にサーバータイムを代入できます。
 * 
 * 
 * 備考：
 * ・スクリプトやプラグインを書ける方は、もちろん
 * 　var t = getServerTime()などの書き方でサーバータイムを取得できます。
 * 
 * ・サーバータイムの値は、Date.now()でPCやスマホの時間を取るのと同様で
 * 　「1970年1月1日から何ミリ秒経過したか」が整数として代入されます。
 * 
 * ・サーバータイムを取得するためには、ゲームがブラウザ版（RPGアツマールや
 * 　Plicyなどへの投稿を含む）として公開されている必要があります。
 * 
 * ・ブラウザ版ではない場合（テストプレイ中やダウンロード版など）は、
 * 　サーバータイムは取れないので代わりにPCやスマホの時間を取得します。
 * 
 * 
 * スクリプトの解説：
 * まず、ゲーム起動時にサーバーと通信し、サーバータイムを取得します。
 * あとはgetServerTime()が呼ばれるたびに、
 * 「ゲーム起動時のサーバータイム＋performance.now()」を返すだけです。
 * performance.nowは起動時からの経過時間を正確に返すと決まっており、
 * 途中でPCやスマホの時間をいじっても影響を受けないことも保証されています。
 * 
 * 
 * ライセンス：
 * このプラグインを利用する時は、作者名をプラグインから削除しないでください。
 * それ以外の制限はありません。お好きなようにどうぞ。
 */

var getServerTime = (function() {
    'use strict';
    var startServerTime;
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', location.href + '?' + Date.now(), false);
    try {
        xhr.send();
        startServerTime = new Date(xhr.getResponseHeader('Date') || Date.now()).getTime();
    } catch (error) {
        startServerTime = Date.now();
    }
    startServerTime -= performance.now();
    return function() {
        return startServerTime + performance.now();
    };
})();