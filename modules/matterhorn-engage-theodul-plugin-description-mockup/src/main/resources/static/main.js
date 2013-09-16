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
define(['require', 'jquery', 'underscore', 'backbone', 'engage/engage_core'], function (require, $, _, Backbone, Engage) {
  //
  "use strict"; // strict mode in all our application
  //
	var PLUGIN_NAME = "Basic Engage Description";
	var PLUGIN_TYPE = "engage_description";
	var PLUGIN_VERSION = "0.1";
	var PLUGIN_TEMPLATE = "template.html";
	var PLUGIN_STYLES = [ "style.css" ];
	
	//privates
	var initCount = 2; //wait for two inits, moment lib and plugin load done
	
	//functions
	function initPlugin() {
    // Get media infos from the Endpoint plugin
    Engage.trigger("MhConnection:getMediaInfo", function (mediaInfo) {
      //insert titel
      $("#engage_basic_description_title").html(mediaInfo.title);
      //parse date and insert infos
      var dateString = moment(mediaInfo.date).format("MMMM Do YYYY");
      $("#engage_basic_description_info").html(mediaInfo.creator + ", " + dateString);
    });
	  
	}
	
	//inits
	Engage.log("Description: init");
  // Load moment.js lib
  require([ "./lib/moment.min.js" ], function (momentjs) {
    Engage.log("Description: load moment.min.js done");
    initCount -= 1;
    if (initCount === 0) {
      initPlugin();
    }
  });
  //All plugins loaded
  Engage.on("Core:plugin_load_done", function () {
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