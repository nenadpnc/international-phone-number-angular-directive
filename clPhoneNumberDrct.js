(function () {
    module.exports = function (app) {

        app.directive('clPhoneNumber', clPhoneNumber);
        app.directive('phoneValidation', phoneValidation);

        clPhoneNumber.$inject = [];

        function clPhoneNumber() {
            var keys = { UP: 38, DOWN: 40, ENTER: 13, ESC: 27,  TAB: 9, A: 65, Z: 90, PLUS: 43 };

            return {
                restrict: 'A',
                scope: {
                    countries: '=',
                    selectedCountry: '=',
                    countryCode: '=',
                    tabIndex: '=',
                    model: '=',
                    uniqueId: '@',
                    validate: '=',
                    otherLabel: '@',
                    isRequired: '=',
                    extModel: '=',
                    selector: '@',
                    validatePhoneFn: '=',
                    phoneNumberValid: '=',
                    notValidMessage: '@'
                },
                template: '<div class="intl-tel-input allow-dropdown">' +
                            '<div class="flag-container" ng-click="showCountryList = !showCountryList">' +
                                '<div class="{{uniqueId}} selected-flag">' +
                                    '<div class="{{uniqueId}} iti-flag {{selectedCountry.iso2Code.toLowerCase()}}"></div>' +
                                    '<div class="{{uniqueId}} iti-arrow"></div>' +
                                    '<div class="{{uniqueId}} iti-dial-code">+{{selectedCountry.dialCode}}</div>' +
                                '</div>' +
                                '<ul class="country-list" ng-class="{hide: !showCountryList}">' +
                                    '<li class="country {{country.iso2Code.toLowerCase()}}" ng-repeat="country in countryList track by $index" ' +
                                                        'ng-click="selectCountry(country)" ' +
                                                        'ng-init="initCountry(country, $index)" ' +
                                                        'ng-class="{highlight: country.highlight, selected: country.selected}" ' +
                                                        'ng-mouseenter="country.highlight = true" ' +
                                                        'ng-mouseleave="country.highlight = false">' +
                                        '<div class="flag-box">' +
                                            '<div class="iti-flag {{country.iso2Code.toLowerCase()}}"></div>' +
                                        '</div>' +
                                        '<span class="country-name">{{country.name}}</span>' +
                                        '<span class="dial-code" ng-if="country.dialCode">+{{country.dialCode}}</span>' +
                                    '</li>' +
                                '</ul>' +
                            '</div>' +
                            '<input class="{{uniqueId}} international-phone cl-input__field" ' +
                                    'phone-validation ' +
                                    'ng-blur="validatePhone()" ' +
                                    'ng-change="phoneChanged()" ' +
                                    'ng-model="model" ' +
                                    'tabindex="{{tabIndex}}" ' +
                                    'type="tel" ' +
                                    'name="{{uniqueId}}" ' +
                                    'id="phone" ' +
                                    'placeholder="{{selectedCountry.phonePlaceholder}}" ' +
                                    'maxlength="25"' +
                                    'ng-required="isRequired"' +
                                    'autocomplete="off">' +
                            '<input class="cl-input__field ext" tabindex="{{tabIndex + 1}}" type="text" name="ext" id="ext" ng-model="extModel" placeholder="ext.">' +
                            '<p class="cl-input__info cl-invalid-error-text" ng-show="!phoneNumberValid">{{notValidMessage}}</p>' +
                          '</div>',
                link: function (scope, ele) {
                    ele.on('keydown', function (e) {
                        var keyCode = e.which || e.keyCode;
                        if (keyCode == keys.UP || keyCode == keys.DOWN) {
                            scope.$evalAsync(function () {
                                scope.showCountryList = true;
                            });
                        } else if (keyCode == keys.TAB) {
                            scope.closeCountryList();
                        }
                    });
                },
                controller: ['$scope', '$document', '$timeout', '$window', '$parse', function ($scope, $document, $timeout, $window, $parse) {
                    var queryTimer = null;
                    var query = '';
                    var _timeout;
                    var otherCountryIndex = 0;

                    $scope.countryList = prependOtherCountry($scope.countries);

                    $scope.$on('onCountriesFetch', function (event, countries) {
                        $scope.countryList = prependOtherCountry(countries);
                    });

                    $timeout(function () {
                        if ($window.addEventListener) {
                            $window.addEventListener('click', $scope.closeCountryList);
                        } else if ($window.attachEvent) {
                            $window.attachEvent('onclick', $scope.closeCountryList);
                        }
                    }, 100);

                    $scope.selectCountry = function (country) {
                        $scope.selectedCountry = country;
                        angular.forEach($scope.countryList, function (item) {
                            item.selected = false;
                            item.highlight = false;
                        });
                        country.selected = true;
                        document.getElementById($scope.uniqueId).focus();
                        if (country.dialCode && $scope.model) {
                            $scope.model = $scope.model.replace(/[+00]+/, '');
                        }
                    };

                    $scope.initCountry = function (country, i) {
                        if ($scope.countryCode && $scope.countryCode.toLowerCase() === country.iso2Code.toLowerCase()) {
                            $scope.selectedCountry = country;
                            country.selected = true;
                            country.preferred = true;

                            $timeout(function () {
                                $scope.countryList.splice(i, 1);
                                $scope.countryList.unshift(country);
                                otherCountryIndex = 1;
                            }, 50);
                        }
                    };

                    $scope.phoneChanged = function () {
                        var plusMatch = !!($scope.model && $scope.model.length >= 1 && ($scope.model[0] === '+'));
                        var doubleZeroMatch = !!($scope.model && $scope.model.length >= 2 && $scope.model.substring(0, 2) === '00');
                        if (plusMatch || doubleZeroMatch) {
                            if (_timeout) { //if there is already a timeout in process cancel it
                                $timeout.cancel(_timeout);
                            }
                            _timeout = $timeout(function () {
                                var searchPart = plusMatch ? $scope.model.substring(1).split(' ')[0] : $scope.model.substring(2).split(' ')[0];
                                if (searchPart) {
                                    var searchResult = searchForCountry(searchPart, true);
                                    $scope.selectedCountry = searchResult.country;
                                    if (searchResult.match) {
                                        var replace = plusMatch ? '+' + searchPart : '00' + searchPart;
                                        $scope.model = $scope.model.replace(replace, '');
                                    }
                                }

                                _timeout = null;
                            }, 250);
                        }

                        if ($scope.model && !plusMatch && !doubleZeroMatch) {
                            $timeout(function () {
                                $scope.model = toPattern();
                            });
                        }
                    };

                    $scope.validatePhone = function () {
                        $scope.validate = true;
                        if ($scope.selectedCountry.iso2Code && $scope.model) {
                            $scope.validatePhoneFn($scope.model, $scope.selectedCountry.iso2Code).then(function (data) {
                                $scope.phoneNumberValid = !!(data && data.phoneNumberValid);
                            }, function () {
                                $scope.phoneNumberValid = false;
                            });
                        } else {
                            $scope.phoneNumberValid = true;
                        }
                    };

                    $document.bind("keydown", function (e) {
                        var keyCode = e.which || e.keyCode;
                        if ($scope.showCountryList && (keyCode === keys.UP || keyCode === keys.DOWN)) {
                            handleUpDownKey(e, keyCode == keys.UP);
                        } else if (keyCode === keys.ESC) {
                            $scope.closeCountryList();
                        } else if ($scope.showCountryList && keyCode === keys.ENTER) {
                            handleEnterKey(e);
                        } else if ($scope.showCountryList && (keyCode >= keys.A && keyCode <= keys.Z)) {
                            e.preventDefault ? e.preventDefault() : (e.returnValue = false);
                            if (queryTimer) {
                                clearTimeout(queryTimer);
                            }

                            query += String.fromCharCode(keyCode);
                            searchForCountry(query);
                            // if the timer hits 1 second, reset the query
                            queryTimer = setTimeout(function () {
                                query = '';
                            }, 1000);
                        }
                    });

                    $scope.closeCountryList = function (event) {
                        var elClass = event ? $parse('srcElement.className.split(\' \')[0]')(event) : '';
                        if ((event && elClass && $scope.uniqueId !== elClass) || !event) {
                            removeHighlight();
                            $scope.$evalAsync(function () {
                                $scope.showCountryList = false;
                            });
                        }
                    };

                    function prependOtherCountry(countries) {
                        if (!countries) {
                            return [];
                        }

                        var countriesCopy = angular.copy(countries);
                        countriesCopy.unshift({
                            name: $scope.otherLabel,
                            iso2Code: '',
                            dialCode: '',
                            priority: 0,
                            areaCodes: null
                        });
                        countriesCopy[0].selected = true;
                        $scope.selectedCountry = countriesCopy[0];

                        return countriesCopy;
                    }

                    function handleUpDownKey(e, isUp) {
                        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
                        var active = getActiveElement();
                        var next = isUp ? angular.element(prev(active)) : angular.element(active).next();

                        if (next.length) {
                            $timeout(function () {
                                angular.element(active).scope().country.highlight = false;
                                next.scope().country.highlight = true;
                            });
                        }

                        scrollTo(next);

                    }

                    function handleEnterKey(e) {
                        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
                        var active = getActiveElement();
                        var country = angular.element(active).scope().country;
                        $scope.selectCountry(country);
                        $scope.$evalAsync(function () {
                            $scope.showCountryList = false;
                        });
                    }

                    function searchForCountry(query, isEqual) {
                        query = query.toLowerCase();
                        for (var i = 0; i < $scope.countryList.length; i++) {
                            var country = $scope.countryList[i];
                            var isMatch = isEqual ?
                                !!((country.name === query || country.dialCode === query) && (country.preferred || country.priority == 0)) :
                                !!(startsWith(country.name, query) || startsWith(country.dialCode, query));

                            if (isMatch) {
                                removeHighlight(isEqual);
                                (function (country) {
                                    $timeout(function () {
                                        if (isEqual) {
                                            country.selected = true;
                                        } else {
                                            country.highlight = true;
                                        }
                                    });
                                }(country));

                                scrollTo([document.querySelector('.' + country.iso2Code.toLowerCase())], true);
                                return {
                                    match: true,
                                    country: country
                                };
                            }
                        }

                        // select other
                        $scope.selectCountry($scope.countryList[otherCountryIndex]);

                        return {
                            match: false,
                            country: $scope.countryList[otherCountryIndex]
                        };
                    }

                    function scrollTo(element, middle) {
                        var el = element[0];
                        if (el) {
                            var container = document.querySelector('.' + $scope.selector + ' .country-list');
                            var containerHeight = container.offsetHeight;
                            var containerTop = container.getBoundingClientRect().top;
                            var containerBottom = containerTop + containerHeight;
                            var elementHeight = el.offsetHeight;
                            var elementTop = el.getBoundingClientRect().top;
                            var elementBottom = elementTop + elementHeight;
                            var newScrollTop = elementTop - containerTop + container.scrollTop;
                            var middleOffset = containerHeight / 2 - elementHeight / 2;

                            if (elementTop < containerTop) {
                                // scroll up
                                if (middle) {
                                    newScrollTop -= middleOffset;
                                }
                                container.scrollTop = newScrollTop;
                            } else if (elementBottom > containerBottom) {
                                // scroll down
                                if (middle) {
                                    newScrollTop += middleOffset;
                                }
                                var heightDifference = containerHeight - elementHeight;
                                container.scrollTop = newScrollTop - heightDifference;
                            }
                        }
                    }

                    function getActiveElement() {
                        var activeNode = document.querySelectorAll('.' + $scope.selector + ' .highlight');
                        var selectedNode = document.querySelectorAll('.' + $scope.selector + ' .selected');
                        return activeNode.length ? activeNode[0] : selectedNode[0];
                    }

                    function startsWith(a, b) {
                        return a.substr(0, b.length).toLowerCase() == b;
                    }

                    function removeHighlight(isEqual) {
                        for (var i = 0; i < $scope.countryList.length; i++) {
                            $scope.countryList[i].highlight = false;
                            if (isEqual) {
                                $scope.countryList[i].selected = false;
                            }
                        }
                    }

                    function prev(element) {
                        if (element.previousElementSibling) {
                            return element.previousElementSibling;
                        }

                        // IE8 doesn't have previousElementSibling
                        var elm = element.previousSibling;
                        while (elm != null && elm.nodeType !== 1) {
                            elm = elm.previousSibling;
                        }
                        return elm;
                    }

                    function toPattern() {
                        var patternPlaceholder = $scope.selectedCountry && $scope.selectedCountry.phonePlaceholder ? $scope.selectedCountry.phonePlaceholder : '';
                        var output = patternPlaceholder.split('') || '';
                        var outputLength = output.length;
                        var patternChars = patternPlaceholder.replace(/\W/g, '') || '';
                        var values = $scope.model.replace(/\W/g, '');
                        var index = 0;

                        if (values.length > patternChars.length) {
                            return $scope.model.replace(/\W/g, '');
                        }

                        for (var i = 0; i < outputLength; i++) {
                            // Reached the end of input
                            if (index >= values.length) {
                                if (patternChars.length == values.length) {
                                    return output.join("");
                                } else {
                                    break;
                                }
                            } else {
                                if ((output[i].match(/[0-9]/) && values[index].match(/[0-9]/)) ||
                                    (output[i].match(/[a-zA-Z]/) && values[index].match(/[a-zA-Z]/)) ||
                                    (output[i].match(/[0-9a-zA-Z]/) && values[index].match(/[0-9a-zA-Z]/))) {
                                    output[i] = values[index++];
                                } else if (output[i].match(/[0-9]/) || output[i].match(/[a-zA-Z]/) || output[i].match(/[0-9a-zA-Z]/)) {
                                    return output.slice(0, i).join("");
                                }
                            }
                        }
                        return output.join("").substr(0, i);
                    }
                }]
            };
        }

        function phoneValidation() {
            return {
                require: 'ngModel',
                link: function (scope, element, attrs, modelCtrl) {

                    modelCtrl.$parsers.push(function (inputValue) {

                        var transformedInput = inputValue ? inputValue.replace(/[^0-9-()+.\/ ]+/g, '') : inputValue;

                        if (transformedInput !== inputValue) {
                            modelCtrl.$setViewValue(transformedInput);
                            modelCtrl.$render();
                        }

                        return transformedInput;
                    });
                }
            };
        }
    }

})();


