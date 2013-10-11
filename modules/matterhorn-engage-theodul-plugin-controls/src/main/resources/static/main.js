/**
 *  Copyright 2009-2011 The Regents of the University of California
 *  Licensed under the Educational Community License, Version 2.0
 *  (the "License"); you may not use this file except in compliance
 *  with the License. You may obtain a copy of the License at
 *
 *  http://www.osedu.org/licenses/ECL-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an "AS IS"
 *  BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 *  or implied. See the License for the specific language governing
 *  permissions and limitations under the License.
 *
 */
/*jslint browser: true, nomen: true*/
/*global define*/
define(['require', 'jquery', 'underscore', 'backbone', 'engage/engage_core'], function(require, $, _, Backbone, Engage) {
    "use strict"; // strict mode in all our application
    var PLUGIN_NAME = "Engage Controls Mockup",
            PLUGIN_TYPE = "engage_controls",
            PLUGIN_VERSION = "0.1",
            PLUGIN_TEMPLATE = "template.html",
            PLUGIN_STYLES = [
        "style.css",
        "js/bootstrap/css/bootstrap.css",
        "js/bootstrap/css/bootstrap-responsive.css",
        "js/jqueryui/themes/base/jquery-ui.css"
    ];
    var initCount = 3; //init resource count
    var isPlaying = false;
    var isSliding = false;

    function disable(id) {
        $("#" + id).attr("disabled", "disabled");
    }

    function greyOut(id) {
        $("#" + id).animate({opacity: 0.5});
    }

    /**
     * @description Returns the Input Time in Milliseconds
     * @param data Data in the Format ab:cd:ef
     * @return Time from the Data in Milliseconds
     */
    function getTimeInMilliseconds(data) {
        if ((data !== undefined)
                && (data !== null)
                && (data != 0)
                && (data.length)
                && (data.indexOf(':') != -1)) {
            var values = data.split(':');
            // If the Format is correct
            if (values.length == 3) {
                // Try to convert to Numbers
                var val0 = values[0] * 1;
                var val1 = values[1] * 1;
                var val2 = values[2] * 1;
                // Check and parse the Seconds
                if (!isNaN(val0) && !isNaN(val1) && !isNaN(val2)) {
                    // Convert Hours, Minutes and Seconds to Milliseconds
                    val0 *= 60 * 60 * 1000; // 1 Hour = 60 Minutes = 60 * 60 Seconds = 60 * 60 * 1000 Milliseconds
                    val1 *= 60 * 1000; // 1 Minute = 60 Seconds = 60 * 1000 Milliseconds
                    val2 *= 1000; // 1 Second = 1000 Milliseconds
                    // Add the Milliseconds and return it
                    return val0 + val1 + val2;
                }
            }
        }
        return 0;
    }

    /**
     * @description Returns formatted Seconds
     * @param seconds Seconds to format
     * @return formatted Seconds
     */
    function formatSeconds(seconds) {
        if (!seconds) {
            seconds = 0;
        }
        seconds = (seconds < 0) ? 0 : seconds;
        var result = "";
        if (parseInt(seconds / 3600) < 10) {
            result += "0";
        }
        result += parseInt(seconds / 3600);
        result += ":";
        if ((parseInt(seconds / 60) - parseInt(seconds / 3600) * 60) < 10) {
            result += "0";
        }
        result += parseInt(seconds / 60) - parseInt(seconds / 3600) * 60;
        result += ":";
        if (seconds % 60 < 10) {
            result += "0";
        }
        result += seconds % 60;
        if (result.indexOf(".") != -1) {
            result = result.substring(0, result.lastIndexOf(".")); // get rid of the .ms
        }
        return result;
    }

    //local function
    function initDone() {
        // disable not used buttons
        disable("backward_button");
        disable("forward_button");
        greyOut("backward_button");
        greyOut("forward_button");
        disable("navigation_time");
        $("#navigation_time_current").keyup(function(e) {
            // pressed enter
            if (e.keyCode == 13) {
                var time = getTimeInMilliseconds($(this).val()) / 1000;
                var duration = Engage.model.get("videoDataModel").get("duration");
                if (duration && (time <= duration)) {
                    var videoDisplay = Engage.model.get("videoDataModel").get("ids")[0];
                    videojs(videoDisplay).currentTime(time);
                }
            }
        });

        $("#slider").slider({
            range: "min",
            min: 0,
            max: 1000,
            value: 0
        });

        $("#volume").slider({
            range: "min",
            min: 1,
            max: 100,
            value: 100,
            change: function(event, ui) {
                Engage.trigger("Video:setVolume", (ui.value) / 100);
            }
        });

        $("#playpause_controls").click(function() {
            if (isPlaying === true) {
                Engage.trigger("Video:pause");
            } else {
                Engage.trigger("Video:play");
            }
        });

        $(".expand_button").click(function() {
            $(".expanded_content").slideToggle("fast");
            $(".pulldown_image").toggleClass("rotate180");
        });

        Engage.on("Video:play", function() {
            $("#play_button").hide();
            $("#pause_button").show();
            isPlaying = true;
        });
        Engage.on("Video:pause", function() {
            $("#play_button").show();
            $("#pause_button").hide();
            isPlaying = false;
        });

        $("#fullscreen_button").click(function() {
            var isInFullScreen = document.fullScreen ||
                    document.mozFullScreen ||
                    document.webkitIsFullScreen;
            // just trigger the go event
            if (!isInFullScreen) {
                Engage.trigger("Video:goFullscreen");
            }
        });
        Engage.on("Video:fullscreenChange", function() {
            var isInFullScreen = document.fullScreen ||
                    document.mozFullScreen ||
                    document.webkitIsFullScreen;
            // just trigger the cancel event
            if (!isInFullScreen) {
                Engage.trigger("Video:cancelFullscreen");
            }
        });

        Engage.on("Video:timeupdate", function(currentTime) {
            // set slider
            var duration = Engage.model.get("videoDataModel").get("duration");
            if (!isSliding && duration) {
                var normTime = (currentTime / (duration / 1000)) * 1000;
                $("#slider").slider("option", "value", normTime);
            }
            // set time
            $("#navigation_time_current").val(formatSeconds(currentTime));
        });

        Engage.model.on("change:videoDataModel", function() {
            var duration = Engage.model.get("videoDataModel").get("duration");
            if (duration) {
                $("#navigation_time_duration").html(formatSeconds(duration / 1000));
            }
        });

        // slider events
        $("#slider").on("slidestart", function(event, ui) {
            isSliding = true;
            Engage.trigger("Slider:start", ui.value);
        });
        $("#slider").on("slidestop", function(event, ui) {
            isSliding = false;
            Engage.trigger("Slider:stop", ui.value);
        });
    }

    //local logic

    //Init Event
    Engage.log("Controls:init");

    //Load other needed JS stuff with Require
    require(["./js/bootstrap/js/bootstrap.js"], function() {
        initCount -= 1;
        if (initCount === 0) {
            initDone();
        }
    });
    require(["./js/jqueryui/jquery-ui.min.js"], function() {
        initCount -= 1;
        if (initCount === 0) {
            initDone();
        }
    });

    //All plugins loaded lets do some stuff
    Engage.on("Core:plugin_load_done", function() {
        Engage.log("Controls: receive plugin load done");
        initCount -= 1;
        if (initCount === 0) {
            initDone();
        }
    });

    return {
        name: PLUGIN_NAME,
        type: PLUGIN_TYPE,
        version: PLUGIN_VERSION,
        styles: PLUGIN_STYLES,
        template: PLUGIN_TEMPLATE
    };
});
