/**
 * Created by tuanpa on 8/3/16.
 */
/*
 *    *    *    *    *    *
 ┬    ┬    ┬    ┬    ┬    ┬
 │    │    │    │    │    |
 │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
 │    │    │    │    └───── month (1 - 12)
 │    │    │    └────────── day of month (1 - 31)
 │    │    └─────────────── hour (0 - 23)
 │    └──────────────────── minute (0 - 59)
 └───────────────────────── second (0 - 59, OPTIONAL)
 */
console.log('Start cron');
process.env.TZ = 'Asia/Ho_Chi_Minh';
var schedule = require('node-schedule');
var Megalogger = require('megalogger');
var logger = new Megalogger({
    apiKey: "xHRuorBsKn12",
    source: "mega-scheduler"
});
var request = require('request');
var fs = require('fs');
var scheduleList = require('./schedule');

for (var i = 0; i < scheduleList.length; i++) {
    var scheduleInfo = scheduleList[i];
    schedule.scheduleJob(scheduleInfo.rule, function (scheduleInfo) {
        requestUrl(scheduleInfo.url);
    }.bind(null, scheduleInfo));
}

function requestUrl(url) {
    var requestParams = {
        uri: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        maxRedirects: 3
    };
    request(requestParams, function (error, response, body) {
        writeLog(requestParams.uri, response.statusCode, body, error);
    });
}

function writeLog(url, status, body, err) {
    var content = '\n';
    content += '\nURL: ' + url;
    content += '\nDate: ' + new Date();
    content += '\nStatus: ' + status;
    content += '\nBody: ' + body;
    if (err) {
        content += '\nError: ' + err;
    }
    content += '\n';
    fs.appendFile(__dirname + '/log.txt', content, 'utf8');
    logger.log({
        url: url,
        time: new Date(),
        status: status,
        body: body
    }, "info");
}

fs.watch(__dirname + '/schedule.js', {encoding: 'buffer'}, function (eventType, filename) {
    if (filename) {
        console.log('Stop cron');
        process.exit();
    }
});