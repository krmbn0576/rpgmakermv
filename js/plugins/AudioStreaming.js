//=============================================================================
// AudioStreaming.js
// MIT License (C) 2019 くらむぼん
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// 2019/06/02 ループタグの指定範囲が全長を超えた場合のループ処理を修正
//=============================================================================

/*:
 * @plugindesc Load audio faster and use only ogg files.
 * @author krmbn0576
 *
 * @param mode
 * @type select
 * @option Enable
 * @value 10
 * @option Enable, and measure performance
 * @value 11
 * @option Disable
 * @value 00
 * @option Disable, and measure performance
 * @value 01
 * @desc Sets whether audio streaming is enabled, and whether measure performance.
 * @default 10
 *
 * @param deleteM4a
 * @type boolean
 * @text Delete all m4a files
 * @desc Delete all m4a files the next time you playtest. Backup your files before execute.
 * @default false
 *
 * @help
 * Load audio faster by audio streaming whether on browsers or on standalones.
 * Use only ogg files to play the audio such as BGM and SE.
 * You need no longer to prepare m4a files.
 *
 * Usage:
 * Locate stbvorbis_stream.js, stbvorbis_stream_asm.js, and this plugin in plugins directory.
 * Turn ON Only this plugin, but DO NOT register the others to plugin manager.
 *
 *
 * License:
 * MIT License
 *
 * Library:
 * ogg decoder - stbvorbis.js (C) Hajime Hoshi, krmbn0576
 * https://github.com/hajimehoshi/stbvorbis.js
 */

/*:ja
 * @plugindesc 音声読み込みを高速化し、oggファイルのみを使用します。
 * @author くらむぼん
 *
 * @param mode
 * @type select
 * @option 有効
 * @value 10
 * @option 有効（読み込み速度を計測する）
 * @value 11
 * @option 無効
 * @value 00
 * @option 無効（読み込み速度を計測する）
 * @value 01
 * @text モード
 * @desc このプラグインを有効にするかどうか、読み込み速度を計測するかどうかを設定します。
 * @default 10
 *
 * @param deleteM4a
 * @type boolean
 * @text m4aファイルを消去
 * @desc 次にテストプレイを開始した時、すべてのm4aファイルを削除します。念の為バックアップを取った上でご活用ください。
 * @default false
 *
 * @help
 * 音声ストリーミングにより、音声読み込みを高速化します。
 * BGMや効果音などの音声ファイルにoggファイルのみを使用します。
 * 本プラグインを入れている場合、m4aファイルを用意しなくても音声を再生できます。
 *
 * 使い方：
 * pluginsフォルダに本プラグインとstbvorbis_stream.jsとstbvorbis_stream_asm.jsを配置してください。
 * ３つのうち本プラグイン「だけ」をプラグイン管理でONに設定してください。
 * 他の２つはOFFでも構いませんし、プラグイン管理に登録しなくても構いません。
 *
 *
 * ライセンス：
 * このプラグインを利用する時は、作者名をプラグインから削除しないでください。
 * それ以外の制限はありません。お好きなようにどうぞ。
 *
 * 使用ライブラリ：
 * oggデコーダー - stbvorbis.js (C) Hajime Hoshi, くらむぼん
 * https://github.com/hajimehoshi/stbvorbis.js
 */

