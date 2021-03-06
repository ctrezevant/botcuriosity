var twit = require('twit');
var base64 = require('node-base64-image');
var cron = require('cron').CronJob;
var http = require('http');
var https = require('https');
var CONFIG = require('./curiositybot-config.js');

var client = new twit(CONFIG.TWITTER_API_KEYS);
console.info('CURBOT_INFO: Starting ' + CONFIG.TWITTER_URL + ' on ' + CONFIG.IP + ':' + CONFIG.PORT);

function tweetPhoto(link) {
    base64.encode(link, { string: true }, function(err, image) {
        client.post('media/upload', { media: image }, function(err, media, res) {
            if (!err) {
                client.post('statuses/update', { media_ids: media.media_id_string });
            } else {
                console.err(JSON.stringify(res));
            }
        });
    });
}

function checkForImage() {
    var api_link = 'https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?earth_date=' + getDate() + '&api_key=' + CONFIG.API_KEY;

    https.get(api_link, function(res) {
        var api_data = '';
        res.on('data', function(c) { api_data += c; });

        res.on('end', function() {
            try {
                api_data = JSON.parse(api_data);
            } catch (e) {
                return;
            }

            if (!("error" in api_data) && api_data.photos.length > 0){
                var filteredPhotos = api_data.photos.filter(photoFilter);
                tweetPhoto(getRandom(filteredPhotos).img_src);
            } else {
              console.log('No photos for '+getDate()+'.');
            }
        });
    });
}

function getDate() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + (d.getDate() > 3 ? (d.getDate()-3) : d.getDate());
}

function photoFilter(i){
    return CONFIG.CAM_BLACKLIST.indexOf(i.camera.name) == -1;
}

function getRandom(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

var sched = new cron({
    cronTime: CONFIG.CRON.TIME,
    onTick: function() {
        checkForImage();
    },
    start: false,
    timeZone: CONFIG.CRON.TIMEZONE
});

sched.start();
checkForImage();

// HTTP requests made to the application's external URL will redirect to the bot's twitter profile.
http.createServer(function(req, res) {
    res.writeHead(301, {
        Location: CONFIG.TWITTER_URL
    });
    res.end();
}).listen(CONFIG.PORT, CONFIG.IP);
