/**
 * Created by nelso on 12/3/2016.
 */

var request = require('request-promise');
// const promisify = require('promisify-node');
var cheerio = require('cheerio');
var xml2js = require('xml2js').parseString;
require('dotenv').config({
    path: '../.env'
});
var AlchemyLanguageV1 = require('watson-developer-cloud/alchemy-language/v1');
var alchemy_language = new AlchemyLanguageV1({
    api_key: process.env.WATSON_ALCHEMY_API_KEY
});

request.get('https://www.gpo.gov/fdsys/bulkdata/BILLSTATUS/114/sres').then(function(res) {
    var $ = cheerio.load(res);
    var dataReq = request.defaults({
        baseUrl: 'https://www.gpo.gov/fdsys',
        method: 'get'
    });

    var urls = [];
    $('div#bulkdata > table > tr').each(function(i, elem)    {
        const data = $(elem).children('td').first().children('a').first().attr('href');
        if(typeof data != 'string') return;
        urls.push(
            dataReq(data)
        );
    });

    return Promise.all(urls);
}).then(data => {
    const out = [];
    for(let bill of data) {
        const promise = new Promise((resolve, reject) => {
            xml2js(bill, (err, res) => {
                if(err) return reject();
                // console.log('a');
                resolve(res);
            });
        });
        out.push(promise);
    }
    return Promise.all(out.map(p => p.catch(e => void e)));
}).then(json => {
    const out = [];
    for(const bill of json) {
        if(!bill) continue;
        // console.log(bill.billStatus.bill[0].summaries[0].billSummaries[0]);
        if(!bill.billStatus.bill[0].summaries[0].billSummaries[0]) continue;
        const summ = bill.billStatus.bill[0].summaries[0].billSummaries[0].item[0].text[0].replace(/<[a-z\/]*>/g, '');
        const promise = new Promise((resolve, reject) => {
            alchemy_language.keywords({
                outputMode: 'text',
                emotion: false,
                sentiment: false,
                text: summ
            }, (err, res) =>  {
                if(err) return reject();
                resolve(res);
            })
        });
        promise.catch(console.error);
        out.push(promise);
    }
    // console.log(out);
    return Promise.all(out.map(p => p.catch(e => void e)));
}).then(data => {
    // console.log(data);
}).catch(console.error);

return;

var params = {
    text: 'IBM Watson won the Jeopardy television show hosted by Alex Trebek'
};

alchemy_language.sentiment(params, function (err, response) {
    if (err)
        console.log('error:', err);
    else
        console.log(JSON.stringify(response, null, 2));
});