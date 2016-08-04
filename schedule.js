/**
 * Created by tuanpa on 8/4/16.
 */
module.exports  = [
    {rule: '1 * * * * *', url: 'http://warehouse.net/service/product/suggestions'},
    {rule: '2 * * * * *', url: 'http://warehouse.net/service/crm/cron-tickets'},
    {rule: '3 * * * * *', url: 'http://warehouse.net/service/inoutput/cron-delivery-time-shipping'},
    {rule: '4 * * * * *', url: 'http://warehouse.net/service/forecast/buildreport'},
    {rule: '5 * * * * *', url: 'http://warehouse.net/service/inoutput/cron-delivery'},
    {rule: '* /2 * * * *', url: 'http://warehouse.net/service/forecast/cronReport'}
];