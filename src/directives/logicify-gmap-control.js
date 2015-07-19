/**
 * Created by artem on 6/24/15.
 */
(function (angular) {
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
                        var element = angular.element(iElement.html());
                        element[0].index = index || 0;
                        iElement.empty();
                        ctrl.$mapReady(function (map) {
                            if (!map.controls[position]) {
                                throw new Error('Position of control on the map is invalid. Please see google maps spec.');
                            }
                            map.controls[position].push(element[0]);
                        });

                    }
                }
            }
        ]);
})(angular);
