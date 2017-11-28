
import * as GTT from 'gdax-trading-toolkit';
import { GDAXFeed } from "gdax-trading-toolkit/build/src/exchanges";
import { StreamMessage, TradeMessage } from "gdax-trading-toolkit/build/src/core";
import { LiveOrder } from "gdax-trading-toolkit/build/src/lib";
import { PlaceOrderMessage } from 'gdax-trading-toolkit/build/src/core';
import {AvailableBalance, Balances} from "./gdax-tt/src/exchanges/AuthenticatedExchangeAPI";
import { Big, BigJS } from "gdax-trading-toolkit/build/src/lib/types";

const products = ['BTC-USD', 'ETH-USD', 'ETH-BTC', 'LTC-USD', 'LTC-BTC'];
// I do this so that I can change the order of the products without consequence.
const LTC_BTC_i = products.indexOf('LTC-BTC');
const ETH_BTC_i = products.indexOf('ETH-BTC');
const LTC_USD_i = products.indexOf('LTC-USD');
const ETH_USD_i = products.indexOf('ETH-USD');
const BTC_USD_i = products.indexOf('BTC-USD');

// Create a single logger instance to pass around
const logger = GTT.utils.ConsoleLoggerFactory();
const padfloat = GTT.utils.padfloat;
const gdaxAPI = GTT.Factories.GDAX.DefaultAPI(logger);

const diff: Array<BigJS> = [Big(-100000), Big(-100000)];
let ready = [false, false]; // track if we've fired the loop for each exchange.
let latest_eth_btc_conversion = Big(0);
const latest = new Array<BigJS>(products.length);
const zero = Big(0);

GTT.Factories.GDAX.FeedFactory(logger, products).then((feed: GDAXFeed) => {
    // Configure all message streams to use the same websocket feed
    // Create the source message streams by creating a MessageStream for each product, using the same WS feed for each
    const streams = products.map((product) => new GTT.Core.ProductFilter({ logger: logger, productId: product }));
    const outStream = new Array(products.length);
    for (let i = 0; i < products.length; i++) {
        outStream[i] = feed.pipe(streams[i]);
        latest[i] = Big(-100000);
    }

    for (let i = 0; i < latest.length; i++) {
        outStream[i].on('data', (msg: StreamMessage) => {

            if (msg.type === 'trade') {
                mangeTradeMessage(i, msg as TradeMessage);
            }
            if(msg.type !== 'level' && msg.type !== 'myOrderPlaced' && msg.type !== 'tradeExecuted' && msg.type !== 'tradeFinalized' && msg.type !== 'trade' && msg.type !== 'snapshot' && msg.type !== 'ticker' && msg.type !== 'unknown'){
              console.log('Message Type: ' + msg.type)
            }
            if (msg.type === 'tradeExecuted') {//|| msg.type === 'tradeFinalized'){
              console.log('Message Type: ' + msg.type)
              process.stdout.write("\x07");
            }
          
        });
    }
});

function mangeTradeMessage(index: number, msg: TradeMessage) {
    let price = Big(msg.price);
    // make the two exchange rates (ETH-BTC, LTC-BTC)relative to BTC-USD
    if (products[index] === 'ETH-BTC' || products[index] === 'LTC-BTC'){
        if (products[index] === 'ETH-BTC' ) {
            latest_eth_btc_conversion = price;
        }

        let btc_usd = latest[BTC_USD_i];
        if (btc_usd.gt(zero)) {
            latest[index] = price.times(btc_usd);
        }

        // once this next line has run once you are all necessary infomation is in place to trade for the respective currency.
        products[index] === 'ETH-BTC' ? ready[0] = true : ready[1] = true;
    } else {
        latest[index] = price;
    }
    // calculate the diff in prices between buying currency x in BTC vs USD
    diff[0] = latest[ETH_USD_i].minus(latest[ETH_BTC_i]);
    diff[1] = latest[LTC_USD_i].minus( latest[LTC_BTC_i]);

    // if were not ready yet dont try to process the arbitrage.
    if (!ready[0] || latest[ETH_BTC_i].lt(zero) || latest[ETH_USD_i].lt(zero) || latest[BTC_USD_i].lt(zero)) {
        return
    }


    printUnderline(latest, index);
    printLatestPrices(diff);

    let randNumber = getRandomInt(0, 200);
    if(randNumber != 10) {
        // console.log(`skip order: ${randNumber}`);
        return
    }
    process.stdout.write('🎯');
    let eth_diff = diff[0];
    processArbitrage(eth_diff, latest[ETH_BTC_i], latest[ETH_USD_i], latest[BTC_USD_i], latest_eth_btc_conversion);
    processArbitrage2(eth_diff, latest[ETH_BTC_i], latest[ETH_USD_i], latest[BTC_USD_i], latest_eth_btc_conversion);
}

