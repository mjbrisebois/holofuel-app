
import connect				from "./holofuel-connect.js";
import Vuex				from 'vuex'
import createLogger			from 'vuex/dist/logger'
import * as waitUntil			from 'async-wait-until';

Vue.use( Vuex );

async function init( wsURL ) {

    let HoloFuel				= null;

    const connectionReady			= async function () {
	await waitUntil(() => {
	    return HoloFuel !== null;
	}, 5000, 100 );
	return HoloFuel;
    }

    const store					= new Vuex.Store({
	plugins: process.env.NODE_ENV !== 'production' ? [
	    createLogger({ collapsed: true, })
	] : [],
	state: {
	    auto_fetch_interval_id: null,
	    whoami: {},
	    ledger: {},
	    transactions: {},
	    pending: {},
	},
	mutations: {
	    set_auto_fetch_interval_id: function ( state, iid ) {
		state.auto_fetch_interval_id	= iid;
	    },
	    set_whoami: function ( state, payload ) {
		state.whoami			= payload;
	    },
	    set_ledger: function ( state, payload ) {
		Object.entries( payload ).map(function ( [k, value] ) {
		    payload[k]			= parseFloat( value );
		});
                // As of v0.11.0, HoloFuel Ledger contains the net available balance
		//payload.available		= payload.balance + payload.credit - payload.payable;
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
	    refresh_lists: async function( context ) {
		if ( !HoloFuel )
		    return console.log("HoloFuel API not ready yet");
		
		this.dispatch( 'get_transactions' );
		this.dispatch( 'get_pending' );
	    },
	    get_whoami: async function ( context ) {
		const resp			= await HoloFuel.whoami();
		context.commit('set_whoami', resp );
	    },
	    get_ledger: async function ( context ) {
		const resp			= await HoloFuel.ledger_state();
		context.commit('set_ledger', resp );
	    },
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
		this.dispatch( 'refresh_lists' );
	    },
	    receive_payment: async function( context, payload ) {
		const resp			= await HoloFuel.receive_payment( payload );
		this.dispatch( 'refresh_lists' );
	    },
	    start_auto_fetch: async function( context ) {
		if ( this.state.auto_fetch_interval_id )
		    return console.log("Auto fetch is already running");

		const iid			= setInterval(
		    () => this.dispatch('refresh_lists'), 10000
		);
		context.commit('set_auto_fetch_interval_id', iid);
		
		await connectionReady();
		this.dispatch( 'refresh_lists' );
	    },
	}
    });

    async function initializeWsConnection( port ) {
	HoloFuel				= await connect('ws://localhost:' + port);
	global.HF__debug			= HoloFuel;

	store.dispatch('get_whoami');
	store.dispatch('get_ledger');
    }

    return {
	store,
	initializeWsConnection,
    };
}
    
export default init;