if (function() {
    'use strict';
    const parameters = PluginManager.parameters('AudioStreaming');
    const enabled = parameters['mode'][0] === '1';
    const measured = parameters['mode'][1] === '1';
    const deleteM4a = parameters['deleteM4a'] === 'true';

    const isTest =
        location.search
            .slice(1)
            .split('&')
            .contains('test') ||
        (typeof window.nw !== 'undefined' &&
            nw.App.argv.length > 0 &&
            nw.App.argv[0].split('&').contains('test'));

    if (deleteM4a && isTest && Utils.isNwjs()) {
        const exec = require('child_process').exec;
        let messages, success, failure;
        if (navigator.language.contains('ja')) {
            messages = [
                'すべてのm4aファイルを削除しますか？',
                '本当に削除しますか？念のため、先にプロジェクトフォルダのバックアップをとっておくことをおすすめします。',
                'こうかいしませんね？'
            ];
            success = 'すべてのm4aファイルを削除しました。';
            failure = 'm4aファイルの削除中にエラーが発生しました。 ';
        } else {
            messages = [
                'Delete all m4a files?',
                'Are you sure?',
                'This cannot be undone. Are you really, REALLY sure?'
            ];
            success = 'All m4a files have been deleted.';
            failure = 'Error occured while deleting m4a files.';
        }
        if (messages.every(message => confirm(message))) {
            const command =
                process.platform === 'win32'
                    ? 'del /s *.m4a'
                    : 'find . -name "*.m4a" -delete';
            exec(command, error => alert(error ? failure : success));
        }
    }

    if (measured) {
        const div = document.createElement('div');
        div.style.backgroundColor = 'AliceBlue';
        div.style.position = 'fixed';
        div.style.left = 0;
        div.style.bottom = 0;
        document.body.appendChild(div);

        const updateInfo = info => {
            const decodeEndTime = Date.now();
            const content = `
                name: ${info.url.split('/').pop()}<br>
                mode: ${enabled ? 'streaming' : 'legacy'}<br>
                load time: ${info.loadEndTime - info.loadStartTime}ms<br>
                decode time: ${decodeEndTime - info.loadEndTime}ms<br>`;

            if (div.innerHTML !== content) div.innerHTML = content;
            div.style.zIndex = 11;
        };

        const _SceneManager_updateManagers = SceneManager.updateManagers;
        SceneManager.updateManagers = function() {
            const _WebAudio__load = WebAudio.prototype._load;
            WebAudio.prototype._load = function(url) {
                _WebAudio__load.apply(this, arguments);
                this._info = { url, loadStartTime: Date.now() };
                this.addLoadListener(() => updateInfo(this._info));
            };

            const _WebAudio__readLoopComments =
                WebAudio.prototype._readLoopComments;
            WebAudio.prototype._readLoopComments = function() {
                this._info.loadEndTime = this._info.loadEndTime || Date.now();
                _WebAudio__readLoopComments.apply(this, arguments);
            };

            SceneManager.updateManagers = _SceneManager_updateManagers;
            SceneManager.updateManagers.apply(this, arguments);
        };
    }

    return enabled;
}()) {

PluginManager.loadScript('stbvorbis_stream.js');

AudioManager.audioFileExt = function() {
    return '.ogg';
};

if (window.ResourceHandler) {
    ResourceHandler.fetchWithRetry = async function(
        method,
        url,
        _retryCount = 0
    ) {
        let retry;
        try {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (response.ok) {
                switch (method) {
                    case 'stream':
                        return response.body.getReader();
                    case 'arrayBuffer':
                    case 'blob':
                    case 'formData':
                    case 'json':
                    case 'text':
                        return await response[method]();
                    default:
                        return Promise.reject(new Error('method not allowed'));
                }
            } else if (response.status < 500) {
                // client error
                retry = false;
            } else {
                // server error
                retry = true;
            }
        } catch (error) {
            if (Utils.isNwjs()) {
                // local file error
                retry = false;
            } else {
                // network error
                retry = true;
            }
        }
        if (!retry) {
            const error = new Error('Failed to load: ' + url);
            SceneManager.catchException(error);
            throw error;
        } else if (_retryCount < this._defaultRetryInterval.length) {
            await new Promise(resolve =>
                setTimeout(resolve, this._defaultRetryInterval[_retryCount])
            );
            return this.fetchWithRetry(method, url, _retryCount + 1);
        } else {
            if (this._reloaders.length === 0) {
                Graphics.printLoadingError(url);
                SceneManager.stop();
            }
            return new Promise(resolve =>
                this._reloaders.push(() =>
                    resolve(this.fetchWithRetry(method, url, 0))
                )
            );
        }
    };
} else {
    window.ResourceHandler = {
        async fetchWithRetry(url) {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (response.ok) {
                return response.body.getReader();
            } else {
                throw new Error();
            }
        }
    };
}

WebAudio.prototype.clear = function() {
    this.stop();
    this._chunks = [];
    this._gainNode = null;
    this._pannerNode = null;
    this._totalTime = 0;
    this._sampleRate = 0;
    this._loopStart = 0;
    this._loopLength = 0;
    this._startTime = 0;
    this._volume = 1;
    this._pitch = 1;
    this._pan = 0;
    this._loadedTime = 0;
    this._offset = 0;
    this._loadListeners = [];
    this._stopListeners = [];
    this._hasError = false;
    this._autoPlay = false;
    this._isReady = false;
    this._isPlaying = false;
    this._loop = false;
};

WebAudio.prototype._load = async function(url) {
    if (WebAudio._context) {
        if (Decrypter.hasEncryptedAudio) {
            url = Decrypter.extToEncryptExt(url);
        }
        const reader = await ResourceHandler.fetchWithRetry('stream', url);
        this._loading(reader);
    }
};

WebAudio.prototype._loading = async function(reader) {
    try {
        const decode = stbvorbis.decodeStream(result => this._onDecode(result));
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                decode({ eof: true });
                return;
            }
            let array = value;
            if (Decrypter.hasEncryptedAudio) {
                try {
                    array = Decrypter.decryptArrayBuffer(array);
                } catch (error) {
                    array = Decrypter.decryptArrayBufferNoCheck(array);
                }
            }
            this._readLoopComments(new Uint8Array(array));
            decode({ data: array, eof: false });
        }
    } catch (error) {
        console.error(error);
        const autoPlay = this._autoPlay;
        const loop = this._loop;
        this.initialize(this._url);
        if (autoPlay) {
            this.play(loop, this.seek());
        }
    }
};