function printLatestPrices(prices: BigJS[]) {
    // const cur = ['BTC-USD', 'ETH-BTC', 'LTC-BTC'];
    const diffLabels = ['ETH', 'LTC'];
    const pstr = diffLabels.map((c, i) => `${c} ${padfloat(prices[i], 6, 6)}`);
    const msg = pstr.join('  |  ');
    // process.stdout.write(msg + ' | ');
    console.log('  |  ' + msg);

}

function printUnderline(prices: BigJS[], changeIndex: number) {
  const pstr = products.map((c, i) => `${c}${i === changeIndex ? "\x1b[36m" : ""} ${padfloat(prices[i], 6, 6)} ${i === changeIndex ? "\x1b[0m" : ""}`);
    const msg = pstr.join('  |  ');
    process.stdout.write(msg)
}

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
        console.log('Order executed', `Order to ${order.side} ${amount} ${base} for ${price} ${quote} placed. Result: ${result.status}`);
        processOrderResult(result, order)
    }).catch(logError);
  return order;
}

function orderMarketMessage(side: string, product: string, amount: string, price: string) {
  console.log(side + ' ' + amount + ' ' + product + '@ ' + price + ' - ' + amount);
  const [base, quote] = product.split('-');

  const order: PlaceOrderMessage = {
        type: 'order',
        time: new Date(),
        productId: product,
        orderType: 'market',
        side: side,
        size: amount
    };
    gdaxAPI.placeOrder(order).then((result: LiveOrder) => {
        console.log('Market order executed ', `Order to ${order.side} ${amount} ${base} placed. Result: ${result.status}`);
    });
  return order;
}

let executedArbitrage = false;

function processArbitrage(arbitrageValue: BigJS, eth_price: BigJS, eth_price2: BigJS, btc_price: BigJS, eth_btc: BigJS) {
    // arbitrageValue = eth_price2 - eth_price
    let arbitrageLimit = Big(1);
    let min_increment = Big(0.01);
    if (arbitrageValue.lte(zero)) {return}
    if (eth_btc.isZero() || eth_btc.lte(zero)) {return}
    if (arbitrageValue.lt(arbitrageLimit)) {return}
    // if (executedArbitrage === true) {return}

    let buy_price = eth_btc;
    let btc_min_amount = Big(0.01);
    let amount = btc_min_amount.div(eth_btc); //0.01 / 0.04472 = 0.22361359
    let sell_price = eth_price2.plus(min_increment);
    let buy_price2 = btc_price.minus(min_increment);

    let eth_needed = btc_min_amount.div(eth_btc);
    let btc_needed = eth_btc.times(amount);
    let usd_needed = btc_min_amount.times(btc_price.minus(min_increment));

    console.log(`arbitrageValue: ${arbitrageValue}`);
    sufficentBalances(btc_needed, eth_needed, usd_needed).then(result => {

        if (!result) {
            console.log('Insufficient Balances');
            return
        }

        // alert me.
        process.stdout.write("\x07");

        // buy eth with bitcoin
        orderMessageWithREST('buy', 'ETH-BTC', amount.toFixed(8), buy_price.toFixed(5));
        console.log('buy ' + amount + ' eth @ ' + buy_price);

        // sell eth for usd
        orderMessageWithREST('sell', 'ETH-USD', amount.toFixed(8), sell_price.toFixed(2));
        console.log('sell 0.01 eth for this many usd: ' + sell_price.toFixed(2));

        // buy bitcoin with usd
    orderMessageWithREST('buy', 'BTC-USD', `${btc_min_amount.toFixed(2)}`, buy_price2.toFixed(2));
        console.log('buy bitcoin with usd: ' + buy_price2.toFixed(2));
        executedArbitrage = true
    });
    executedArbitrage = true

}

