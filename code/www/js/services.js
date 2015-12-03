angular.module('songhop.services', ['ionic.utils'])

.factory('Recommendations', function($http, $q, SERVER) {
  var media;
  var o = {
    queue: []
  };

  o.init = function() {
    if (o.queue.length === 0) {
      // if there's nothing in queue, fill it
      return o.getNextSongs();
    } else {
      return o.playCurrentSong();
    }
  }

  o.getNextSongs = function() {
    return $http({
      method: 'GET',
      url: SERVER.url + '/recommendations'
    }).success(function(data) {
      o.queue = o.queue.concat(data);
    });
  }

  o.nextSong = function() {
    // pop the index 0 off
    o.queue.shift();

    // end song
    o.haltAudio();

    // refills array if song queue is low
    if (o.queue.length <= 3) {
      o.getNextSongs();
    }
  }

  o.playCurrentSong = function() {
    var defer = $q.defer();

    // play the current song's preview
    media = new Audio(o.queue[0].preview_url);

    // when song is loaded, resolve the promise to let the controller know.
    media.addEventListener("loadeddata", function() {
      defer.resolve();
    });

    media.play();

    return defer.promise;
  }

  o.haltAudio = function() {
    if (media) media.pause();
  }

  return o;
})

.factory('User', function($http, SERVER, $q, $localstorage) {

  var o = {
    username: false,
    session_id: false,
    favorites: [],
    newFavorites: 0 
  }

  // Authentication
  o.auth = function(username, signingUp) {
    var authRoute;

    if (signingUp) {
      authRoute = 'signup';
    } else {
      authRoute = 'login';
    }

  return $http.post(SERVER.url + '/' + authRoute, { username: username }).
    success(function(data) {
      debugger
      o.setSession(data.username, data.session_id, data.favorites);
    });
  }

  // Set session data
  o.setSession = function(username, session_id, favorites) {
    if (username) o.username = username;
    if (session_id) o.session_id = session_id;
    if (favorites) o.favorites = favorites;

    // Set data in
    $localstorage.setObject('user', { username: username, session_id: session_id });
  }
  // Check session data
  o.checkSession = function() {
    var defer = $q.defer();

    if (o.session_id) {
      // If this session is already initialized in the service
      defer.resolve(true);
    } else {
      // Detect if there's a session in localstorage from previous use.
      // If there is one, pull into our service
      var user = $localstorage.getObject('user');

      if (user.username) {
        // If there's a user, lets grab their favorites from the server
        o.setSession(user.username, user.session_id);
        o.populateFavorites().then(function() {
          defer.resolve(true);
        });
      } else {
        // No user info in localstorage, reject
        defer.resolve(false);
      }
    }

    return defer.promise;
  }

  // Wipe out session data
  o.destroySession = function() {
    $localstorage.setObject('user', {});
    o.username = false;
    o.session_id = false;
    o.favorites = [];
    o.newFavorites = 0;
  }

  o.addSongToFavorites = function(song) {
    // make sure there's a song to add
    if (!song) return false;

    // add to favorites array
    o.favorites.unshift(song);
    o.newFavorites++;

    // persist song favoriting to server
    return $http.post(SERVER.url + '/favorites', { session_id: o.session_id, song_id: song.song_id });
  }

  o.removeSongFromFavorites = function(song,index) {
    // make sure there's a song to remove
    if (!song) return false;

    // remove from favorites array
    o.favorites.splice(index, 1);

    // persist song unfavoriting to server
    return $http({
      method: 'DELETE',
      url: SERVER.url + '/favorites',
      params: { session_id: o.session_id, song_id: song.song_id }
    });
  }

  o.populateFavorites = function() {
    return $http({
      method: 'GET',
      url: SERVER.url + '/favorites',
      params: { session_id: o.session_id }
    }).success(function(data) {
      // merge data into the queue
      o.favorites = data;
    });
  }

  o.favoriteCount = function() {
    return o.newFavorites;
  }

  return o;
});
