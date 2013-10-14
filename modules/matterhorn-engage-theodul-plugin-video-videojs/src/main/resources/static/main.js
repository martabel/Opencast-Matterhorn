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
    "use strict"; // strict mode in all our application
    var PLUGIN_NAME = "Engage VideoJS Videodisplay",
            PLUGIN_TYPE = "engage_video",
            PLUGIN_VERSION = "0.1",
            PLUGIN_TEMPLATE = "template.html",
            PLUGIN_STYLES = [
        "style.css",
        "lib/videojs/video-js.css"
    ];
    var plugin = {
        name: PLUGIN_NAME,
        type: PLUGIN_TYPE,
        version: PLUGIN_VERSION,
        styles: PLUGIN_STYLES,
        template: PLUGIN_TEMPLATE
    };
    var videoDisplayNamePrefix = "videojs_videodisplay_";
    var videoPosterClass = ".vjs-poster";
    var initCount = 4;

    var VideoDataView = Backbone.View.extend({
        el: $("#engage_video"), // every view has an element associated with it
        initialize: function(videoDataModel, template, videojs_swf) {
            this.setElement($(plugin.container)); // every plugin view has it's own container associated with it
            this.model = videoDataModel;
            this.template = template;
            this.videojs_swf = videojs_swf;
            // bind the render function always to the view
            _.bindAll(this, "render");
            // listen for changes of the model and bind the render function to this
            this.model.bind("change", this.render);
            this.render();
        },
        render: function() {
            //format values
            var tempVars = {
                ids: this.model.get("ids")
            };
            // compile template and load into the html
            this.$el.html(_.template(this.template, tempVars));

            var i = 0;
            var videoDisplays = this.model.get("ids");
            var videoSources = this.model.get("videoSources");
            for (var v in videoSources) {
                if (videoSources[v].length > 0) {
                    initVideojsVideo(videoDisplays[i], videoSources[v], this.videojs_swf);
                }
                ++i;
            }
            // small hack for the posters: A poster is only being displayed when controls=true, so do it manually
            $(videoPosterClass).show();

            if (videoDisplays.length > 0) {
                // set first videoDisplay as master
                registerEvents(videoDisplays[0]);

                var nr = 0;
                for (var v in videoSources) {
                    if (videoSources[v].length > 0) {
                        ++nr;
                    }
                }
                if (nr >= 2) {
                    for (var vd in videoDisplays) {
                        if (vd > 0) {
                            // sync every other videodisplay with the master
                            $.synchronizeVideos(videoDisplays[0], videoDisplays[vd], true);
                            Engage.log("Videodisplay " + vd + " is now being synchronized with the master videodisplay " + 0);
                        }
                    }
                }
            }
        }
    });

    var VideoDataModel = Backbone.Model.extend({
        initialize: function(ids, videoSources, duration) {
            Engage.log("Video: Init VideoDataModel");
            this.attributes.ids = ids;
            this.attributes.videoSources = videoSources;
            this.attributes.duration = duration;
        },
        defaults: {
            "ids": [],
            "videoSources": [],
            "isPlaying": false,
            "currentTime": -1,
            "duration": -1
        }
    });

    function initVideojsVideo(id, videoSource, videojs_swf) {
        Engage.log("Initializing video.js-display: " + id);

        var videoOptions = {
            "controls": false,
            "autoplay": false,
            "preload": "auto",
            "poster": videoSource.poster,
            "loop": false,
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
        if (videojs_swf) {
            Engage.log("Loaded flash component");
            videojs.options.flash.swf = videojs_swf;
        } else {
            Engage.log("No flash component loaded");
        }
    }

    function registerEvents(videoDisplay) {
        var theodulVideodisplay = videojs(videoDisplay);
        Engage.on("Video:play", function() {
            theodulVideodisplay.play();
        });
        Engage.on("Video:pause", function() {
            theodulVideodisplay.pause();
        });
        Engage.on("Video:goFullscreen", function() {
            $("#" + videoDisplay).removeClass("vjs-controls-disabled").addClass("vjs-controls-enabled");
            theodulVideodisplay.requestFullScreen();
        });
        Engage.on("Video:cancelFullscreen", function() {
            $("#" + videoDisplay).removeClass("vjs-controls-enabled").addClass("vjs-controls-disabled");
            theodulVideodisplay.cancelFullScreen();
        });
        Engage.on("Video:setVolume", function(percentAsDecimal) {
            theodulVideodisplay.volume(percentAsDecimal);
        });
        Engage.on("Video:getVolume", function(callback) {
            callback(theodulVideodisplay.volume());
        });
        Engage.on("Slider:stop", function(time) {
            var duration = Engage.model.get("videoDataModel").get("duration");
            var normTime = (time / 1000) * (duration / 1000);
            theodulVideodisplay.currentTime(normTime);
        });
        theodulVideodisplay.on("timeupdate", function() {
            Engage.trigger("Video:timeupdate", theodulVideodisplay.currentTime());
        });
        theodulVideodisplay.on("volumechange", function() {
            Engage.trigger("Video:volumechange", theodulVideodisplay.volume());
        });
        theodulVideodisplay.on("fullscreenchange", function() {
            Engage.trigger("Video:fullscreenChange");
        });
        theodulVideodisplay.on("ended", function() {
            Engage.trigger("Video:ended");
            theodulVideodisplay.pause();
            theodulVideodisplay.currentTime(theodulVideodisplay.duration());
        });
    }

    function initPlugin() {
        // set path to swf player
        var videojs_swf = plugin.pluginPath + "/lib/videojs/video-js.swf";

        Engage.model.on("change:videoDataModel", function() {
            new VideoDataView(this.get("videoDataModel"), plugin.template, videojs_swf);
        });
        Engage.model.get("mediaPackage").on("change", function() {
            var mediaInfo = {};
            mediaInfo.tracks = this.get("tracks");
            mediaInfo.attachments = this.get("attachments");

            if ((mediaInfo.tracks.length > 0) && (mediaInfo.attachments.length > 0)) {
                var videoDisplays = [];
                var videoSources = [];
                videoSources.presenter = [];
                videoSources.presentation = [];

                // look for video source
                var duration = 0;
                if (mediaInfo.tracks) {
                    $(mediaInfo.tracks).each(function(i, track) {
                        if (track.mimetype
                                && track.type
                                && track.mimetype.match(/video/g)) {
                            // filter for different video sources
                            if (track.type.match(/presenter/g)) {
                                if (track.duration > duration) {
                                    duration = track.duration;
                                }
                                videoSources.presenter.push({
                                    src: track.url,
                                    type: track.mimetype,
                                    typemh: track.type
                                });
                            } else if (track.type.match(/presentation/g)) {
                                if (track.duration > duration) {
                                    duration = track.duration;
                                }
                                videoSources.presentation.push({
                                    src: track.url,
                                    type: track.mimetype,
                                    typemh: track.type
                                });
                            }
                        }
                    });
                }
                if (mediaInfo.attachments) {
                    $(mediaInfo.attachments).each(function(i, attachment) {
                        if (attachment.mimetype
                                && attachment.type
                                && attachment.mimetype.match(/image/g)
                                && attachment.type.match(/player/g)) {
                            // filter for different video sources
                            if (attachment.type.match(/presenter/g)) {
                                videoSources.presenter.poster = attachment.url;
                            }
                            if (attachment.type.match(/presentation/g)) {
                                videoSources.presentation.poster = attachment.url;
                            }
                        }
                    });
                }
                var i = 0;
                for (var v in videoSources) {
                    if (videoSources[v].length > 0) {
                        var name = videoDisplayNamePrefix.concat(i);
                        videoDisplays.push(name);
                    }
                    ++i;
                }
                Engage.model.set("videoDataModel", new VideoDataModel(videoDisplays, videoSources, duration));
            }
        });
    }

    // init Event
    Engage.log("Video:init");

    Engage.model.on("change:mediaPackage", function() { // listen on a change/set of the mediaPackage model
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
        }
    });

    // load video.js lib
    require(["./lib/videojs/video.js"], function(videojs) {
        Engage.log("Video: Load video.js done");
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
        }
    });

    // load synchronize lib
    require(["./lib/synchronize.js"], function(videojs) {
        Engage.log("Video: Load synchronize.js done");
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
        }
    });

    // all plugins loaded
    Engage.on("Core:plugin_load_done", function() {
        Engage.log("Video: Plugin load done");
        initCount -= 1;
        if (initCount === 0) {
            initPlugin();
        }
    });

    return plugin;
});
