
import connect				from "./holofuel-connect.js";
import Vuex				from 'vuex'
import createLogger			from 'vuex/dist/logger'

Vue.use( Vuex );

async function init( wsURL ) {
    const HoloFuel				= await connect('ws://localhost:3000');
    global.HF__debug				= HoloFuel;
    
    const whoami				= await HoloFuel.whoami();
    let ledger					= await HoloFuel.ledger_state();

    const store = new Vuex.Store({
	plugins: process.env.NODE_ENV !== 'production' ? [
	    createLogger({ collapsed: true, })
	] : [],
	state: {
	    whoami,
	    ledger,
	    transactions: {},
	    pending: {},
	},
	mutations: {
	    set_ledger: function ( state, payload ) {
		Object.entries( payload ).map(function ( [k, value] ) {
		    payload[k]			= parseFloat( value );
		});
		payload.available		= payload.balance + payload.credit - payload.payable;
		state.ledger			= payload;
	    },
	    set_transactions: function ( state, payload ) {
		state.transactions		= payload;
	    },
	    set_pending: function ( state, payload ) {
		state.pending			= payload;
	    },
	},
	actions: {
	    get_transactions: async function ( context ) {
		const resp			= await HoloFuel.list_transactions();
		context.commit('set_ledger', resp.ledger );
		context.commit('set_transactions', resp.transactions );
	    },
	    get_pending: async function ( context ) {
		const resp			= await HoloFuel.list_pending();
		context.commit('set_pending', resp );
	    },
	    send_promise: async function( context, payload ) {
		const resp			= await HoloFuel.promise( payload );
		this.dispatch( 'get_pending' );
	    },
	    send_request: async function( context, payload ) {
		const resp			= await HoloFuel.request( payload );
		this.dispatch( 'get_pending' );
	    },
	    approve_request: async function( context, payload ) {
		const resp			= await HoloFuel.promise( payload );
		this.dispatch( 'get_transactions' );
		this.dispatch( 'get_pending' );
	    },
	    receive_payment: async function( context, payload ) {
		const resp			= await HoloFuel.receive_payment( payload );
		this.dispatch( 'get_transactions' );
		this.dispatch( 'get_pending' );
	    },
	}
    });

    return {
	store,
	HoloFuel,
    };
}
    
export default init;
