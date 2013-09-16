/*global requirejs*/
requirejs.config({
  baseUrl: 'src/js/lib',
  paths: {
    require: 'require',
    jquery: 'jquery',
    underscore: 'underscore',
    backbone: 'backbone',
    engage: '../engage',
    plugins: '../engage/plugin/*/static'
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

// beforeEach(function() {
//   this.addMatchers({
//     toBePlaying: function(expectedSong) {
//       var player = this.actual;
//       return player.currentlyPlayingSong === expectedSong &&
//              player.isPlaying;
//     }
//   });
// });
