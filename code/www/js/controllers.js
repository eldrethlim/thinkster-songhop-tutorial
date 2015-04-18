angular.module('songhop.controllers', ['ionic', 'songhop.services'])

/*
Controller for the splash page
*/
.controller('SplashCtrl', function($scope, $state, User) {
  // Signup/login via User.auth
  $scope.submitForm = function(username, signingUp) {
    User.auth(username, signingUp).then(function() { 
      // Redirect to discover page after setting session
      $state.go('tab.discover');

    }, function() {
      // Error handler
      alert("Hmm, something went wrong! Try another username");

    });
  }
})

/*
Controller for the discover page
*/
.controller('DiscoverCtrl', function($scope, $timeout, $ionicLoading, User, Recommendations) {
  // Helper functions for loading
  var showLoading = function() {
    $ionicLoading.show({
      template: '<i class="ion-loading-c"></i>',
      noBackdrop: true
    });
  }

  var hideLoading = function() {
    $ionicLoading.hide();
  }

  // Set loading to true the first time we retrieve songs from the server.
  showLoading();

  // Get out first songs
  Recommendations.init()
    .then(function(){
      $scope.currentSong = Recommendations.queue[0];
            
      return Recommendations.playCurrentSong();
    })
    .then(function(){
      hideLoading();
      // turn loading off
      $scope.currentSong.loaded = true;
    });

  // Cache image of the next album
  $scope.nextAlbumImg = function() {
    if (Recommendations.queue.length > 1) {
      return Recommendations.queue[1].image_large;
    }

    return '';
  }

  // Skip or favourite songs
  $scope.sendFeedback = function(bool) {

    // Firstly, add to favourites if they favourited
    if (bool) User.addSongToFavourites($scope.currentSong);

    // Set variable for the correct animation sequence
    $scope.currentSong.rated = bool;
    $scope.currentSong.hide = true;

    // Prepare next song
    Recommendations.nextSong();

    $timeout(function() {
      // Timeout to allow animation to complete
      $scope.currentSong = Recommendations.queue[0];
      $scope.currentSong.loaded = false;
    }, 250);

    Recommendations.playCurrentSong().then(function() {
      $scope.currentSong.loaded = true;
    });
  }
})

/*
Controller for the favorites page
*/
.controller('FavoritesCtrl', function($scope, User, $window) {

  $scope.username = User.username;

  $scope.openSong = function(song) {
    $window.open(song.open_url, "_system");
  }

  $scope.favourites = User.favourites;

  $scope.removeSong = function(song, index) {
    User.removeSongFromFavourites(song, index);
  };
})

/*
Controller for our tab bar
*/
.controller('TabsCtrl', function($scope, Recommendations, User) {
  $scope.favCount = User.favouriteCount;

  $scope.enteringFavourites = function() {
    // Reset new favourites to 0 when we enter favourites tab.
    User.newFavourites = 0;
    Recommendations.haltAudio();
  }

  $scope.leavingFavourites = function() {
    Recommendations.init();
  }

  $scope.logout = function() {
    User.destroySession();

    // Redirection is used to remove cached items
    $window.location.href = 'index.html';
  }
});