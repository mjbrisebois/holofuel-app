
import connect				from "./holofuel-connect.js";
import Vuex				from 'vuex'
import createLogger			from 'vuex/dist/logger'
import * as waitUntil			from 'async-wait-until';


Vue.use( Vuex );

async function init( wsURL ) {

    let Envoy					= connect.envoy;
    let HoloFuel				= null;

    const connectionReady			= async function () {
	await waitUntil(() => {
	    return HoloFuel !== null;
	}, 30000, 100 );
	return HoloFuel;
    }

    function empty_state () {
	return {
	    auto_fetch_interval_id: null,
	    whoami: {
		"dna_address": "",
		"dna_name": "",
		"agent_id":{
		    "nick":"",
		    "pub_sign_key":"",
		},
		"agent_address":"",
	    },
	    ledger: {},
	    transactions: {},
	    pending: {},
	};
    }
    const store					= new Vuex.Store({
	plugins: process.env.NODE_ENV !== 'production' ? [
	    createLogger({ collapsed: true, })
	] : [],
	state: empty_state(),
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
	    refresh_lists: async function( context ) {
		if ( !HoloFuel )
		    return console.log("HoloFuel API not ready yet");
		
		this.dispatch( 'get_transactions' );
		this.dispatch( 'get_pending' );
		this.dispatch( 'get_whoami' );
	    },
	    get_whoami: async function ( context ) {
		const resp			= await HoloFuel.whoami();
		context.commit('set_whoami', resp );
	    },
	    get_ledger: async function ( context ) {
		const resp			= await HoloFuel.ledger_state();
		console.log("get_ledger", resp )
		context.commit('set_ledger', resp );
	    },
	    get_transactions: async function ( context ) {
		const resp			= await HoloFuel.list_transactions();

		// console.log("get_transactions", resp );
		// console.log("get_transactions", resp.ledger )

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

    Envoy.on("signout", () => {
	HoloFuel				= null;
	Object.assign( store.state, empty_state() );
	Envoy.signIn();
    });

    async function initializeWsConnection( uid ) {
	HoloFuel				= await connect( uid );
	global.HF__debug			= HoloFuel;

	await connect.ready;

	store.dispatch('get_whoami');
	store.dispatch('get_ledger');
    }

    return {
	store,
	initializeWsConnection,
    };
}
    
export default init;
