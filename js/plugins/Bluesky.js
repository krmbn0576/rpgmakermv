//=============================================================================
// Bluesky.js
// PUBLIC DOMAIN
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Bluesky(AT Protocol)投稿の通知バー風表示プラグイン
 * @author くらむぼん
 * @help
 * Bluesky(AT Protocol)上で指定のフィードに投稿された場合に、
 * 投稿内容を昔のニコ生広告バーっぽいデザインでゲーム画面に通知します。
 * 
 * プラグインコマンド：
 * １種類のフィードを常に表示するだけならば、
 * プラグインコマンドなしでプラグインパラメータを設定するだけで十分です。
 * 途中で一時停止したり、途中からフィードを変える場合は、以下のプラグインコマンドを用います。
 * MVでは「SNSバー開始」「SNSバー停止」「SNSバーフィード変更 <feedUrl>」の３種。
 * MZにも同様の３種のコマンドがあります。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 * （Ruたんさんの「ニコニ広告通知バー風表示プラグイン」を下敷きに作らせていただきました。ありがとうございます！）
 *
 * @param base
 * @text ■ 基本設定
 * 
 * @param baseFeed
 * @text フィードURL
 * @desc 表示対象とするBluesky(AT Protocol)のフィードURL。https://bsky.app/またはat://で始まる形で指定
 * @type string
 * @parent base
 * @default https://bsky.app/profile/bsky.app/feed/whats-hot
 *
 * @param baseTitle
 * @text タイトル
 * @desc タイトル部分に表示する文字列
 * @type string
 * @parent base
 * @default Bluesky
 *
 * @param baseBackgroundColor
 * @text 背景色
 * @desc 背景の色
 * （※CSSと同様の指定方法です）
 * @type string
 * @parent base
 * @default rgba(255, 229, 0, .8)
 *
 * @param baseTextColor
 * @text 文字色
 * @desc 文字の色
 * （※CSSと同様の指定方法です）
 * @type string
 * @parent base
 * @default #000000
 *
 * @param baseFontFamily
 * @text フォント
 * @desc 文字のフォント
 * （※CSSと同様の指定方法です）
 * @type string
 * @parent base
 * @default sans-serif
 *
 * @param baseScrollSpeed
 * @text 流れる速度
 * @desc 文字が流れる速度を指定します
 * （1秒間に何px分文字を流すか）
 * @type number
 * @parent base
 * @default 100
 *
 * @param baseScrollTimeMax
 * @text 最大表示時間
 * @desc 文字が流れる時間の最大時間を指定します。
 * この時間以上になる場合は流す速度を加速します。
 * @type number
 * @parent base
 * @default 10
 *
 * @param baseShowAuthor
 * @text 投稿者名表示
 * @desc メッセージの冒頭に投稿者名を表示するか？
 * @type boolean
 * @parent base
 * @ON 表示する
 * @OFF 表示しない
 * @default true
 *
 * @param advanced
 * @text ■ 上級者設定
 * 
 * @param advancedApiBaseUrl
 * @text APIベースURL
 * @desc 表示対象とするAT ProtocolサービスのAPIサーバーをオリジンで指定。よくわからなければそのままで。
 * @type string
 * @parent advanced
 * @default https://public.api.bsky.app
 *
 * @param advancedAutoStart
 * @text 自動開始
 * @desc ゲーム開始と同時に表示を始めるか？
 * @type boolean
 * @parent advanced
 * @ON 始める
 * @OFF 始めない
 * @default true
 *
 * @param advancedExpiration
 * @text 対象時間
 * @desc 何秒前の投稿までを対象にするか？
 * @type number
 * @parent advanced
 * @default 604800
 *
 * @param advancedFetchInterval
 * @text 自動取得間隔
 * @desc 投稿の自動取得の間隔（分）
 * 0の場合は再取得しません
 * @type number
 * @parent advanced
 * @default 5
 *
 * @command start
 * @text 投稿の取得開始
 * @desc 投稿の取得を開始します。
 * 取得した場合自動的にバーを表示します。
 *
 * @command stop
 * @text 投稿の取得停止
 * @desc 投稿の取得を停止します。
 * 停止中はバーが表示されません。
 *
 * @command changeFeed
 * @text フィードURL変更
 * @desc 表示対象とするBluesky(AT Protocol)のフィードURLを変更します。
 * https://bsky.app/またはat://で始まる形で指定
 * 
 * @arg feed
 * @text フィードURL
 * @type string
 * @default https://bsky.app/profile/bsky.app/feed/whats-hot
 */