WebAudio.prototype._onDecode = function(result) {
    if (result.error) {
        console.error(result.error);
        return;
    }
    if (result.eof) {
        this._totalTime = this._loadedTime;
        if (this._loopLength === 0) {
            this._loopStart = 0;
            this._loopLength = this._totalTime;
            if (this._loop) {
                this._createSourceNodes();
            }
        } else if (this._totalTime < this._loopStart + this._loopLength) {
            this._loopLength = this._totalTime - this._loopStart;
            if (this._loop) {
                this._createSourceNodes();
            }
        }
        if (this._totalTime <= this.seek()) {
            this.stop();
        }
        return;
    }
    const channels = result.data.length;
    const buffer = WebAudio._context.createBuffer(
        result.data.length,
        result.data[0].length,
        result.sampleRate
    );
    for (let i = 0; i < channels; i++) {
        if (buffer.copyToChannel) {
            buffer.copyToChannel(result.data[i], i);
        } else {
            buffer.getChannelData(i).set(result.data[i]);
        }
    }
    const chunk = { buffer, sourceNode: null, when: this._loadedTime };
    this._chunks.push(chunk);
    this._loadedTime += buffer.duration;
    this._createSourceNode(chunk);
    if (!this._isReady && this._loadedTime >= this._offset) {
        this._isReady = true;
        this._onLoad();
    }
};

Object.defineProperty(WebAudio.prototype, 'pitch', {
    get: function() {
        return this._pitch;
    },
    set: function(value) {
        if (this._pitch !== value) {
            this._pitch = value;
            if (this.isPlaying()) {
                this.play(this._loop, 0);
            }
        }
    },
    configurable: true
});

WebAudio.prototype.isReady = function() {
    return this._isReady;
};

WebAudio.prototype.isPlaying = function() {
    return this._isPlaying;
};

WebAudio.prototype.play = function(loop, offset) {
    this._autoPlay = true;
    this._loop = loop;
    this._offset = offset || 0;
    if (this._loop && this._loopLength > 0) {
        while (this._offset >= this._loopStart + this._loopLength) {
            this._offset -= this._loopLength;
        }
    }
    if (this.isReady()) {
        this._startPlaying();
    }
};

WebAudio.prototype.stop = function() {
    const wasPlaying = this.isPlaying();
    this._isPlaying = false;
    this._autoPlay = false;
    this._removeNodes();
    if (this._stopListeners && wasPlaying) {
        this._stopListeners.forEach(listener => listener());
        this._stopListeners.length = 0;
    }
};

WebAudio.prototype.seek = function() {
    if (WebAudio._context && this.isPlaying()) {
        let pos =
            (WebAudio._context.currentTime - this._startTime) * this._pitch;
        if (this._loop && this._loopLength > 0) {
            while (pos >= this._loopStart + this._loopLength) {
                pos -= this._loopLength;
            }
        }
        return pos;
    } else {
        return 0;
    }
};

WebAudio.prototype._startPlaying = function() {
    this._isPlaying = true;
    this._startTime =
        WebAudio._context.currentTime - this._offset / this._pitch;
    this._removeNodes();
    this._createNodes();
    this._connectNodes();
    this._createSourceNodes();
};

WebAudio.prototype._calcSourceNodeParams = function(chunk) {
    const currentTime = WebAudio._context.currentTime;
    const chunkEnd = chunk.when + chunk.buffer.duration;
    const pos = this.seek();
    let when, offset, duration;
    if (this._loop && this._loopLength) {
        const loopEnd = this._loopStart + this._loopLength;
        if (pos <= chunk.when) {
            when = currentTime + (chunk.when - pos) / this._pitch;
        } else if (pos <= chunkEnd) {
            when = currentTime;
            offset = pos - chunk.when;
        } else if (this._loopStart <= pos) {
            when =
                currentTime +
                (chunk.when - pos + this._loopLength) / this._pitch;
        } else {
            return;
        }
        if (this._loopStart <= pos && chunk.when < this._loopStart) {
            if (!offset) {
                when += (this._loopStart - chunk.when) / this._pitch;
                offset = this._loopStart - chunk.when;
            }
            if (chunk.buffer.duration <= offset) {
                return;
            }
        }
        if (loopEnd < chunkEnd) {
            if (!offset) {
                offset = 0;
            }
            duration = loopEnd - chunk.when - offset;
            if (duration <= 0) {
                return;
            }
        }
    } else {
        if (pos <= chunk.when) {
            when = currentTime + (chunk.when - pos) / this._pitch;
        } else if (pos <= chunkEnd) {
            when = currentTime;
            offset = pos - chunk.when;
        } else {
            return;
        }
    }
    return { when, offset, duration };
};

