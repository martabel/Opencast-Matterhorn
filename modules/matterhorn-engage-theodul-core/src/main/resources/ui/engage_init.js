/*global requirejs*/
requirejs.config({
  baseUrl: 'js/lib',
  paths: {
    engage: '../engage',
    plugins: '/engage/plugin/*/static'
  },
  shim: {
    'backbone': {
      //script dependencies
      deps: ['underscore', 'jquery'],
      //global variable
      exports: 'Backbone'
    },
    'underscore': {
      //global variable
      exports: '_'
    }
  }
});

//start core logic
require(["engage/engage_core"]);