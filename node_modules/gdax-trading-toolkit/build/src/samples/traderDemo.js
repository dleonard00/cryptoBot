"use strict";
/***************************************************************************************************************************
 * @license                                                                                                                *
 * Copyright 2017 Coinbase, Inc.                                                                                           *
 *                                                                                                                         *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance          *
 * with the License. You may obtain a copy of the License at                                                               *
 *                                                                                                                         *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                              *
 *                                                                                                                         *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on     *
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                      *
 * License for the specific language governing permissions and limitations under the License.                              *
 ***************************************************************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
const gdaxFactories_1 = require("../factories/gdaxFactories");
const Logger_1 = require("../utils/Logger");
const Trader_1 = require("../core/Trader");
const RateLimiter_1 = require("../core/RateLimiter");
const StaticCommandSet_1 = require("../lib/StaticCommandSet");
const auth = {
    key: process.env.GDAX_KEY,
    secret: process.env.GDAX_SECRET,
    passphrase: process.env.GDAX_PASSPHRASE
};
const logger = Logger_1.ConsoleLoggerFactory();
/**
 * Prepare a set of order execution messages. For simplicity, we'll use `StaticCommandSet` to play them to
 * the `Trader`
 */
const messages = [
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.0',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    },
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.1',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    },
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.2',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    },
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.3',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    },
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.4',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    }
];
// We could also use FeedFactory here and avoid all the config above.
gdaxFactories_1.getSubscribedFeeds({ auth: auth, logger: logger }, ['BTC-USD']).then((feed) => {
    // Configure the trader, and use the API provided by the feed
    const traderConfig = {
        logger: logger,
        productId: 'BTC-USD',
        exchangeAPI: feed.authenticatedAPI,
        fitOrders: false
    };
    const trader = new Trader_1.Trader(traderConfig);
    const orders = new StaticCommandSet_1.StaticCommandSet(messages);
    // We use a limiter to play each order once every 2 seconds.
    const limiter = new RateLimiter_1.default(1, 500);
    // We'll play the orders through the limiter, so connect them up
    orders.pipe(limiter);
    // We can only pipe one stream into the trader, so we can't pipe both the GDAX feed as well as our trading commands.
    // We can pipe one, and then use the event mechanism to handle the other. In this demo we'll pipe the message feed
    // to trader,
    feed.pipe(trader);
    // .. and execute the trade messages as they come out of the limiter.
    limiter.on('data', (msg) => {
        trader.executeMessage(msg);
    });
    // We're basically done. Now set up listeners to log the trades as they happen
    trader.on('Trader.order-placed', (msg) => {
        logger.log('info', 'Order placed', JSON.stringify(msg));
    });
    trader.on('Trader.trade-executed', (msg) => {
        logger.log('info', 'Trade executed', JSON.stringify(msg));
    });
    trader.on('Trader.trade-finalized', (msg) => {
        logger.log('info', 'Order complete', JSON.stringify(msg));
    });
    trader.on('Trader.my-orders-cancelled', (ids) => {
        logger.log('info', `${ids.length} orders cancelled`);
    });
    trader.on('error', (err) => {
        logger.log('error', 'Error cancelling orders', err);
    });
    limiter.on('end', () => {
        console.log(JSON.stringify(trader.state()));
        // Wait a second to allow final order to settle
        setTimeout(() => {
            trader.cancelMyOrders().catch((err) => {
                logger.log('error', 'Error cancelling orders', err);
            });
        }, 5000);
    });
    // Send the orders once the feed has initialised
    feed.once('snapshot', () => {
        orders.send();
    });
});
//# sourceMappingURL=traderDemo.js.map