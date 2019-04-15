
import * as clipboard				from "clipboard-polyfill"
import { debounce }				from "debounce";

import components				from "./components.js";
import state_manager				from "./state-manager.js";
import notify					from "./notify.js";
import { mapState, mapMutations, mapActions }	from 'vuex'

Vue.filter('currency', function (value) {
    const amount				= parseFloat( value );
    if ( isNaN( amount ) )
	return value;

    var formatter = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 3,
	maximumFractionDigits: 10,
    });
    return formatter.format( amount );
});

(async function(global) {

    const { store, ..._ }			= await state_manager();

    function snapshot( q ) {
	const html				= document.querySelector(q).outerHTML;
	console.log( html );
    }

    const datetime_formats = {
	long: {
	    weekday: 'long',
	    year: 'numeric',
	    month: 'long',
	    day: 'numeric',
	    hour: 'numeric',
	    minute: 'numeric',
	    second: 'numeric',
	    timeZomeName: 'short',
	},
    };
    const datetime				= function ( timestamp, format ) {
	const options				= datetime_formats[ format ];
	if ( options === undefined )
	    throw Error(`'${format}' datetime format is not defined`);
	return (new Date( timestamp )).toLocaleDateString( 'en-US', options );
    };

    const now_plus_hours			= function ( hours ) {
	const now				= new Date();
	const h					= parseFloat( hours );
	
	now.setTime( now.getTime() + ( h * 60*60*1000 ) );
	const deadline				= now.toISOString();
	return deadline;
    };

    const state_object				= function( state_str ) {
	/*
	  "unknown/starting"
	  "unknown/error"

	  "incoming/requested"
	  "incoming/rejected"
	  "incoming/accepted"
	  "incoming/returned"
	  "incoming/completed"
	  "incoming/refunded"
	  "incoming/error"

	  "outgoing/approved"
	  "outgoing/declined"
	  "outgoing/completed"
	  "outgoing/recovered"
	  "outgoing/error"
	*/
	const [type, state]			= state_str.split('/');
	
	return {
	    type,
	    unknown:  type === 'unknown',
	    incoming: type === 'incoming',
	    outgoing: type === 'outgoing',
	    state,
	};
    }

    const routeComponents			= {
	"/": {
	    "template": (await import('./home.html')).default,
	    "data": function() {
		return {
		    "selectedTab": 0,
		    "request_tx": null,
		    "dialog_request_confirm_open": false,
		    "dialog_request_decline_open": false,
		    "promise_tx": null,
		    "dialog_promise_confirm_open": false,
		    "dialog_promise_decline_open": false,
		};
	    },
	    computed: {
		...mapState([
		    'whoami',
		    'ledger',
		    'transactions',
		    'pending',
		]),
	    },
	    "methods": {
		datetime,
		selectTab: function ( idx ) {
		    this.selectedTab = idx;
		},
		counterparty: function ( tx ) {
		    const state			= state_object( tx.state );
		    if ( state.incoming ) {
			switch ( state.state ) {
			case "completed":
			    return tx.event.Receipt.cheque.invoice.promise.tx.from;
			case "approved":
			    return tx.event.Promise.tx.from;
			case "requested":
			    return tx.event.Request.from;
			default:
			    return `${tx.state}?`;
			}
		    }
		    else if ( state.outgoing ) {
			switch ( state.state ) {
			case "completed":
			    return tx.event.Cheque.invoice.promise.tx.to;
			case "approved":
			    return tx.event.Promise.tx.to;
			default:
			    return `${tx.state}?`;
			}
		    }
		    else {
			return `${tx.state}?`;
		    }
		},
                state_name: function( tx ) {
		    const state			= state_object( tx.state );
                    return state.state
                },
		adjustment: function ( tx ) {
		    const state			= state_object( tx.state );

		    if ( state.state === 'completed' )
			return tx.adjustment.balance.Ok;
		    
		    if ( state.incoming ) {
			switch ( state.state ) {
			case "requested":
			    return tx.event.Request.amount;
			default:
			    return `${tx.state}?`;
			}
		    }
		    else if ( state.outgoing ) {
			switch ( state.state ) {
			case "approved":
			    return tx.adjustment.payable.Ok;
			default:
			    return `${tx.state}?`;
			}
		    }
		    else {
			return `${tx.state}?`;
		    }
		},
		pending_request_total: function ( tx ) {
		    return parseFloat( tx.event[2].Request.amount ) + parseFloat( tx.event[2].Request.fee );
		},
		pending_request_fees: function ( tx ) {
		    return parseFloat( tx.event[2].Request.fee );
		},
		pending_promise_total: function ( tx ) {
		    return parseFloat( tx.event[2].Promise.tx.amount );
		},
		dialog_request_confirm: function ( tx ) {
		    this.request_tx			= tx;
		    this.dialog_request_confirm_open	= true;
		},
		dialog_request_decline: function ( tx ) {
		    this.request_tx			= tx;
		    this.dialog_request_decline_open	= true;
		},
		send_promise_for_request: function( request ) {
		    const req_hash			= request.event[0];
		    const { to, amount, ..._ }		= request.event[2].Request;
		    const deadline			= now_plus_hours( 24 );
		    
		    notify.open({
			type: 'info',
			message: "Approving request",
		    });
		    this.$store.dispatch('approve_request', {
			to,
			amount,
			deadline,
			request: req_hash,
		    });
		    notify.success("Funds have been promised");
		    this.request_tx			= null;
		},
		send_decline_for_request: function( request_hash ) {
		    console.log( "Decline request", request_hash );
		    this.request_tx			= null;
		    // this.$store.dispatch('decline_request', {
		    // })
		},
		dialog_promise_confirm: function ( tx ) {
		    this.promise_tx			= tx;
		    this.dialog_promise_confirm_open	= true;
		},
		dialog_promise_decline: function ( tx ) {
		    this.promise_tx			= tx;
		    this.dialog_promise_decline_open	= true;
		},
		send_receive_payment: function( tx ) {
		    const promise			= tx.event[2].Promise
		    const promise_sig			= "[signature]";
		    const promise_commit		= tx.event[0];
		    
		    notify.open({
			type: 'info',
			message: "Receiving payment",
		    });
		    this.$store.dispatch('receive_payment', {
			promise,
			promise_sig,
			promise_commit,
		    });
		    notify.success("Payment received");
		    this.promise_tx			= null;
		},
		send_decline_payment: function( request_hash ) {
		    console.log( "Decline payment", request_hash );
		    this.promise_tx			= null;
		    // this.$store.dispatch('decline_promise', {
		    // })
		},
		...mapActions([
		    'get_transactions',
		]),
		...mapActions({
		    // add: 'increment'
		})
	    },
	},
	"/promise": {
	    "template": (await import('./promise.html')).default,
	    "data": function() {
		return {
		    "confirm_promise": false,
		    "receiver_id": null,
		    "amount": "0.00",
		    "hours": "24",
		    "notes": null,
		};
	    },
	    computed: {
		calculated_fee () {
		    if ( typeof this.amount !== 'string' )
			return "0.00";
		    const value				= parseFloat( this.amount );
		    if ( isNaN( value ) )
			return "0.00";
		    return String( value / 100 );
		},
		...mapState([
		    'whoami',
		    'ledger',
		]),
	    },
	    "methods": {
		datetime,
		send_promise: async function ( to, amount, hours, notes ) {
		    const deadline			= now_plus_hours( hours );

		    notify.open({
			type: 'info',
			message: "Sending promise",
		    });
		    const resp				= await this.$store.dispatch('send_promise', {
			to, amount, deadline, notes
		    });
		    console.log( resp );
		    notify.success("Funds have been promised");

		    this.receiver_id			= null;
		    this.amount				= "0.00";
		    this.notes				= null;
		},
		...mapActions([
		]),
	    },
	},
	"/request": {
	    "template": (await import('./request.html')).default,
	    "data": function() {
		return {
		    "confirm_request": false,
		    "receiver_id": null,
		    "amount": "0.00",
		    "hours": "24",
		    "notes": null,
		};
	    },
	    computed: {
		...mapState([
		    'whoami',
		    'ledger',
		]),
	    },
	    "methods": {
		datetime,
		send_request: async function ( from, amount, hours, notes ) {
		    const deadline			= now_plus_hours( hours );

		    notify.open({
			type: 'info',
			message: "Sending request",
		    });
		    const resp				= await this.$store.dispatch('send_request', {
			from, amount, deadline, notes
		    });
		    console.log( resp );
		    notify.success("Funds have been requestd");

		    this.receiver_id			= null;
		    this.amount				= "0.00";
		    this.notes				= null;
		},
		...mapActions([
		]),
	    },
	},
    };
    console.log( routeComponents );

    function refresh_store() {
	console.log('Updating transactions & pending');
	store.dispatch('get_transactions');
	store.dispatch('get_pending');
    }
    refresh_store();
    setInterval(refresh_store, 10000);

    const routes				= [];
    for (let [ path, component ] of Object.entries( routeComponents )) {
	routes.push({ path, component });
    }
    console.log( routes );

    const router				= new VueRouter({
	routes,
	linkActiveClass: "parent-active",
	linkExactActiveClass: "active",
    });

    const app					= new Vue({
	router,
	store,
	data: {
	},
	computed: {
	    ...mapState([
		'whoami',
		'ledger',
	    ]),
	},
	created: async function() {
	},
	methods: {
	    copyToClipboard: function ( text ) {
		clipboard.writeText( text );
		notify.open({
		    type: 'info',
		    message: "Copied text to clipboard",
		});
	    },
	}
    }).$mount('#app');

    global.App					= app;
    
})(window);
