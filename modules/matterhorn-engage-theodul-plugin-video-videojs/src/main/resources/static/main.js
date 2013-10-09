/**
 * Copyright 2009-2011 The Regents of the University of California Licensed
 * under the Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain a
 * copy of the License at
 *
 * http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 */
/*jslint browser: true, nomen: true*/
/*global define*/
define(['require', 'jquery', 'underscore', 'backbone', 'engage/engage_core'], function(require, $, _, Backbone, Engage) {
    //
    "use strict"; // strict mode in all our application
    //
    var PLUGIN_NAME = "Engage VideoJS Videodisplay",
            PLUGIN_TYPE = "engage_video",
            PLUGIN_VERSION = "0.1",
            PLUGIN_TEMPLATE = "template.html",
            PLUGIN_STYLES = [
        "style.css",
        "lib/videojs/video-js.css"
    ];
    var initCount = 3;
    var videoSources = [];
    videoSources.presenter = [];
    videoSources.presentation = [];
    var videojs_swf;

    function initVideojsVideo(id, videoSource) {
        Engage.log("initVideojsVideo: Initializing video.js-display: " + id);

        //insert video tag
        $("#videojs_wrapper").append('<p><video id="' + id + '" class="video-js vjs-default-skin container"></video></p><br />');

        var videoOptions = {
            "controls": false,
            "autoplay": false,
            "preload": "auto",
            "poster": videoSource.poster, // TODO: Can only be set when controls=true -.-
            "loop": "false",
            "width": 640,
            "height": 480
        };

        // init videoJS
        videojs(id, videoOptions, function() {
            var theodulVideodisplay = this;
            // set sources
            theodulVideodisplay.src(videoSource);
        });
        // URL to the Flash SWF
        // videojs.options.flash.swf = videojs_swf; // TODO: Set and comment in
    }

    function registerEvents(theodulVideodisplay) {
        Engage.on("Video:play", function() {
            theodulVideodisplay.play();
        });
        Engage.on("Video:stop", function() {
            theodulVideodisplay.stop();
        });
        Engage.on("Video:pause", function() {
            theodulVideodisplay.pause();
        });
        Engage.on("Video:goFullscreen", function() {
            theodulVideodisplay.requestFullScreen();
        });
        Engage.on("Video:cancelFullscreen", function() {
            theodulVideodisplay.cancelFullScreen();
        });
        Engage.on("Video:setVolumne", function(percentAsDecimal) {
            theodulVideodisplay.volume(percentAsDecimal);
        });
        Engage.on("Video:getVolumne", function(callback) {
            callback(theodulVideodisplay.volume());
        });
        /*
         theodulVideodisplay.on("play", function() {
         Engage.trigger("Video:play");
         });
         theodulVideodisplay.on("pause", function() {
         Engage.trigger("Video:pause");
         });
         */
        theodulVideodisplay.on("timeupdate", function() {
            Engage.trigger("Video:timeupdate", theodulVideodisplay.currentTime());
        });
        theodulVideodisplay.on("volumechange", function() {
            Engage.trigger("Video:volumechange", theodulVideodisplay.volume());
        });
    }

    function initVideojs() {
        Engage.log(videoSources);

        var i = 0;
        var nrOfVideodisplays = 0;
        for (var v in videoSources) {
            ++i;

            if (videoSources[v].length > 0) {
                ++nrOfVideodisplays;
                initVideojsVideo("videojs_videodisplay_".concat(i), videoSources[v]);
            }
        }

        // TODO: Implement a more elegant solution
        registerEvents(videojs("videojs_videodisplay_1"));
        if (nrOfVideodisplays >= 2) {
            $.synchronizeVideos("videojs_videodisplay_1", "videojs_videodisplay_2", true);
            Engage.log("Videodisplay 1 and 2 are now synchronized");
        }
    }

    function initPlugin() {
        // Get media infos from the Endpoint plugin
        Engage.trigger("MhConnection:getMediaInfo", function(mediaInfo) {
            Engage.log(mediaInfo);
            // look for video source
            $(mediaInfo.tracks).each(function(i, track) {
                if (track.mimetype.match(/video/g)) {
                    if (track.type.match(/presenter/g)) {
                        videoSources.presenter.push({
                            src: track.url,
                            type: track.mimetype,
                            typemh: track.type
                        });
                    } else if (track.type.match(/presentation/g)) {
                        videoSources.presentation.push({
                            src: track.url,
                            type: track.mimetype,
                            typemh: track.type
                        });
                    }
                }
            });
            $(mediaInfo.attachments).each(function(i, attachment) {
                if (attachment.mimetype.match(/image/g)
                        && attachment.type.match(/presenter/g)
                        && attachment.type.match(/player/g)) {
                    videoSources.presenter.poster = attachment.url;
                }
                if (attachment.mimetype.match(/image/g)
                        && attachment.type.match(/presentation/g)
                        && attachment.type.match(/player/g)) {
                    videoSources.presentation.poster = attachment.url;
                }
            });
            // init VideoJS object
            initVideojs();
        });
    }
    // Init Event
    Engage.log("Video:init");

    // Load videojs lib
    require(["./lib/videojs/video.js"], function(videojs) {
        Engage.log("Video: load video.js done");
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
        }
    });

    // Load synchronize jquery lib
    require(["./lib/synchronize.js"], function(videojs) {
        Engage.log("Video: load synchronize.js done");
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
        }
    });

    // Load videojs swf
    /* TODO
     require(["./lib/videojs/video-js.swf"], function(_videojs_swf) {
     Engage.log("Video: load video-js.swf done");
     videojs_swf = _videojs_swf;
     initCount -= 1;
     if (initCount === 0) {
     initPlugin();
     }
     });
     */

    // All plugins loaded lets do some stuff
    Engage.on("Core:plugin_load_done", function() {
        Engage.log("Video: receive plugin load done");
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
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
