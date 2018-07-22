//=============================================================================
// OggOnly.js
// PUBLIC DOMAIN
//=============================================================================

/*:
 * @plugindesc 音声ファイルの再生にoggファイルのみを使用します。
 * @author くらむぼん
 *
 * @param deleteM4a
 * @type boolean
 * @text m4aファイルを消去
 * @desc 次にテストプレイを開始した時、すべてのm4aファイルを削除します。念の為バックアップを取った上でご活用ください。
 * @default false
 *
 * @help
 * BGMや効果音などの音声ファイルにoggファイルのみを使用します。
 * 本プラグインを入れている場合、m4aファイルを用意しなくても音声を再生できます。
 * 
 * 使い方：
 * pluginsフォルダに本プラグインとstbvorbis.jsとstbvorbis_asm.jsを配置してください。
 * ３つのうち本プラグイン「だけ」をプラグイン管理でONに設定してください。
 * 他の２つはOFFでも構いませんし、プラグイン管理に登録しなくても構いません。
 * 
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 * 
 * 謝辞：
 * このプラグインはoggデコーダーとしてstbvorbis.jsを使用しています。
 * (https://github.com/hajimehoshi/stbvorbis.js)
 * ありがとうございます！みんなどんどん使ってね！！
 */

(function() {
    'use strict';
    var parameters = PluginManager.parameters('OggOnly');
    var deleteM4a = parameters['deleteM4a'] === 'true';

    // ただただ互換性回復のため再定義。
    Utils.isOptionValid = function(name) {
        if (location.search.slice(1).split('&').contains(name)) return true;
        return typeof nw !== "undefined" && nw.App.argv.length > 0 && nw.App.argv[0].split('&').contains(name);
    };

    if (deleteM4a && Utils.isOptionValid('test') && Utils.isNwjs()) {
        var exec = require('child_process').exec;
        if (confirm('すべてのm4aファイルを削除しますか？') &&
            confirm('本当に削除しますか？念のため、先にプロジェクトフォルダのバックアップをとっておくことをおすすめします。') &&
            confirm('こうかいしませんね？')) {
            if (process.platform === 'win32') {
                exec('del /s *.m4a');
            } else {
                exec('find . -name "*.m4a" -delete');
            }
            alert('すべてのm4aファイルを削除しました。');
        }
    }

    PluginManager.loadScript('stbvorbis.js');

    AudioManager.audioFileExt = function() {
        return '.ogg';
    };

    if (!WebAudio.canPlayOgg()) {
        WebAudio._context.decodeAudioData = function(arrayBuffer, callback, errorback) {
            return stbvorbis.decode(arrayBuffer).then(function(result) {
                var channels = result.data.length;
                var buffer = this.createBuffer(result.data.length, result.data[0].length, result.sampleRate);
                for (var i = 0; i < channels; i++) {
                  if (buffer.copyToChannel) {
                    buffer.copyToChannel(result.data[i], i);
                  } else {
                    buffer.getChannelData(i).set(result.data[i]);
                  }
                }
                if (callback) {
                    callback(buffer);
                }
            }.bind(this), errorback);
        };
    }
})();