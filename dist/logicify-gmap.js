(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module unless amdModuleId is set
        define(["google", "angular"], function (a0, b1) {
            return (factory(a0, b1));
        });
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require("google"), require("angular"));
    } else {
        factory(google, angular);
    }
}(this, function (google, angular) {

/**
 * Created by artem on 5/28/15.
 */
(function (angular) {
    'use strict';
    angular.module('LogicifyGMap', []);
})(angular);
/**
 * Created by artem on 10/12/15.
 */
(function (angular) {
    'use strict';
    angular.module('LogicifyGMap')
        .service('SmartCollection', [function () {
            /**
             * Service is a singleton, so we can use global variable to generate uid!
             */
            var uid = 0;

            function SmartCollection(arr) {
                var self = this;
                //private property
                //init before overriding
                if (Array.isArray(arr)) {
                    arr.forEach(function (item, index) {
                        self.push(item);
                    });
                }
                self._uid = uid++;
                var addCB = [], removeCB = [];
                /**
                 * Override all methods that are changing an array!
                 */
                var push = self.push;
                self['push'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = push.apply(self, args);
                    args.forEach(function (item) {
                        addCB.forEach(function (callback) {
                            callback.apply(self, [item]);
                        });
                    });
                    return result;
                };
                var pop = self.pop;
                self['pop'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = pop.apply(self, args);
                    removeCB.forEach(function (callback) {
                        callback.apply(self, [result]);
                    });
                    return result;
                };
                var unshift = self.unshift;
                self['unshift'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = unshift.apply(self, args);
                    args.forEach(function (item) {
                        addCB.forEach(function (callback) {
                            callback.apply(self, [item]);
                        });
                    });

                    return result;
                };
                var shift = self.shift;
                self['shift'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = unshift.apply(self, args);
                    removeCB.forEach(function (callback) {
                        callback.apply(self, [result]);
                    });
                    return result;
                };
                var splice = self.splice;
                self['splice'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = splice.apply(self, args);
                    result.forEach(function (item) {
                        removeCB.forEach(function (callback) {
                            callback.apply(self, [item]);
                        });
                    });

                    return result;
                };
                /**
                 * The same as "splice", but does not call onRemove callback
                 * @return {Array}
                 */
                self['removeQuietly'] = splice;
                self['onRemoveItem'] = function (cb) {
                    if (typeof cb === 'function') {
                        removeCB.push(cb);
                    }
                };
                self['onAddItem'] = function (cb) {
                    if (typeof cb === 'function') {
                        addCB.push(cb);
                    }
                };
            }

            SmartCollection.prototype = Object.create(Array.prototype);
            SmartCollection.prototype.constructor = SmartCollection;
            return SmartCollection;
        }]);
})(angular);
/**
 * Created by artem on 6/24/15.
 */
(function (google, angular) {
    'use strict';
    /**
     * Note that if you want custom X button for info window you need to add css
     * .gm-style-iw+div{ display:none }
     * where .gm-style-iw is a class of container element, and next div is close button
     */
    angular.module('LogicifyGMap')
        .directive('logicifyGmapControl',
        [
            '$compile',
            '$log',
            '$timeout',
            function ($compile, $log, $timeout) {
                return {
                    restrict: 'E',
                    require: '^logicifyGmap',
                    link: function (scope, iElement, iAttrs, ctrl) {
                        /*global google*/
                        var position = scope.$eval(iAttrs['controlPosition']);
                        var index = scope.$eval(iAttrs['controlIndex']);
                        var events = scope.$eval(iAttrs['events']);
                        var element = angular.element(iElement.html().trim());
                        var listeners = [];
                        $compile(element)(scope);
                        $timeout(function () {
                            scope.$apply();
                        });
                        scope.$on('$destroy', function () {
                            listeners.forEach(function (listener) {
                                if (google && google.maps) {
                                    google.maps.event.removeListener(listener);
                                }
                            });
                        });
                        function attachListener(eventName, callback) {
                            return google.maps.event.addDomListener(element[0], eventName, function () {
                                var args = arguments;
                                var self = this;
                                //wrap in timeout to run new digest
                                $timeout(function () {
                                    callback.apply(self, args);
                                });
                            });
                        }

                        element[0].index = index || 0;
                        iElement.html('');
                        var map = ctrl.getMap();
                        if (!map.controls[position]) {
                            throw new Error('Position of control on the map is invalid. Please see google maps spec.');
                        }
                        map.controls[position].push(element[0]);
                        if (events != null) {
                            angular.forEach(events, function (value, key) {
                                if (typeof value === 'function') {
                                    listeners.push(attachListener(key, value));
                                }
                            });
                        }
                    }
                }
            }
        ]);
})(google, angular);

/**
 * Created by artem on 5/28/15.
 */
(function (google, angular) {
    'use strict';
    /**
     * Note that if you want custom X button for info window you need to add css
     * .gm-style-iw+div{ display:none }
     * where .gm-style-iw is a class of container element, and next div is close button
     */
    angular.module('LogicifyGMap')
        .directive('logicifyGmap',
        [
            '$compile',
            '$log',
            '$timeout',
            function ($compile, $log, $timeout) {
                return {
                    restrict: 'E',
                    scope: {
                        gmOptions: '&gmOptions',
                        gmReady: '&gmReady',
                        cssOptions: '&cssOptions'
                    },
                    controller: function ($scope, $element, $attrs) {
                        var self = this;
                        /*global google*/
                        var options = $scope.gmOptions();
                        var readyCallback = $scope.gmReady();
                        var defaultOptions = {
                            zoom: 8,
                            center: new google.maps.LatLng(-34.397, 150.644)
                        };
                        var cssOpts = $scope.cssOptions();
                        options = options || {};
                        var defaultCssOptions = {
                            height: '100%',
                            width: '100%',
                            position: 'absolute'
                        };
                        angular.extend(defaultCssOptions, cssOpts);
                        angular.extend(defaultOptions, options);
                        $element.css(defaultCssOptions);
                        var div = angular.element('<div>');
                        div.css({
                            height: '100%',
                            width: '100%',
                            margin: 0,
                            padding: 0
                        });
                        $element.append(div);
                        var map = new google.maps.Map(div[0], defaultOptions);
                        self['getMap'] = function () {
                            return map;
                        };
                        if (typeof readyCallback === 'function') {
                            readyCallback(map);
                        }
                        map.openInfoWnd = function (content, map, marker, infoWindow, overrideOpen) {
                            overrideOpen.apply(infoWindow, [map, marker]);
                            if (infoWindow.$scope && infoWindow.$compiled) {
                                //update scope when info window reopened
                                $timeout(function () {
                                    infoWindow.$scope.$apply();
                                });
                            } else {
                                var childScope = $scope.$new();
                                childScope.$infoWND = infoWindow;
                                infoWindow.$scope = childScope;
                                $timeout(function () {
                                    childScope.$apply();
                                });
                            }
                            //check if we already compiled template then don't need to do it again
                            if (infoWindow.$compiled !== true) {
                                var compiled = $compile(content.trim())(infoWindow.$scope);
                                infoWindow.$compiled = true;
                                infoWindow.setContent(compiled[0]);
                            }
                        };
                        map.closeInfoWnd = function (infoWnd, overrideCloseMethod) {
                            if (infoWnd.$scope) {
                                infoWnd.$compiled = false;
                                infoWnd.$scope.$destroy();
                                delete infoWnd.$scope;
                                delete infoWnd.$compiled;
                            }
                            overrideCloseMethod.apply(infoWnd, []);
                        };
                        return self;
                    }
                }
            }
        ]);
})(google, angular);

/**
 * Created by artem on 10/7/15.
 */
    /*global google*/
    (function (google, angular) {
    'use strict';
    angular.module('LogicifyGMap')
        .directive('xmlOverlays', [
            '$timeout',
            '$log',
            '$q',
            '$compile',
            '$http',
            'SmartCollection',
            function ($timeout, $log, $q, $compile, $http, SmartCollection) {
                return {
                    restrict: 'E',
                    require: '^logicifyGmap',
                    link: function (scope, element, attrs, ctrl) {
                        var geoXml3Parser = null;
                        scope.kmlCollection = new SmartCollection(scope.$eval(attrs['kmlCollection']));
                        var currentCollectionPrefix = scope.kmlCollection._uid;
                        scope.events = scope.$eval(attrs['gmapEvents']) || {};
                        scope.parserOptions = scope.$eval(attrs['parserOptions']) || {};
                        scope.onProgress = scope.$eval(attrs['onProgress']);
                        scope.fitBoundsAfterAll = scope.$eval(attrs['fitAllLayers']); //true by default
                        var promises = [], PROMISE_STATUSES = {PENDING: 0, RESOLVED: 1, REJECTED: 2};

                        function getParserOptions(map, wnd) {
                            var opts = {};
                            angular.extend(opts, scope.parserOptions);
                            //override options
                            opts.map = map;
                            opts.afterParse = afterParse;
                            opts.onAfterCreateGroundOverlay = scope.events.onAfterCreateGroundOverlay;
                            opts.onAfterCreatePolygon = scope.events.onAfterCreatePolygon;
                            opts.onAfterCreatePolyLine = scope.events.onAfterCreatePolyLine;
                            opts.failedParse = failedParse;
                            opts.infoWindow = wnd;
                            return opts;
                        }

                        /**
                         * get google map object from controller
                         */
                        scope.gMap = ctrl.getMap();
                        scope.infowindow = scope.$eval(attrs['infoWindow']);
                        scope.collectionsWatcher = attachCollectionWatcher();
                        if (scope.infowindow && typeof scope.infowindow.$ready === 'function') {
                            scope.infowindow.$ready(function (wnd) {
                                geoXml3Parser = new geoXML3.parser(getParserOptions(scope.gMap, wnd));
                                initKmlCollection();
                            });
                        } else {
                            geoXml3Parser = new geoXML3.parser(getParserOptions(map));
                            initKmlCollection();
                        }
                        scope.$on('$destroy', function () {
                            if (typeof scope.collectionsWatcher === 'function') {
                                scope.collectionsWatcher();//cancel watcher
                            }
                            //clear all pending promises
                            promises.forEach(function (promise) {
                                promise._abort();
                            });
                        });


                        /**
                         *
                         * @return {function()|*} listener
                         */
                        function attachCollectionWatcher() {
                            return scope.$watch('kmlCollection._uid', function (newValue, oldValue) {
                                //watch for top level object reference change
                                if (newValue == null || newValue != currentCollectionPrefix) {
                                    if (!(scope.kmlCollection instanceof SmartCollection)) {
                                        scope.kmlCollection = new SmartCollection(scope.$eval(attrs['kmlCollection']));
                                    }
                                    currentCollectionPrefix = scope.kmlCollection._uid;
                                    if (scope['busy'] === true || geoXml3Parser.docs && geoXml3Parser.docs.length > 0) {
                                        promises.forEach(function (promise) {
                                            promise._abort();
                                        });
                                        promises.splice(0, promises.length);
                                        clearAll();
                                    }
                                    initKmlCollection().then(function () {
                                        promises.splice(0, promises.length);
                                    });
                                }
                            });
                        }

                        function onAddArrayItem(item) {
                            if (item != null) {
                                downLoadOverlayFile(item).then(function (kmlObject) {
                                    if (scope.kmlCollection.length != 1 && scope.fitBoundsAfterAll !== false) {
                                        scope.globalBounds.extend(kmlObject.doc[0].bounds.getCenter());
                                        $timeout(function () {
                                            scope.gMap.fitBounds(scope.globalBounds);
                                        }, 10);
                                    }
                                });
                            }
                        }

                        function onRemoveArrayItem(item) {
                            clearAll(item);
                        }

                        /**
                         * Fires when kml or kmz file has been parsed
                         * @param doc - Array that contains only one item: [0] = {Document}
                         */
                        function afterParse(doc, promise) {
                            doc[0].$uid = new Date().getTime() + '-index-' + Math.floor(Math.random() * ( -9));
                            if (typeof scope.events.onAfterParse === 'function') {
                                scope.events.onAfterParse(doc);
                            }
                            if (promise) {
                                promise.resolve(doc);
                            }
                        }

                        /**
                         * Fires when failed parse kmz or kml
                         */
                        function failedParse(doc, promise) {
                            if (promise) {
                                promise.reject(doc);
                            }
                            if (typeof scope.events.onAfterParseFailed === 'function') {
                                scope.events.onAfterParseFailed(doc);
                            }
                        }

                        function initGlobalBounds() {
                            scope.globalBounds = new google.maps.LatLngBounds();
                            if (scope.kmlCollection.length != 1 && scope.fitBoundsAfterAll !== false) {
                                scope.kmlCollection.forEach(function (item) {
                                    scope.globalBounds.extend(item.doc[0].bounds.getCenter());
                                });
                                $timeout(function () {
                                    scope.gMap.fitBounds(scope.globalBounds);
                                }, 10);
                            } else if (scope.kmlCollection.length > 0 && scope.fitBoundsAfterAll !== false) {
                                $timeout(function () {
                                    scope.gMap.fitBounds(scope.kmlCollection[0].doc[0].bounds);
                                }, 10);
                            }
                        }

                        /**
                         * Cleanup
                         */
                        function clearAll(item) {
                            if (item) {
                                geoXml3Parser.hideDocument(item.doc[0]);
                                var index = geoXml3Parser.docs.indexOf(item.doc[0]);
                                if (index > -1) {
                                    delete geoXml3Parser.docsByUrl[item.doc[0].baseUrl];
                                    geoXml3Parser.docs.splice(index, 1);
                                    initGlobalBounds();
                                }
                            } else {
                                angular.forEach(geoXml3Parser.docs, function (doc) {
                                    geoXml3Parser.hideDocument(doc);
                                });
                                geoXml3Parser.docs.splice(0, geoXml3Parser.docs.length);
                                geoXml3Parser.docsByUrl = {};
                                scope.globalBounds = new google.maps.LatLngBounds();
                            }
                        }

                        /**
                         * Download all files by asset
                         */
                        function initKmlCollection() {
                            if (scope.kmlCollection instanceof SmartCollection) {
                                scope['busy'] = true;
                                scope.kmlCollection.onAddItem(onAddArrayItem);
                                scope.kmlCollection.onRemoveItem(onRemoveArrayItem);
                                scope.kmlCollection.forEach(function (kmlFile) {
                                    promises.push(downLoadOverlayFile(kmlFile));
                                });
                                return $q.all(promises).then(function (results) {
                                    initGlobalBounds();
                                    //clear all promises;
                                    promises.splice(0, promises.length);
                                    scope['busy'] = false;
                                });
                            }
                        }

                        /**
                         * Each time when "downLoadingStarted" or "parserStarted" changes we are calling this callback
                         */
                        function progress() {
                            if (typeof scope.onProgress === 'function') {
                                scope.onProgress({
                                    total: promises.length,
                                    done: getCountOf(PROMISE_STATUSES.RESOLVED),
                                    errors: getCountOf(PROMISE_STATUSES.REJECTED)
                                });
                            }
                        }

                        function getCountOf(statusCode) {
                            var count = 0;
                            promises.forEach(function (promise) {
                                if (promise.$$state.status === statusCode) {
                                    count++;
                                }
                            });
                            return count;
                        }

                        /**
                         * FIred when we need to start downloading of new kml or kmz file
                         * @param kmlObject
                         * @return {boolean}
                         */
                        function downLoadOverlayFile(kmlObject) {
                            var deferred = $q.defer();
                            var httpCanceler = $q.defer();
                            deferred.promise._abort = function () {
                                deferred.reject();
                                httpCanceler.resolve();
                            };
                            if (kmlObject.url != null) {
                                $http.get(kmlObject.url, {timeout: httpCanceler.promise, responseType: "arraybuffer"})
                                    .then(function (response) {
                                        var data = new Blob([response.data], {type: response.headers()['content-type']});
                                        data.lastModifiedDate = new Date();
                                        data.name = 'example' + data.lastModifiedDate;
                                        onAfterDownload(data, null, deferred);
                                    });

                            } else if (typeof kmlObject.content === 'String') {
                                onAfterDownload(null, kmlObject.content, deferred);
                            } else {
                                if (kmlObject.file instanceof Blob) {
                                    onAfterDownload(kmlObject.file, null, deferred);
                                } else {
                                    $log.error('Incorrect file type. Should be an instance of a Blob or String (url).');
                                }
                            }
                            var promise = deferred.promise
                                .then(function (doc) {
                                    kmlObject.doc = doc;
                                    return kmlObject;
                                })
                                .catch(function (doc) {
                                    //handle errors here
                                })
                                .finally(function () {
                                    progress();
                                });
                            return promise;
                        }

                        /**
                         * When downloading finished we need start parsing
                         * @param blob - if it's a file
                         * @param content - if it's a string
                         */
                        function onAfterDownload(blob, content, deferred) {
                            content == null ? geoXml3Parser.parse(blob, null, deferred) : geoXml3Parser.parseKmlString(content, null, deferred);
                        }
                    }
                }
            }
        ]);
    })(google, angular);
/**
 * Created by artem on 6/18/15.
 */
    /*global google*/
    (function (google, angular) {
    angular.module('LogicifyGMap')
        .service('InfoWindow', ['$log', '$rootScope', '$templateCache', '$timeout', '$http', '$compile', function ($log, $rootScope, $templateCache, $timeout, $http, $compile) {
            function InfoWindow() {
                var self = this;
                //private
                var readyCallbackHolders = [], isInfoWndReady = false, lastMap = null;
                //public
                self['$ready'] = function (callback) {
                    if (isInfoWndReady === true && callback) {
                        callback(self);
                        return;
                    }
                    if (callback) {
                        readyCallbackHolders.push(callback);
                    }
                };

                //base logic function
                function overridesMethods(content) {
                    //override method 'open'
                    var overrideOpen = self['open'];
                    self['open'] = function (map, marker) {
                        lastMap = map;
                        if (typeof map.openInfoWnd === 'function') {
                            map.openInfoWnd(content, map, marker, self, overrideOpen);
                        }
                    };
                    //override method 'close'
                    var overrideClose = self['close'];
                    self['close'] = function (destroyScope) {
                        if (!lastMap) {
                            return;
                        }
                        if (typeof lastMap.closeInfoWnd === 'function' && destroyScope === true) {
                            lastMap.closeInfoWnd(self, overrideClose);
                        } else {
                            overrideClose.apply(self, []);
                        }
                    };
                    //notify all registered listeners that info window is ready
                    isInfoWndReady = true;
                    if (readyCallbackHolders.length > 0) {
                        for (var i = 0; i < readyCallbackHolders.length; i++) {
                            readyCallbackHolders[i](self);
                        }
                        readyCallbackHolders = [];
                    }
                }

                //if arguments
                if (arguments[0]) {
                    //select logic if info window creates via template url
                    if (arguments[0].templateUrl) {
                        $http.get(arguments[0].templateUrl, {cache: $templateCache})
                            .then(function (response) {
                                arguments[0].content = response.data;
                                google.maps.InfoWindow.apply(self, arguments);
                                overridesMethods(response.data);
                            });
                    } else if (arguments[0].content) {
                        //if via 'content'
                        google.maps.InfoWindow.apply(self, arguments);
                        overridesMethods(arguments[0].content);
                    }
                } else {
                    //if no args then just call parent constructor, because we can't handle it
                    google.maps.InfoWindow.apply(self, arguments);
                }
            }

            if (google) {
                InfoWindow.prototype = Object.create(google.maps.InfoWindow.prototype);
                InfoWindow.prototype.constructor = InfoWindow;
            }
            return InfoWindow;
        }])
    })(google, angular);

}));
