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
    favourites: [],
    newFavourites: 0 
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
      o.setSession(data.username, data.session_id, data.favourites);
    });
  }

  // Set session data
  o.setSession = function(username, session_id, favourites) {
    if (username) o.username = username;
    if (session_id) o.session_id = session_id;
    if (favourites) o.favourites = favourites;

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
        // If there's a user, lets grab their favourites from the server
        o.setSession(user.username, user.session_id);
        o.populateFavourites().then(function() {
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
    o.favourites = [];
    o.newFavourites = 0;
  }

  o.addSongToFavourites = function(song) {
    // make sure there's a song to add
    if (!song) return false;

    // add to favourites array
    o.favourites.unshift(song);
    o.newFavourites++;

    // persist song favouriting to server
    return $http.post(SERVER.url + '/favorites', { session_id: o.session_id, song_id: song.song_id });
  }

  o.removeSongFromFavourites = function(song,index) {
    // make sure there's a song to remove
    if (!song) return false;

    // remove from favourites array
    o.favourites.splice(index, 1);

    // persist song unfavouriting to server
    return $http({
      method: 'DELETE',
      url: SERVER.url + '/favorites',
      params: { session_id: o.session_id, song_id: song.song_id }
    });
  }

  o.populateFavourites = function() {
    return $http({
      method: 'GET',
      url: SERVER.url + '/favorites',
      params: { session_id: o.session_id }
    }).success(function(data) {
      // merge data into the queue
      o.favourites = data;
    });
  }

  o.favouriteCount = function() {
    return o.newFavourites;
  }

  return o;
});
