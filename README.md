# mega-schedule
scheduler for MegaAds
##Usage
Example config in schedule.js
```javascript
module.exports  = [
    {rule: '1 * * * * *', url: 'http://my-website/service/product/suggestions'},
    {rule: '2 * * * * *', url: 'http://my-website/service/crm/cron-tickets'},
    {rule: '3 * * * * *', url: 'http://my-website/service/inoutput/cron-delivery-time-shipping'},
    {rule: '4 * * * * *', url: 'http://my-website/service/forecast/buildreport'},
    {rule: '5 * * * * *', url: 'http://my-website/service/inoutput/cron-delivery'},
    {rule: '* /2 * * * *', url: 'http://my-website/service/forecast/cronReport'}
];
```