function processArbitrage2(arbitrageValue: BigJS, eth_price: BigJS, eth_price2: BigJS, btc_price: BigJS, eth_btc: BigJS) {
    // arbitrageValue = eth_price2 - eth_price

    let arbitrageLimit = Big(-1);
    let min_increment = Big(0.01);
    if (arbitrageValue.gte(zero)) {return}
    if (eth_btc.isZero() || eth_btc.lt(zero)) {return}
    if (arbitrageValue.gt(arbitrageLimit)) {return}
    // if (executedArbitrage === true) {return}

    // i need 0.01 BTC
    // I need 0.01 / btc_eth exchange rate
    // I need 0.01 * btc_usd exchange rate

    let buy_price = eth_btc;
    let btc_min_amount = Big(0.01);
    let amount = btc_min_amount.div(eth_btc); //0.01 / 0.04472 = 0.22361359
    let sell_price = eth_price2.minus(min_increment);
    let buy_price2 = btc_price.plus(min_increment);

    let eth_needed = amount;
    let btc_needed = eth_btc.times(amount);
    let usd_needed = btc_min_amount.times(btc_price.minus(min_increment));

    console.log(`arbitrageValue: ${arbitrageValue}`);
    sufficentBalances(btc_needed, eth_needed, usd_needed).then(result => {
        if (!result) {
            console.log('😩 Insufficient Balance!');
            return
        }
        // alert me.
        process.stdout.write("\x07");

        // sell eth for bitcoin
       orderMessageWithREST('sell', 'ETH-BTC', amount.toFixed(8), buy_price.toFixed(5));
       console.log('sell ' + amount.toFixed(8) + ' eth @ ' + buy_price.toFixed(5));

        // buy eth using usd
       orderMessageWithREST('buy', 'ETH-USD', amount.toFixed(8), sell_price.toFixed(2));
       console.log('buy 0.01 eth for this many usd: ' + sell_price.toFixed(2));

        // sell bitcoin for usd
       orderMessageWithREST('sell', 'BTC-USD', `${btc_min_amount}`, buy_price2.toFixed(2));
       console.log('sell bitcoin with usd: ' + buy_price2.toFixed(2));
       executedArbitrage = true
    });
    executedArbitrage = true
}

function sufficentBalances(btc_needed: BigJS, eth_needed: BigJS, usd_needed: BigJS ): Promise<boolean | void> {
    // I need at least eth_usd_sell of ether to sell
    // I need at least eth_btc_buy of btc to buy ether
    // I need at least btc_usd_buy of usd to buy btc
    console.log(`btc_needed: ${btc_needed}, eth_needed: ${eth_needed}, usd_needed: ${usd_needed}`);

    return gdaxAPI.loadBalances().then((balances: Balances) => {
        let result: boolean;

        for (const profile in balances) {
            const eth_bal: AvailableBalance = balances[profile]['ETH'];
            const btc_bal: AvailableBalance = balances[profile]['BTC'];
            const usd_bal: AvailableBalance = balances[profile]['USD'];
            const eth_avail = Big(eth_bal.available);
            const btc_avail = Big(btc_bal.available);
            const usd_avail = Big(usd_bal.available);

            console.log(`Enough Ethereum? ${eth_avail.gte(eth_needed)} Enough Bitcoin? ${btc_avail.gte(btc_needed)} Enough USD? ${usd_avail.gte(usd_needed)}`);
            result = eth_avail.gte(eth_needed) && btc_avail.gte(btc_needed) && usd_avail.gte(usd_needed);

            for (const cur in balances[profile]) {
                const bal: AvailableBalance = balances[profile][cur];
                console.log(`${cur}: Balance = ${bal.balance.toFixed(6)}, Available = ${bal.available.toFixed(6)}`);
            }
        }
        return Promise.resolve(result);
    }).catch(logError);
}

function processOrderResult(result: LiveOrder, order: PlaceOrderMessage) {
  if (result.status === 'rejected') {
    console.log('order failed - placing market message.');
    orderMarketMessage(order.side, order.productId, order.size, order.price)
  }
}

function logError(err: any): void {
    console.log(err);
    console.log(err.message, err.response ? `${err.response.status}: ${err.response.body.message}` : '');
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}