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

    //local function
    function initDone() {

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
                Engage.trigger("Video:setVolumne", (ui.value) / 100);
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
        Engage.on("Video:timeupdate", function(currentTime) {
            var duration = Engage.model.get("videoDataModel").get("duration");
            if (!isSliding) {
                var normTime = (currentTime / (duration / 1000)) * 1000;
                $("#slider").slider("option", "value", normTime);
            }
        });

        // slider events
        // $("#slider").on("slide", function(event, ui) {});
        // $("#slider").on("slidechange", function(event, ui) {});
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