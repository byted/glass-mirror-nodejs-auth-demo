/**
 * Module dependencies.
 */

var express = require('express')
    , http = require('http')
    , googleapis = require('googleapis')
    , OAuth2Client = googleapis.OAuth2Client;

// Use environment variables to configure oauth client.
// That way, you never need to ship these values, or worry
// about accidentally committing them
var oauth2Client = new OAuth2Client(process.env.MIRROR_DEMO_CLIENT_ID,
    process.env.MIRROR_DEMO_CLIENT_SECRET, process.env.MIRROR_DEMO_REDIRECT_URL);

var app = express();

// all environments
app.set('port', process.env.PORT);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var success = function (data) {
    console.log('success', data);
};
var failure = function (data) {
    console.log('failure', data);
};
var gotToken = function () {
    googleapis
        .discover('mirror', 'v1')
        .execute(function (err, client) {
            if (!!err) {
                failure();
                return;
            }
            console.log('mirror client', client);
            // listTimeline(client, failure, success);
            // insertHello(client, failure, success);
            //insertContact(client, failure, success);
            // insertLocation(client, failure, success);
            // getLocation(client, failure, success);
            getContact(client, failure, success);
        });
};

// send a simple 'hello world' timeline insert card with a reply and delete options
var insertHello = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": "Hello world",
            "html": "<article><section><img height='100%' src='https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Cheese_crust_pizza.jpg/1920px-Cheese_crust_pizza.jpg'></section></article>",
            "callbackUrl": "https://mirrornotifications.appspot.com/forward?url=http://localhost:8080/reply",
            "menuItems": [
                {"action": "REPLY"},
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

// send a simple "Let's meet at the Hacker Dojo!" message timeline insert card with a nested property of "location" showing the associated GPS location associated with the "location". Navigate, Reply, and Delete options.
var insertLocation = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": "Let's meet at the Hacker Dojo!",
            "callbackUrl": "https://mirrornotifications.appspot.com/forward?url=http://localhost:8080/reply",
            "location": {
                "kind": "mirror#location",
                "latitude": 37.4028344,
                "longitude": -122.0496017,
                "displayName": "Hacker Dojo",
                "address": "599 Fairchild Dr, Mountain View, CA"
            },
            "menuItems": [
                {"action":"NAVIGATE"},
                {"action": "REPLY"},
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

//inserts a contact and icon for that contact
var insertContact = function (contactObj, client, errorCallback, successCallback) {
    client
        .mirror.contacts.insert(contactObj)
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

var getContact = function (client, errorCallback, successCallback) {
    client
        .mirror.contacts.get({"id": "emil10001"})
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};
var listTimeline = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.list()
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

// make GET request for latest GPS coordinates
var getLocation = function (client, errorCallback, successCallback) {
    client
        .mirror.locations.get(
        {
            "id": "latest"
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

var grabToken = function (code, errorCallback, successCallback) {
    oauth2Client.getToken(code, function (err, tokens) {
        if (!!err) {
            errorCallback(err);
        } else {
            console.log('tokens', tokens);
            oauth2Client.credentials = tokens;
            successCallback();
        }
    });
};

var authenticate = function(res) {
    // generates a url that allows offline access and asks permissions
    // for Mirror API scope.
    
    var scopes = [
      'https://www.googleapis.com/auth/glass.timeline',
      'https://www.googleapis.com/auth/glass.location'
    ];
    
    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes.join(" ")
    });
    res.redirect(url);
}

app.get('/', function (req, res) {
    if (!oauth2Client.credentials) {
        // generates a url that allows offline access and asks permissions
        // for Mirror API scope.
        
        var scopes = [
          'https://www.googleapis.com/auth/glass.timeline',
          'https://www.googleapis.com/auth/glass.location'
        ];
        
        var url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(" ")
        });
        res.redirect(url);
    } else {
        gotToken();
    }
    res.write('Glass Mirror API with Node');
    res.end();

});
app.get('/oauth2callback', function (req, res) {
    // if we're able to grab the token, redirect the user back to the main page
    grabToken(req.query.code, failure, function () {
        res.redirect('/');
    });
});
app.post('/reply', function(req, res){
    console.log('replied',req.body);
    res.end();
});
app.post('/location', function(req, res){
    console.log('location',req);
    res.end();
});
app.post('/contact', function(req, res) {
    if (!oauth2Client.credentials) {
        authenticate(res);
    } else {
        console.log('send contact');
        googleapis
            .discover('mirror', 'v1')
            .execute(function (err, client) {
                if (!!err) {
                    failure();
                    return;
                }
                insertContact(req.body, client, function(data) {
                    res.end(JSON.stringify(data));
                    failure(data);
                }, function(data) {
                    console.log("added contact:");
                    res.end(JSON.stringify(data));
                    success(data)
                });
            });
    }
});

app.post

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
