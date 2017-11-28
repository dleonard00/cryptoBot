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

import * as GTT from 'gdax-trading-toolkit';
import { GDAXFeed } from "gdax-trading-toolkit/build/src/exchanges";
import { StreamMessage, TradeMessage } from "gdax-trading-toolkit/build/src/core";

/**
 * This Demonstration program illustrates how one can pipe the GDAX message streams through filters to transform the
 * data feed in a straightforward way.
 *
 * In this example, we make use of a FXService class (which provides Exchange rate data) and the ExchangeRateFilter
 * to convert EUR and GBP prices to USD on the EUR and GBP books on the fly.
 */

const products = ['ETH-USD', 'ETH-BTC', 'BTC-USD'];

// Create a single logger instance to pass around
const logger = GTT.utils.ConsoleLoggerFactory();
const padfloat = GTT.utils.padfloat;

GTT.Factories.GDAX.FeedFactory(logger, products).then((feed: GDAXFeed) => {
    // Configure all message streams to use the same websocket feed
    // Create the source message streams by creating a MessageStream for each product, using the same WS feed for each
    const streams = products.map((product) => new GTT.Core.ProductFilter({ logger: logger, productId: product }));
    // Let's grab a simple FXService object that uses Yahoo Finance as its source
    
    const outStream = new Array(3);
    outStream[0] = feed.pipe(streams[0]);
    // The EUR and GBP stream get passed through an exchange rate filter to convert prices to USD equivalent
    outStream[1] = feed.pipe(streams[1]);
    outStream[2] = feed.pipe(streams[2]);

    const latest = [-100000, -100000, -100000];
    for (let i = 0; i < 3; i++) {
        outStream[i].on('data', (msg: StreamMessage) => {
            if (msg.type === 'trade') {
                latest[i] = +(msg as TradeMessage).price;
                // console.log(msg)
                // if (latest[0] + latest[1] + latest[2] < 0) {
                //     return;
                // }
                printLatestPrices(latest);
            }
        });
    }
});

function printLatestPrices(prices: number[]) {
    const cur = ['ETH-USD', 'ETH-BTC', 'BTC-USD'];
    // const pstr = cur.map((c, i) => `${c} \$${padfloat(prices[i], 6, 2)}`);
    const pstr = cur.map((c, i) => `${c} \$${padfloat(prices[i], 6, 6)}`);

    const msg = pstr.join('  |  ');
    console.log(msg);
}