(function () {
    'use strict';

    const Bluesky = {};

    function getPluginName() {
        const cs = document.currentScript;
        return cs ? cs.src.split('/').pop().replace(/\.js$/, '') : 'Bluesky';
    }

    function pickBooleanValueFromParameter(parameter, key, defaultValue = 'false') {
        return `${parameter[key] || defaultValue}` === 'true';
    }

    function pickStringValueFromParameter(parameter, key, defaultValue = '') {
        if (!parameter.hasOwnProperty(key)) return defaultValue;
        return `${parameter[key] || ''}`;
    }

    function pickNumberValueFromParameter(parameter, key, defaultValue = 0) {
        if (!parameter.hasOwnProperty(key) || parameter[key] === '') return defaultValue;
        return parseFloat(parameter[key]);
    }

    function readParameter() {
        const parameter = PluginManager.parameters(getPluginName());
        return {
            baseFeed: pickStringValueFromParameter(parameter, 'baseFeed', 'https://bsky.app/profile/bsky.app/feed/whats-hot'),
            baseTitle: pickStringValueFromParameter(parameter, 'baseTitle', 'Bluesky'),
            baseBackgroundColor: pickStringValueFromParameter(
                parameter,
                'baseBackgroundColor',
                'rgba(255, 229, 0, .8)'
            ),
            baseTextColor: pickStringValueFromParameter(parameter, 'baseTextColor', '#000000'),
            baseFontFamily: pickStringValueFromParameter(parameter, 'baseFontFamily', 'sans-serif'),
            baseScrollSpeed: pickNumberValueFromParameter(parameter, 'baseScrollSpeed', 100),
            baseScrollTimeMax: pickNumberValueFromParameter(parameter, 'baseScrollTimeMax', 10),
            baseShowAuthor: pickBooleanValueFromParameter(parameter, 'baseShowAuthor', true),
            advancedApiBaseUrl: pickStringValueFromParameter(parameter, 'advancedApiBaseUrl', 'https://public.api.bsky.app'),
            advancedAutoStart: pickBooleanValueFromParameter(parameter, 'advancedAutoStart', true),
            advancedExpiration: pickNumberValueFromParameter(parameter, 'advancedExpiration', 604800),
            advancedFetchInterval: pickNumberValueFromParameter(parameter, 'advancedFetchInterval', 5),
        };
    }

    function isThenable(obj) {
        return obj && typeof obj['then'] === 'function';
    }

    class Timer {
        constructor(callback, interval) {
            this._time = null;
            this._callback = callback;
            this._interval = interval;
        }

        start() {
            this._time = setTimeout(this._call.bind(this), 1000);
        }

        stop() {
            if (this._time) clearTimeout(this._time);
            this._time = null;
        }

        _call() {
            this.stop();

            const result = this._callback();

            if (isThenable(result)) {
                result.then(() => this._reserveNextCall());
                if (result.catch) {
                    result.catch(() => this._reserveNextCall());
                }
            } else {
                this._reserveNextCall();
            }
        }

        _reserveNextCall() {
            if (this._interval < 1) return;
            this._time = setTimeout(this._call.bind(this), this._interval);
        }
    }

    /**
     * Bluesky / AT Protocol APIのクライアント
     */
    class ATProtoApiClient {
        /**
         * 初期化
         * @param {{expiration: number, apiBaseUrl: string, feed: string}} options
         */
        constructor(options = {}) {
            this._timeOrigin = new Date().setSeconds(new Date().getSeconds() - options.expiration);
            this._lastStartedTimeMap = {};
            this._url = new URL(options.apiBaseUrl);
            this._url.pathname = '/xrpc/app.bsky.feed.getFeed';
            this.feed = options.feed;
        }

        calcATUriFromUrl() {
            let bskyMatch;
            if (this.feed.indexOf('at://') === 0) {
                this._url.searchParams.set('feed', this.feed);
            } else if (bskyMatch = this.feed.match(/^https:\/\/bsky.app\/profile\/(.+)\/feed\/(.+)$/)) {
                const handleOrDid = bskyMatch[1];
                const id = bskyMatch[2];
                if (handleOrDid.indexOf('did:') === 0) {
                    this._url.searchParams.set('feed', `at://${handleOrDid}/app.bsky.feed.generator/${id}`);
                } else {
                    this._url.searchParams.delete('feed');
                    const resolveHandle = new URL(this._url.origin);
                    resolveHandle.pathname = '/xrpc/com.atproto.identity.resolveHandle';
                    resolveHandle.searchParams.set('handle', handleOrDid);
                    return fetch(resolveHandle).then(r => r.json()).then(
                        resp => this._url.searchParams.set('feed', `at://${resp.did}/app.bsky.feed.generator/${id}`)
                    );
                }
            }
            return Promise.resolve();
        }

        /**
         * 投稿履歴を取得
         * @returns {Promise<[*]>}
         */
        fetchNewHistories() {
            return this.calcATUriFromUrl().then(_ => {
                const feed = this._url.searchParams.get('feed');
                const lastStartedTime = this._lastStartedTimeMap[feed] || this._timeOrigin;
                return fetch(this._url).then(r => r.json()).then(resp => {
                    if (resp.error) {
                        throw new Error('取得エラーです。フィードURLが適切か確認してください');
                    }

                    const newItems = resp.feed
                        .map(feed => feed.post)
                        .filter(post => post.record.text !== '' && new Date(post.indexedAt) > lastStartedTime);

                    this._lastStartedTimeMap[feed] = new Date();

                    return newItems;
                });
            });
        }
    }

    class ViewBuilder {
        /**
         * 初期化
         * @param {{title: string, backgroundColor: string, textColor: string, fontFamily: string, scrollSpeed: number, scrollTimeMax: number}} options
         */
        constructor(options = {}) {
            this._isShow = false;
            this._title = options.title;
            this._fontFamily = options.fontFamily || 'sans-serif';
            this._backgroundColor = options.backgroundColor;
            this._textColor = options.textColor;
            this._scrollSpeed = options.scrollSpeed || 0;
            this._scrollTimeMax = options.scrollTimeMax || 0;
            this._messages = [];
        }

        /**
         * 一番外側のHTML要素
         * @returns {HTMLDivElement}
         */
        get element() {
            return this._element;
        }

        /**
         * HTML要素の生成
         */
        createElement() {
            this._element = this._createLayerElement();
            document.body.appendChild(this._element);

            this._barElement = this._createBarElement();
            this._element.appendChild(this._barElement);
            this._titleElement = this._createTitleElement();
            this._barElement.appendChild(this._titleElement);
            this._messageElement = this._createMessageElement();
            this._barElement.appendChild(this._messageElement);
            this._messageTextElement = this._createMessageTextElement();
            this._messageElement.appendChild(this._messageTextElement);

            this.resetStyle();
            this.updateElement();
        }

        _createLayerElement() {
            const element = document.createElement('div');
            element.id = 'nicoko-layer';
            element.classList.add('nicoko-layer');
            element.style.position = 'absolute';
            element.style.top = '0';
            element.style.left = '0';
            element.style.right = '0';
            element.style.bottom = '0';
            element.style.margin = 'auto';
            element.style.zIndex = '10';
            element.style.overflow = 'hidden';
            element.style.pointerEvents = 'none';
            element.style.fontFamily = this._fontFamily;
            return element;
        }

        _createBarElement() {
            const element = document.createElement('div');
            element.classList.add('nicoko-bar');
            element.style.position = 'absolute';
            element.style.left = '0';
            element.style.width = '100%';
            element.style.height = '2em';
            element.style.overflow = 'hidden';
            element.style.background = this._backgroundColor;
            element.style.color = this._textColor;
            element.style.opacity = '0';
            element.style.transition = 'all ease-in-out .5s';
            return element;
        }

        _createTitleElement() {
            const element = document.createElement('div');
            element.classList.add('nicoko-title');
            element.style.position = 'absolute';
            element.style.top = '0';
            element.style.lineHeight = `${2 / 0.8}em`;
            element.style.padding = '0 10px';
            element.style.fontSize = '0.8em';
            element.style.fontWeight = 'bold';
            element.style.transition = 'left ease-in-out .5s 1s, transform ease-in-out .5s 1s';
            element.innerText = this._title;
            return element;
        }

        _createMessageElement() {
            const element = document.createElement('div');
            element.classList.add('nicoko-message');
            element.style.position = 'absolute';
            element.style.top = '0';
            element.style.right = '0';
            element.style.height = '2em';
            element.style.overflow = 'hidden';
            return element;
        }

        _createMessageTextElement() {
            const element = document.createElement('div');
            element.classList.add('nicoko-message-text');
            element.style.whiteSpace = 'nowrap';
            element.style.position = 'absolute';
            element.style.top = '0';
            element.style.lineHeight = `${2 / 0.8}em`;
            element.style.fontSize = '0.8em';
            element.style.padding = '0 10px';
            element.addEventListener('transitionend', this._onTextTransitionEnd.bind(this));
            return element;
        }

        /**
         * アニメーション開始前の位置に戻す
         */
        resetStyle() {
            this._isShow = false;
            this._messages.length = 0;

            this._barElement.style.bottom = '-2em';
            this._barElement.style.opacity = '0';

            this._titleElement.style.left = '50%';
            this._titleElement.style.transform = 'translateX(-50%)';

            this._messageElement.style.width = '0';

            this._messageTextElement.style.transition = 'initial';
            this._messageTextElement.style.left = '100%';
            this._messageTextElement.style.transform = 'translateX(0%)';
        }

        /**
         * 画面サイズに表示を合わせる
         */
        updateElement() {
            this._element.width = Graphics._width;
            this._element.height = Graphics._height;
            const size = Math.min(Math.max(Math.floor(20 * Graphics._realScale), 10), 20);
            this._element.style.fontSize = `${size}px`;
            Graphics._centerElement(this._element);
        }

        /**
         * メッセージ表示の開始
         * @param message
         */
        showMessage(message) {
            this._isShow = true;

            this._barElement.style.bottom = '0';
            this._barElement.style.opacity = '1';

            this._titleElement.style.left = '0';
            this._titleElement.style.transform = 'translateX(0)';

            const rect = this._titleElement.getBoundingClientRect();
            this._messageElement.style.width = `calc(100% - ${rect.width}px)`;

            this._messageTextElement.textContent = message;
            this._messageTextElement.style.visibility = 'hidden';
            this._messageTextElement.style.opacity = '0';

            const scrollTime = Math.min(this._messageTextElement.clientWidth / this._scrollSpeed, this._scrollTimeMax);

            setTimeout(() => {
                this._messageTextElement.style.visibility = 'visible';
                this._messageTextElement.style.opacity = '1';
                this._messageTextElement.style.left = '0';
                this._messageTextElement.style.transform = 'translateX(-100%)';
                this._messageTextElement.style.transition = `opacity ease-in-out .5s, transform linear ${scrollTime}s 2s`;
            }, 1000);
        }

        addMessages(messages) {
            this._messages = this._messages.concat(messages);
            if (this._messages.length > 0 && !this._isShow) {
                this.showMessage(this._messages.shift());
            }
        }

        _onTextTransitionEnd(event) {
            if (event.propertyName === 'transform') {
                if (this._messages.length > 0) {
                    this._messageTextElement.style.transition = 'initial';
                    this._messageTextElement.style.left = '100%';
                    this._messageTextElement.style.transform = 'translateX(0%)';
                    this.showMessage(this._messages.shift());
                } else {
                    this.resetStyle();
                }
            }
        }
    }

    Bluesky.name = getPluginName();
    Bluesky.parameter = readParameter();

    Bluesky.client = new ATProtoApiClient({
        expiration: Bluesky.parameter.advancedExpiration,
        apiBaseUrl: Bluesky.parameter.advancedApiBaseUrl,
        feed: Bluesky.parameter.baseFeed,
    });

    Bluesky.viewBuilder = new ViewBuilder({
        title: Bluesky.parameter.baseTitle,
        backgroundColor: Bluesky.parameter.baseBackgroundColor,
        textColor: Bluesky.parameter.baseTextColor,
        fontFamily: Bluesky.parameter.baseFontFamily,
        scrollSpeed: Bluesky.parameter.baseScrollSpeed,
        scrollTimeMax: Bluesky.parameter.baseScrollTimeMax,
    });

    Bluesky.timer = new Timer(() => Bluesky.client.fetchNewHistories().then(histories => {
        if (Bluesky.parameter.baseShowAuthor) {
            histories = histories.map(post => `${post.author.displayName}：${post.record.text}`);
        } else {
            histories = histories.map(post => post.record.text);
        }
        Bluesky.viewBuilder.addMessages(histories);
    }).catch(console.error), Bluesky.parameter.advancedFetchInterval * 60 * 1000);

    // -------------------------------------------------------------------------
    // hook

    (() => {
        const upstream_Graphics_createAllElements = Graphics._createAllElements;
        Graphics._createAllElements = function () {
            upstream_Graphics_createAllElements.apply(this);
            Bluesky.viewBuilder.createElement();
        };

        const upstream_Graphics_updateAllElements = Graphics._updateAllElements;
        Graphics._updateAllElements = function () {
            upstream_Graphics_updateAllElements.apply(this);
            Bluesky.viewBuilder.updateElement();
        };

        if (Bluesky.parameter.advancedAutoStart) {
            const upstream_Scene_Boot_start = Scene_Boot.prototype.start;
            Scene_Boot.prototype.start = function () {
                upstream_Scene_Boot_start.apply(this);

                Bluesky.timer.start();
            };
        }
    })();

    // -------------------------------------------------------------------------
    // MVプラグインコマンド

    (() => {
        const upstream_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
        Game_Interpreter.prototype.pluginCommand = function (command, args) {
            switch (command) {
                case 'SNSバー開始':
                    Bluesky.timer.start();
                    return;
                case 'SNSバー停止':
                    Bluesky.timer.stop();
                    Bluesky.viewBuilder.resetStyle();
                    return;
                case 'SNSバーフィード変更':
                    Bluesky.client.feed = args[0];
                    return;
            }
            upstream_Game_Interpreter_pluginCommand.apply(this, arguments);
        };
    })();

    // -------------------------------------------------------------------------
    // MZプラグインコマンド

    function commandStart() {
        Bluesky.timer.start();
    }

    function commandStop() {
        Bluesky.timer.stop();
        Bluesky.viewBuilder.resetStyle();
    }

    function commandChangeFeed(args) {
        Bluesky.client.feed = args.feed;
    }

    PluginManager.registerCommand(Bluesky.name, 'start', commandStart);
    PluginManager.registerCommand(Bluesky.name, 'stop', commandStop);
    PluginManager.registerCommand(Bluesky.name, 'changeFeed', commandChangeFeed);
})();
