import { Connection }				from "@holo-host/web-sdk";

console.log("Web SDK init (in holofuel-connect.js) has been loaded");
const envoy					= new Connection();

async function init( uid ) {

    function mapZomeMethod( method_name ) {
	return async function ( params ) {
	    try {
		const resp			= await envoy.zomeCall(
		    'holofuel', 'transactions', method_name, params || {}
		);

		console.log("Zome call result:", typeof resp, resp );
		if ( resp.Ok )
		    return resp.Ok;
		else {
		    console.error( resp );
		    throw Error( resp );
		}
	    } catch (err) {
		// console.log(err);
		throw err;
	    }
	};
    }

    const actions				= [
	'whoami', 'limits', 'request', 'reject',
	'receive_payment', 'refund', 'promise',
	'ledger_state', 'get_request', 'get_promise',
	'list_requests', 'list_promises', 'list_pending', 'list_transactions',
    ];
    const HoloFuel				= actions.reduce(function(map, method_name) {
	map[method_name]			= mapZomeMethod( method_name );
	return map;
    }, {});

    return HoloFuel;
}
init.ready			= envoy.ready().then(() => envoy.signIn());

export default init;
