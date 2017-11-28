
// import * as GTT from 'gdax-trading-toolkit';
// import { GDAXFeed } from "gdax-trading-toolkit/build/src/exchanges";
// import { StreamMessage, TradeMessage } from "gdax-trading-toolkit/build/src/core";

// /**
//  * This Demonstration program illustrates how one can pipe the GDAX message streams through filters to transform the
//  * data feed in a straightforward way.
//  *
//  * In this example, we make use of a FXService class (which provides Exchange rate data) and the ExchangeRateFilter
//  * to convert EUR and GBP prices to USD on the EUR and GBP books on the fly.
//  */

// const products = ['BTC-USD', 'ETH-USD', 'ETH-BTC', 'LTC-USD', 'LTC-BTC'];

// // Create a single logger instance to pass around
// const logger = GTT.utils.ConsoleLoggerFactory();
// const padfloat = GTT.utils.padfloat;

// GTT.Factories.GDAX.FeedFactory(logger, products).then((feed: GDAXFeed) => {
//     // Configure all message streams to use the same websocket feed
//     // Create the source message streams by creating a MessageStream for each product, using the same WS feed for each
//     const streams = products.map((product) => new GTT.Core.ProductFilter({ logger: logger, productId: product }));
//     const outStream = new Array(5);
//     outStream[0] = feed.pipe(streams[0]);
//     // The EUR and GBP stream get passed through an exchange rate filter to convert prices to USD equivalent
//     outStream[1] = feed.pipe(streams[1]);
//     outStream[2] = feed.pipe(streams[2]);
//     outStream[3] = feed.pipe(streams[3]);
//     outStream[4] = feed.pipe(streams[4]);

//     const latest = [-100000, -100000, -100000, -100000, -100000];
//     let latestETH_BTC = -100000;
//     let latestLTC_BTC = -100000;
//     for (let i = 0; i < latest.length; i++) {
//         outStream[i].on('data', (msg: StreamMessage) => {
//             if (msg.type === 'trade') {
//                 latest[i] = +(msg as TradeMessage).price;
//                 if (products[i] === 'ETH-BTC' || products[i] === 'LTC-BTC'){ // make everything relative to BTC-USD
//                   latest[i] = +(msg as TradeMessage).price * latest[products.indexOf('BTC-USD')];
//                   if (products[i] === 'ETH-BTC') {
//                     latestETH_BTC = +(msg as TradeMessage).price
//                   } else {
//                     latestLTC_BTC = +(msg as TradeMessage).price
//                   }
//                 }
//                 if (products[i] === 'BTC-USD'){ // make everything relative to BTC-USD
//                   latest[products.indexOf('ETH-BTC')] = latestETH_BTC * latest[i];
//                   latest[products.indexOf('LTC-BTC')] = latestLTC_BTC * latest[i];
//                 }
//                 // if (latest[0] + latest[1] + latest[2] < 0) {
//                 //     return;
//                 // }
//                 // printLatestPrices(latest);
//                 printUnderline(latest, i);
//                 // printUnderlineDiff(latest, i);
                
//             }
//             if(msg.type !== 'level' && msg.type !== 'myOrderPlaced' && msg.type !== 'tradeExecuted' && msg.type !== 'tradeFinalized' && msg.type !== 'trade' && msg.type !== 'snapshot' && msg.type !== 'ticker' && msg.type !== 'unknown'){
//               console.log('Message Type: ' + msg.type)
//             }
//             // if (msg.type === 'level') {
//             //   latest[i] = +(msg as TradeMessage).price;
//             // }
          
//         });
//     }
// });

// function printLatestPrices(prices: number[]) {
//     // const cur = ['BTC-USD', 'ETH-BTC', 'LTC-BTC'];
//     const pstr = products.map((c, i) => `${c} ${padfloat(prices[i], 6, 6)}`);
//     const msg = pstr.join('  |  ');
//     console.log(msg);
// }

// function printUnderline(prices: number[], changeIndex: number) {

//   const pstr = products.map((c, i) => `${c}${i === changeIndex ? "\x1b[36m" : ""} ${padfloat(prices[i], 6, 6)} ${i === changeIndex ? "\x1b[0m" : ""}`);
//     const msg = pstr.join(' | ');
//     console.log(msg);
// }

// function printUnderlineDiff(prices: number[], changeIndex: number) {
// prices[products.indexOf('ETH-BTC')] = prices[products.indexOf('ETH-USD')] - prices[products.indexOf('ETH-USD')];
// prices[products.indexOf('LTC-BTC')] = prices[products.indexOf('LTC-USD')] - prices[products.indexOf('LTC-USD')];

//   const pstr = products.map((c, i) => `${c}${i === changeIndex ? "\x1b[36m" : ""} ${padfloat(prices[i], 6, 6)} ${i === changeIndex ? "\x1b[0m" : ""}`);
//     const msg = pstr.join(' | ');
//     console.log(msg);
// }