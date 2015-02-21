var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId : 'cfca3e9193f84b519dcd5835dc346652',
  clientSecret : process.env.SPOTIFY_ID,
  redirectUri : 'http://localhost:8888/callback'
});

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();
app.use(express.static(__dirname + '/public'))
   .use(cookieParser());
app.set('views', __dirname + '/public');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.get('/test', function(req, res){
  res.render('test.html',
    {text: "New test"}
  );
});

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  // your application requests authorization
  var scope = ['user-read-private', 'user-read-email', 'playlist-modify-public',
  		'user-follow-modify', 'user-follow-read'
  	];
  var authorizeURL = spotifyApi.createAuthorizeURL(scope, state);
  res.redirect(authorizeURL);
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);

	spotifyApi.authorizationCodeGrant(code)
  		.then(function(data) {
	    console.log('The token expires in ' + data['expires_in']);
	    console.log('The access token is ' + data['access_token']);
	    console.log('The refresh token is ' + data['refresh_token']);

	    // Set the access token on the API object to use it in later calls
	    spotifyApi.setAccessToken(data['access_token']);
		spotifyApi.setRefreshToken(data['refresh_token']);
		res.redirect('/#' +
          querystring.stringify({
            access_token: spotifyApi.getAccessToken(),
            refresh_token: spotifyApi.getRefreshToken()
          }));
	}, function(err) {
	  res.redirect('/#' +
	    querystring.stringify({
	      error: err
	    }));
	});
  }
});

app.get('/refresh_token', function(req, res) {
  // requesting access token from refresh token
  spotifyApi.refreshAccessToken()
  .then(function(data) {
     res.send({
        'access_token': spotifyApi.getAccessToken()
      });
  }, function(err) {
    console.log('Could not refresh access token', err);
  });
});

console.log('Listening on 8888');
app.listen(8888);

