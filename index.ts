import * as GTT from "gdax-trading-toolkit";
import { Big } from "gdax-trading-toolkit/build/src/lib/types";
import { GDAX_WS_FEED, GDAXFeed, GDAXFeedConfig } from "gdax-trading-toolkit/build/src/exchanges";
import { GDAX_API_URL } from "gdax-trading-toolkit/build/src/exchanges/gdax/GDAXExchangeAPI";
import { PlaceOrderMessage, TickerMessage, StreamMessage, TradeMessage, OrderbookMessage } from 'gdax-trading-toolkit/build/src/core';

// import { TickerMessage } from "gdax-trading-toolkit/build/src/core";
import { LiveOrder } from "gdax-trading-toolkit/build/src/lib";
import { TraderConfig, Trader } from './gdax-tt/src/core/Trader';
import { TradeExecutedMessage, TradeFinalizedMessage } from './gdax-tt/src/core/Messages';

const logger = GTT.utils.ConsoleLoggerFactory();
// const pusher = new GTT.utils.PushBullet(process.env.PUSHBULLET_KEY);
// const deviceID = process.env.PUSHBULLET_DEVICE_ID;
const product = 'ETH-USD';
let counter = 0;
let orders = ['0'];
/**
 * Remember to set GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars to allow trading
 */

// const gdaxAPI = GTT.Factories.GDAX.DefaultAPI(logger);
// const [base, quote] = product.split('-');
const spread = Big('0.07');

const options: GDAXFeedConfig = {
    logger: logger,
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    },
        channels: ['ticker'],
    wsUrl: GDAX_WS_FEED,
    apiUrl: GDAX_API_URL
};

// const gdaxConfig: GDAXConfig = {
//     logger: logger,
//     apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
//     auth: {
//         key: process.env.GDAX_KEY,
//         secret: process.env.GDAX_SECRET,
//         passphrase: process.env.GDAX_PASSPHRASE
//     }
// };


GTT.Factories.GDAX.FeedFactory(logger, [product]).then((feed: GDAXFeed) => {
    feed.on('data', (msg: OrderbookMessage) => {
        console.log("outstream data")
            if (msg.type === 'trade') {
                let latest = +(msg as TradeMessage).price;
                if (latest < 0) {
                    return;
                }
                console.log(latest);
            }
    });
}).catch((err: Error) => {
    logger.log('error', err.message);
    process.exit(1);
});
GTT.Factories.GDAX.getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {

  const traderConfig: TraderConfig = {
      logger: logger,
      productId: product,
      exchangeAPI: feed.authenticatedAPI,
      fitOrders: false
  };
  const trader = new Trader(traderConfig);

  trader.on('Trader.outOfSyncWarning', (msg: LiveOrder) => {
    logger.log('info', 'outOfSyncWarning ', JSON.stringify(msg));
  });

  trader.on('Trader.all-orders-cancelled', (msg: LiveOrder) => {
    logger.log('info', 'all-orders-cancelled ', JSON.stringify(msg));
  });
  
  trader.on('Trader.order-cancelled', (msg: LiveOrder) => {
    logger.log('info', 'order-cancelled ', JSON.stringify(msg));
  });

  trader.on('Trader.order-placed', (msg: LiveOrder) => {
    logger.log('info', 'Order placed ', JSON.stringify(msg));
  });

  trader.on('Trader.place-order-failed', (msg: LiveOrder) => {
    logger.log('info', 'Order placed failed ', JSON.stringify(msg));
    console.log(msg);
  });

  trader.on('Trader.cancel-order-failed', (msg: LiveOrder) => {
    logger.log('info', 'Order cancel failed ', JSON.stringify(msg));
  });

  trader.on('Trader.trade-executed', (msg: TradeExecutedMessage) => {
      logger.log('info', 'Trade executed ', JSON.stringify(msg));
  });

  trader.on('Trader.trade-finalized', (msg: TradeFinalizedMessage) => {
    logger.log('info', 'Order complete ', JSON.stringify(msg));
  });

  trader.on('Trader.my-orders-cancelled', (ids: string[]) => {
    logger.log('info', `${ids.length} orders cancelled`);
  });

  trader.on('error', (err: Error) => {
    logger.log('error', 'Error cancelling orders', err);
  });

  let outStream = feed.pipe(trader);

  outStream.on('data', (msg: StreamMessage) => {
    console.log("outstream data")
            if (msg.type === 'trade') {
                let latest = +(msg as TradeMessage).price;
                if (latest < 0) {
                    return;
                }
                console.log(latest);
            }
        });

  // Send the order once the feed has initialised
  feed.once('snapshot', () => {
    console.log('once snapshot ---------------------------------------------------------------------------------');

      // const order = orderMessage('buy', '54.42');
      // trader.executeMessage(order);
    // let order = orderMessage('buy', '0.01');
    // trader.executeMessage(order);
  });

  // GTT.Core.createTickerTrigger(feed, product)
  //     .setAction((ticker: TickerMessage) => {
  //       const currentPrice = ticker.price;
  //       let price = '' + currentPrice.minus(100)
  //       let order = orderMessage('buy', product, '0.01', price);
  //       trader.executeMessage(order);
  //       console.log(GTT.utils.printTicker(ticker, 3));
  //     });


  // GTT.Core.createTickerTrigger(feed, product, false)
  //     .setAction((ticker: TickerMessage) => {
  //         // console.log(GTT.utils.printTicker(ticker, 3));
  //     });

  GTT.Core.createTickerTrigger(feed, product, false)
        .setAction((ticker: TickerMessage) => {
          const currentPrice = ticker.price;
          let price = '' + currentPrice.minus(spread)
          // let price2 = '' + currentPrice.plus(spread)

          if ( counter <= 150 && orders.indexOf('' + currentPrice) < 0 ){
            console.log(orders);
            counter++;
            console.log(counter);
            let order = orderMessage('buy', product, '0.01', price);
            // let order2 = orderMessage('sell', product, '0.01', price2);
            orders.push('' + currentPrice)
            trader.executeMessage(order);
            // trader.executeMessage(order2);
          }

        });
});

function orderMessage(side: string, product: string, amount: string, price: string) {
  console.log('Orders Up: '+ side + ': ' + price);
  const order: PlaceOrderMessage = {
      time: null,
      type: 'placeOrder',
      productId: product,
      size: amount,
      price: price,
      side: side,
      orderType: 'limit',
      postOnly: true
    };
  return order;
}

// function submitTrade(side: string, amount: string) {
//     const order: PlaceOrderMessage = {
//         type: 'order',
//         time: null,
//         productId: product,
//         orderType: 'market',
//         side: side,
//         size: amount
//     };
//     gdaxAPI.placeOrder(order).then((result: LiveOrder) => {
//         pushMessage('Order executed', `Order to ${order.side} 0.1 ${base} placed. Result: ${result.status}`);
//     });
// }

// function pushMessage(title: string, msg: string): void {
//     pusher.note(deviceID, title, msg, (err: Error, res: any) => {
//         if (err) {
//             logger.log('error', 'Push message failed', err);
//             return;
//         }
//         logger.log('info', 'Push message result', res);
//     });
// }