WebAudio.prototype._createSourceNode = function(chunk) {
    if (!this.isPlaying() || !chunk) {
        return;
    }
    if (chunk.sourceNode) {
        chunk.sourceNode.onended = null;
        chunk.sourceNode.stop();
        chunk.sourceNode = null;
    }
    const params = this._calcSourceNodeParams(chunk);
    if (!params) {
        if (!this._reservedSeName) {
            this._chunks[this._chunks.indexOf(chunk)] = null;
        }
        return;
    }
    const { when, offset, duration } = params;
    const context = WebAudio._context;
    const sourceNode = context.createBufferSource();
    sourceNode.onended = _ => {
        this._createSourceNode(chunk);
        if (this._totalTime && this._totalTime <= this.seek()) {
            this.stop();
        }
    };
    sourceNode.buffer = chunk.buffer;
    sourceNode.playbackRate.setValueAtTime(this._pitch, context.currentTime);
    sourceNode.connect(this._gainNode);
    sourceNode.start(when, offset, duration);
    chunk.sourceNode = sourceNode;
};

WebAudio.prototype._createSourceNodes = function() {
    this._chunks.forEach(chunk => this._createSourceNode(chunk));
};

WebAudio.prototype._createNodes = function() {
    const context = WebAudio._context;
    this._gainNode = context.createGain();
    this._gainNode.gain.setValueAtTime(this._volume, context.currentTime);
    this._pannerNode = context.createPanner();
    this._pannerNode.panningModel = 'equalpower';
    this._updatePanner();
};

WebAudio.prototype._connectNodes = function() {
    this._gainNode.connect(this._pannerNode);
    this._pannerNode.connect(WebAudio._masterGainNode);
};

WebAudio.prototype._removeNodes = function() {
    if (this._chunks) {
        this._chunks
            .filter(chunk => chunk && chunk.sourceNode)
            .forEach(chunk => {
                chunk.sourceNode.onended = null;
                chunk.sourceNode.stop();
                chunk.sourceNode = null;
            });
    }
    this._gainNode = null;
    this._pannerNode = null;
};

WebAudio.prototype._onLoad = function() {
    if (this._autoPlay) {
        this.play(this._loop, this._offset);
    }
    this._loadListeners.forEach(listener => listener());
    this._loadListeners.length = 0;
};

WebAudio.prototype._readLoopComments = function(array) {
    if (this._sampleRate === 0) {
        this._readOgg(array);
        if (this._loopLength > 0 && this._sampleRate > 0) {
            this._loopStart /= this._sampleRate;
            this._loopLength /= this._sampleRate;
        }
    }
};

Decrypter.decryptArrayBuffer = function(arrayBuffer) {
    if (!arrayBuffer) return null;
    var header = new Uint8Array(arrayBuffer, 0, this._headerlength);

    var i;
    var ref = this.SIGNATURE + this.VER + this.REMAIN;
    var refBytes = new Uint8Array(16);
    for (i = 0; i < this._headerlength; i++) {
        refBytes[i] = parseInt('0x' + ref.substr(i * 2, 2), 16);
    }
    for (i = 0; i < this._headerlength; i++) {
        if (header[i] !== refBytes[i]) {
            throw new Error('Header is wrong');
        }
    }

    arrayBuffer = this.cutArrayHeader(arrayBuffer, Decrypter._headerlength);
    return this.decryptArrayBufferNoCheck(arrayBuffer);
};

Decrypter.decryptArrayBufferNoCheck = function(arrayBuffer) {
    var view = new DataView(arrayBuffer);
    this.readEncryptionkey();
    if (arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer);
        for (var i = 0; i < this._headerlength; i++) {
            byteArray[i] =
                byteArray[i] ^ parseInt(Decrypter._encryptionKey[i], 16);
            view.setUint8(i, byteArray[i]);
        }
    }

    return arrayBuffer;
};
}
