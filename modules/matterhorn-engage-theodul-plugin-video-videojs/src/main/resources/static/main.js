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
define(['require', 'jquery', 'underscore', 'backbone', 'engage/engage_core'], function (require, $, _, Backbone, Engage) {
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
    ],
    //
    videodisplay,
    videoOptions = {
      "controls" : false,
      "autoplay" : false,
      "preload" : "auto",
      "width" : 640,
      "height" : 480
    },
    initCount = 2,
    videoSources = [],
    videoPoster;

  function initVideojs() {
    //insert video tag
    $("#videojs_wrapper").html('<video id="videojs_videodisplay" class="video-js vjs-default-skin container"</video>');
    // set sources

    var sourceHTML = "";
    $(videoSources).each(function (index, source) {
      sourceHTML = sourceHTML + '<source src="' + source.src + '" type="' + source.type + '" />';
    });
    $("#videojs_videodisplay").html(sourceHTML);

    // set poster attribute
    $("#videojs_videodisplay").attr("poster", videoPoster);
    // init videoJS

    videojs("videojs_videodisplay", videoOptions, function () {

      var theodulVideodisplay = this;
      // set sources
      //theodulVideodisplay.src = videoSources;

      Engage.on("Video:play", function () {
        theodulVideodisplay.play();
      });
      Engage.on("Video:stop", function () {
        theodulVideodisplay.stop();
      });
      Engage.on("Video:pause", function () {
        theodulVideodisplay.pause();
      });
      Engage.on("Video:goFullscreen", function () {
        theodulVideodisplay.requestFullScreen();
      });
      Engage.on("Video:cancelFullscreen", function () {
        theodulVideodisplay.cancelFullScreen();
      });
      Engage.on("Video:setVolumne", function (percentAsDecimal) {
        theodulVideodisplay.volume(percentAsDecimal);
      });
      Engage.on("Video:getVolumne", function (callback) {
        callback(theodulVideodisplay.volume());
      }); 
      theodulVideodisplay.on("timeupdate", function () {
        Engage.trigger("Video:timeupdate", theodulVideodisplay.currentTime());
      });
      theodulVideodisplay.on("volumechange", function () {
        Engage.trigger("Video:volumechange", theodulVideodisplay.volume());
      });

    });

  }

  function initPlugin() {
    // Get media infos from the Endpoint plugin
    Engage.trigger("MhConnection:getMediaInfo", function (mediaInfo) {
      Engage.log(mediaInfo);
      // look for video source
      $(mediaInfo.tracks).each(function (index, track) {
        if (track.mimetype === "video/x-flv" && track.type.match(/presentation/g)) {
          videoSources.push({
            src : track.url,
            // type: track.type
            type : "video/flv"
          });
        }
      });
      // look for a preview pic
      $(mediaInfo.attachments).each(function (index, attachment) {
        if (attachment.type.match(/player\+preview/g) && attachment.type.match(/presentation/g)) {
          videoPoster = attachment.url;
        }
      });
      // init VideoJS object
      initVideojs();
    });
  }
  // Init Event
  Engage.log("Video:init");

  // Load videojs lib
  require([ "./lib/videojs/video.js" ], function (videojs) {
    Engage.log("Video: load video.js done");
    initCount -= 1;
    if (initCount === 0) {
      initPlugin();
    }
  });

  // All plugins loaded lets do some stuff
  Engage.on("Core:plugin_load_done", function () {
    Engage.log("Video: receive plugin load done");
    initCount -= 1;
    if (initCount === 0) {
      initPlugin();
    }
  });

  return {
    name : PLUGIN_NAME,
    type : PLUGIN_TYPE,
    version : PLUGIN_VERSION,
    styles : PLUGIN_STYLES,
    template : PLUGIN_TEMPLATE
  };
});