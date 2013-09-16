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
	var PLUGIN_NAME = "Description";
	var PLUGIN_TYPE = "engage_tab";
	var PLUGIN_VERSION = "0.1";
	var PLUGIN_TEMPLATE = "template.html";
	var PLUGIN_STYLES = ["style.css"];
	
	//Init Event
    Engage.log("Tab:Description: init");
    
    //Load other needed JS stuff with Require
    //require(["./js/bootstrap/js/bootstrap.js"]);
    //require(["./js/jqueryui/jquery-ui.min.js"]);	
    
    //All plugins loaded lets do some stuff
    Engage.on("Core:plugin_load_done", function() {
    	
    	Engage.log("Tab:Description: receive plugin load done");
	    
    });
   
    return {
		name: PLUGIN_NAME,
		type: PLUGIN_TYPE,
		version: PLUGIN_VERSION,
		styles: PLUGIN_STYLES,
		template: PLUGIN_TEMPLATE
	}
});