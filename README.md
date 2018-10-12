# mega-schedule
sSheduler for MegaAds

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


# Adonis fullstack application

This is the fullstack boilerplate for AdonisJs, it comes pre-configured with.

1. Bodyparser
2. Session
3. Authentication
4. Web security middleware
5. CORS
6. Edge template engine
7. Lucid ORM
8. Migrations and seeds

## Setup

Use the adonis command to install the blueprint

```bash
adonis new yardstick
```

or manually clone the repo and then run `npm install`.


### Migrations

Run the following command to run startup migrations.

```js
adonis migration:run
```
