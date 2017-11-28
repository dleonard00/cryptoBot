
import * as GTT from "gdax-trading-toolkit";
import { Big, BigJS } from "gdax-trading-toolkit/build/src/lib/types";
import { GDAX_WS_FEED, GDAXFeed, GDAXFeedConfig } from "gdax-trading-toolkit/build/src/exchanges";
import { GDAX_API_URL } from "gdax-trading-toolkit/build/src/exchanges/gdax/GDAXExchangeAPI";
import { PlaceOrderMessage, TickerMessage } from 'gdax-trading-toolkit/build/src/core';

import { LiveOrder } from "gdax-trading-toolkit/build/src/lib";
import {AvailableBalance, Balances} from "./gdax-tt/src/exchanges/AuthenticatedExchangeAPI";

const logger = GTT.utils.ConsoleLoggerFactory();
const gdaxAPI = GTT.Factories.GDAX.DefaultAPI(logger);
const product = 'ETH-BTC';
let runningOpprotunity = Big(0.0);

/**
 * Remember to set GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars to allow trading
 */

const spread = Big('0.00001');

const options: GDAXFeedConfig = {
    logger: logger,
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    },
        // channels: ['ticker'],
    channels: null,
    wsUrl: GDAX_WS_FEED,
    apiUrl: GDAX_API_URL
};

GTT.Factories.GDAX.getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {
    GTT.Core.createTickerTrigger(feed, product, false).setAction((ticker: TickerMessage) => {

        const currentPrice = ticker.price;
        let price = currentPrice.minus(spread);
        let price2 = currentPrice.plus(spread);

        let randNumber = getRandomInt(0, 20);
        if(randNumber != 10) {
          console.log(`skip order: ${randNumber}`);
          return
        }

        let amount = Big(0.01);

        let btc_needed = amount.times(currentPrice);
        let eth_needed = amount;

        sufficentBalances(btc_needed, eth_needed).then(result => {
            if (!result) {
                console.log('😩 Insufficient Balance!');
                return
            }
            process.stdout.write("\x07");

            orderMessageWithREST('buy', product, `${amount}`, `${price}`);
            orderMessageWithREST('sell', product, `${amount}`, `${price2}`);
            gdaxAPI.loadMidMarketPrice('BTC-USD').then((midMarketPrice) => {
                console.log(`midMarketPrice: ${midMarketPrice}`);
                let diff = price2.minus(price);
                let opprotunity = diff.times(midMarketPrice).times(amount);
                runningOpprotunity = runningOpprotunity.plus(opprotunity);
                console.log(`runningOpprotunity: ${runningOpprotunity}, Opprotunity: ${opprotunity}`);
            });
        });
    });
});

function orderMessageWithREST(side: string, product: string, amount: string, price: string) {
  const [base, quote] = product.split('-');
  console.log(side + ' ' + base + ' ' + amount + ' ' + product + '@ ' + price);

  const order: PlaceOrderMessage = {
      time: new Date(),
      type: 'placeOrder',
      productId: product,
      size: amount,
      price: price,
      side: side,
      orderType: 'limit',
      postOnly: true
    };
    gdaxAPI.placeOrder(order).then((result: LiveOrder) => {
        console.log(`Order Executed: Order to ${order.side} ${amount} ${base} for ${price} ${quote} placed. Result ${(result.status ?  '✅' : '❌')} ${result.status}`);
        processOrderResult(result, order);
    }).catch(logError);
  return order;
}

function processOrderResult(result: LiveOrder, order: PlaceOrderMessage) {
    if (result.status === 'rejected') {
        console.log('order failed - placing new order.');
        let order_price = Big(order.price);

        let newPrice = order.side === 'buy' ? order_price.minus(spread) : order_price.plus(spread);
        orderMessageWithREST(order.side, order.productId, order.size, `${newPrice}`);
    }
}

function sufficentBalances(btc_needed: BigJS, eth_needed: BigJS): Promise<boolean | void> {
    // I need at least eth_usd_sell of ether to sell
    // I need at least eth_btc_buy of btc to buy ether
    // I need at least btc_usd_buy of usd to buy btc
    console.log(`btc_needed: ${btc_needed}, eth_needed: ${eth_needed}`);

    return gdaxAPI.loadBalances().then((balances: Balances) => {
        let result: boolean;
        for (const profile in balances) {
            const eth_bal: AvailableBalance = balances[profile]['ETH'];
            const btc_bal: AvailableBalance = balances[profile]['BTC'];

            const eth_avail = Big(eth_bal.available);
            const btc_avail = Big(btc_bal.available);
            console.log(`btc_avail: ${btc_avail}, eth_avail: ${eth_avail}`);

            console.log(`Enough Ethereum? ${eth_avail.gte(eth_needed)} Enough Bitcoin? ${btc_avail.gte(btc_needed)}`);

            result = eth_avail.gte(eth_needed) && btc_avail.gte(btc_needed);
            console.log(`result: ${result}`);

            for (const cur in balances[profile]) {
                const bal: AvailableBalance = balances[profile][cur];
                console.log(`${cur}: Balance = ${bal.balance.toFixed(6)}, Available = ${bal.available.toFixed(6)}`);
            }
        }
        return Promise.resolve(result);
    }).catch(logError);
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function logError(err: any): void {
    console.log(err);
    console.log(err.message, err.response ? `${err.response.status}: ${err.response.body.message}` : '');
}