import {GDAXExchangeAPI} from "./gdax-tt/src/exchanges/gdax/GDAXExchangeAPI";
import {DefaultAPI} from "./gdax-tt/src/factories/gdaxFactories";
import { Big, BigJS } from "gdax-trading-toolkit/build/src/lib/types";
import {Ticker} from "./gdax-tt/src/exchanges/PublicExchangeAPI";
import {LiveOrder, Orderbook} from "./gdax-tt/src/lib/Orderbook";
import {Balances, AvailableBalance} from "./gdax-tt/src/exchanges/AuthenticatedExchangeAPI";
import {PlaceOrderMessage} from "./gdax-tt/src/core/Messages";
import {Promise} from "ts-promise";

const gdax: GDAXExchangeAPI = DefaultAPI(null);
const product = 'BTC-USD';
let ethOrders: Array<LiveOrder> = [];
let btcOrders: Array<LiveOrder> = [];
let ltcOrders: Array<LiveOrder> = [];

function delayPromise(delay:number) {
    //return a function that accepts a single variable
    return function(data:any) {
        //this function returns a promise.
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                //a promise that is resolved after "delay" milliseconds with the data provided
                resolve(data);
            }, delay);
        });
    }
}

function logError(err: any): void {
    console.log("logError");
    // console.log(err);
    console.log(err.request);
    console.log(err.message, err.response ? `${err.response.status}: ${err.response.body.message}` : '');
}

// TODO: need to add a check that I have enough to execute this order (check my balances)
function placeBuyJumpOrder(product: string, amount: number) {
    gdax.loadMidMarketPrice(product).then((price: BigJS) => {
        const [base, quote] = product.split('-');
        console.log(`Mid-market Price: $${price}/${base}`);
        const jumpPrice = price.minus(amount);
        const jumpOrder: PlaceOrderMessage = {
            time: new Date(),
            type: 'placeOrder',
            productId: product,
            clientId: null,
            price: `${jumpPrice.toFixed(2)}`,
            size: '0.1',
            side: 'buy',
            orderType: 'limit',
            postOnly: true
        };
        return gdax.placeOrder(jumpOrder);
    }).then((o) => {
        console.log(`Order status: ${o.status}, ${o.time}`);
        trackOrder(o);
        return gdax.loadOrder(o.id);
    }).then(delayPromise(30000)).then((o: LiveOrder) => {
        console.log(`Canceling order: ${o.id}`);
        cancelOrders(o);
        // return gdax.cancelOrder(o.id);
    }).catch(logError);
}

function cancelOrders(o: LiveOrder) {
    const [base, quote] = o.productId.split('-');
    switch(base) {
        case 'ETH': {
            checkOrdersArray(ethOrders).then((orders) => {
                return  cancelOrdersArray(orders).then((idArray) => {
                    idArray.forEach((id) => {
                        console.log(`Order ${id} has been cancelled`);
                    });
                    ethOrders = [];
                });
            }).catch(logError);
            break;
        }
        case 'BTC': {
            checkOrdersArray(btcOrders).then((orders) => {
                return  cancelOrdersArray(orders).then((idArray) => {
                    idArray.forEach((id) => {
                        console.log(`Order ${id} has been cancelled`);
                    });
                    btcOrders = [];
                });
            }).catch(logError);
            break;
        }
        case 'LTC': {
            checkOrdersArray(ltcOrders).then((orders) => {
                return  cancelOrdersArray(orders).then((idArray) => {
                    idArray.forEach((id) => {
                        console.log(`Order ${id} has been cancelled`);
                    });
                    ltcOrders = [];
                });
            }).catch(logError);
            break;
        }
        default: {
            console.log("DEFAULT!");
            checkOrdersArray(ethOrders).then((orders) => {
                return  cancelOrdersArray(orders).then((idArray) => {
                    idArray.forEach((id) => {
                        console.log(`Order ${id} has been cancelled`);
                    });
                    ethOrders = [];
                });
            }).catch(logError);
            break;
        }
    }
}

function checkOrdersArray(orders: Array<LiveOrder>): Promise<LiveOrder[]> {
    const promises = orders.map(order => {
        return gdax.loadOrder(order.id);
    });
    return Promise.all(promises);
}


function cancelOrdersArray(orders: Array<LiveOrder>): Promise<String[]> {
    const promises = orders.map(order => {
        console.log("order.status:", order.status);
        // console.log("cancelOrdersArray - order: ", order);
        if (order.status === 'pending' || order.status === 'open') {
            return gdax.cancelOrder(order.id);
        }
        return null;
    });
    return Promise.all(promises);
}

function trackOrder(o: LiveOrder) {
    // console.log("trackOrder - order: ", o);
    if (!o) { return }
    if (!o.productId) { return }
    const [base, quote] = o.productId.split('-');
    switch(base) {
        case 'ETH': {
            ethOrders.push(o);
            break;
        }
        case 'BTC': {
            btcOrders.push(o);
            break;
        }
        case 'LTC': {
            ltcOrders.push(o);
            break;
        }
        default: {
            console.log("DEFAULT!");
            ethOrders.push(o);
            break;
        }
    }
}

// TODO: need to add a check that I have enough to execute this order (check my balances)
function placeSellJumpOrder(product: string, amount: number) {
    gdax.loadMidMarketPrice(product).then((price: BigJS) => {
        const [base, quote] = product.split('-');

        console.log(`Mid-market Price: $${price}/${base}`);
        const jumpPrice = price.plus(amount);
        const jumpOrder: PlaceOrderMessage = {
            time: new Date(),
            type: 'placeOrder',
            productId: product,
            clientId: null,
            price: `${jumpPrice.toFixed(2)}`,
            size: '0.1',
            side: 'sell',
            orderType: 'limit',
            postOnly: true
        };
        return gdax.placeOrder(jumpOrder);
    }).then((o) => {
        console.log(`Order status: ${o.status}, ${o.time}`);
        trackOrder(o);
        return gdax.loadOrder(o.id);
    }).then(delayPromise(30000)).then((o: LiveOrder) => {
        console.log(`Canceling order: ${o.id}`);
        // cancelOrders(o);
    }).catch(logError);
}
//
// setInterval(function(){
//     //code goes here that will be run every 5 seconds.
//     placeBuyJumpOrder('BTC-USD', 20);
// }, 31000);
//
// setInterval(function(){
//     //code goes here that will be run every 5 seconds.
//     placeSellJumpOrder('BTC-USD', 20);
// }, 31000);


setInterval(function(){
    //code goes here that will be run every 5 seconds.
    placeBuyJumpOrder('ETH-USD', 1);
    placeSellJumpOrder('ETH-USD', 1);
}, 30000);

// setInterval(function(){
//     //code goes here that will be run every 5 seconds.
//     placeSellJumpOrder('ETH-USD', 1);
// }, 30000);

setInterval(function(){
    //code goes here that will be run every 5 seconds.
    placeBuyJumpOrder('LTC-USD', 0.2);
    placeSellJumpOrder('LTC-USD', 0.2);

}, 33000);

// setInterval(function(){
//     //code goes here that will be run every 5 seconds.
//     placeSellJumpOrder('LTC-USD', 0.2);
// }, 33000);