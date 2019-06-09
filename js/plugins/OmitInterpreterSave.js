//=============================================================================
// OmitInterpreterSave.js
// MIT License (C) 2019 くらむぼん
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc Omit interpreter list from save data.
 * @author krmbn0576
 *
 * @help
 * Omit interpreter list from save data in order to reduce save size.
 */

/*:ja
 * @plugindesc イベントコマンドのリストをセーブデータに含めません。
 * @author くらむぼん
 *
 * @help
 * セーブサイズ削減のため、イベントコマンドのリストをセーブデータに含めません。
 */

(function() {
    Game_CommonEvent.prototype.update = function() {
        if (this._interpreter) {
            if (!this._interpreter.isRunning()) {
                this._interpreter.setup(
                    this.list(),
                    0,
                    -1,
                    this._commonEventId
                );
                if (this._interpreter.setEventInfo) {
                    this._interpreter.setEventInfo({
                        eventType: 'common_event',
                        commonEventId: this._commonEventId
                    });
                }
            }
            this._interpreter.update();
        }
    };

    Game_Event.prototype.pageIndex = function() {
        return this._pageIndex;
    };

    Game_Event.prototype.updateParallel = function() {
        if (this._interpreter) {
            if (!this._interpreter.isRunning()) {
                this._interpreter.setup(
                    this.list(),
                    this._eventId,
                    this._pageIndex
                );
                if (this._interpreter.setEventInfo) {
                    this._interpreter.setEventInfo(this.getEventInfo());
                }
            }
            this._interpreter.update();
        }
    };

    Game_Map.prototype.setupStartingMapEvent = function() {
        var events = this.events();
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            if (event.isStarting()) {
                event.clearStartingFlag();
                this._interpreter.setup(
                    event.list(),
                    event.eventId(),
                    event.pageIndex()
                );
                if (this._interpreter.setEventInfo) {
                    this._interpreter.setEventInfo(event.getEventInfo());
                }
                return true;
            }
        }
        return false;
    };

    Game_Map.prototype.setupAutorunCommonEvent = function() {
        for (var i = 0; i < $dataCommonEvents.length; i++) {
            var event = $dataCommonEvents[i];
            if (
                event &&
                event.trigger === 1 &&
                $gameSwitches.value(event.switchId)
            ) {
                this._interpreter.setup(event.list, 0, -1, i);
                if (this._interpreter.setEventInfo) {
                    this._interpreter.setEventInfo({
                        eventType: 'common_event',
                        commonEventId: i
                    });
                }
                return true;
            }
        }
        return false;
    };

    Game_Interpreter.prototype.command117 = function() {
        var commonEvent = $dataCommonEvents[this._params[0]];
        if (commonEvent) {
            var eventId = this.isOnCurrentMap() ? this._eventId : 0;
            this.setupChild(commonEvent.list, eventId, this._params[0]);
        }
        return true;
    };

    Game_Interpreter.prototype.setupChild = function(
        list,
        eventId,
        commonEventId
    ) {
        this._childInterpreter = new Game_Interpreter(this._depth + 1);
        this._childInterpreter.setup(list, eventId, -1, commonEventId);
        if (this._childInterpreter.setEventInfo) {
            this._childInterpreter.setEventInfo({
                eventType: 'common_event',
                commonEventId
            });
        }
    };

    Game_Interpreter.prototype.setup = function(
        list,
        eventId,
        pageIndex,
        commonEventId
    ) {
        this.clear();
        this._mapId = $gameMap.mapId();
        this._eventId = eventId || 0;
        this._pageIndex = pageIndex;
        this._commonEventId = commonEventId;
        this._list = list;
        Game_Interpreter.requestImages(list);
    };

    DataManager.loadGameWithoutRescue = async function(savefileId) {
        if (this.isThisGameFile(savefileId)) {
            var data = StorageManager.load(savefileId);
            var json = typeof data.then === 'function' ? await data : data;
            this.createGameObjects();
            this.extractSaveContents(JsonEx.parse(json));
            this._lastAccessedId = savefileId;
            if (
                $gameMap._mapId !== $gameMap._interpreter._mapId &&
                $gameMap._interpreter._pageIndex !== undefined
            ) {
                if (SceneManager.onNextFrame) {
                    DataManager.loadMapData($gameMap._interpreter._mapId);
                    while (!DataManager.isMapLoaded()) {
                        await SceneManager.onNextFrame();
                    }
                } else {
                    var xhr = new XMLHttpRequest();
                    var url = 'data/Map%1.json'.format($gameMap._interpreter._mapId.padZero(3));
                    xhr.open('GET', url, false);
                    xhr.overrideMimeType('application/json');
                    xhr.onload = function() {
                        if (xhr.status < 400) {
                            $dataMap = JSON.parse(xhr.responseText);
                            DataManager.onLoad($dataMap);
                        }
                    };
                    xhr.onerror = function() {
                        DataManager._errorUrl = DataManager._errorUrl || url;
                    };
                    $dataMap = null;
                    xhr.send();
                }
                $gameTemp._preloadList =
                    $dataMap.events[$gameMap._interpreter._eventId].pages[
                        $gameMap._interpreter._pageIndex
                    ].list;
            }
        } else {
            throw new Error('not this game file');
        }
    };

    Object.defineProperty(Game_Interpreter.prototype, '_list', {
        get() {
            if (!this.__listCache) {
                Object.defineProperty(this, '__listCache', {
                    value: null,
                    writable: true,
                    enumerable: false,
                    configurable: true
                });
                if (this._pageIndex !== undefined) {
                    if (this._mapId === $gameMap.mapId()) {
                        this.__listCache =
                            $dataMap.events[this._eventId].pages[
                                this._pageIndex
                            ].list;
                    } else {
                        this.__listCache = $gameTemp._preloadList;
                    }
                } else if (this._commonEventId !== undefined) {
                    this.__listCache =
                        $dataCommonEvents[this._commonEventId].list;
                }
            }
            return this.__listCache;
        },
        set(value) {
            Object.defineProperty(this, '__listCache', {
                value: null,
                writable: true,
                enumerable: false,
                configurable: true
            });
            if (value === null) {
                this._pageIndex = undefined;
                this._commonEventId = undefined;
            }
            this.__listCache = value;
        },
        enumerable: false,
        configurable: true
    });
})();
