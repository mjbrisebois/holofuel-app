import { connect }			from "@holochain/hc-web-client";

async function init( wsURL ) {
    const {call, callZome, close}		= await connect( wsURL );

    function mapZomeMethod( method_name ) {
	const zomeMethod			= callZome( 'test-instance', 'transactions', method_name );
	return async function ( params ) {
	    try {
		const resp			= JSON.parse(await zomeMethod( params || {} ));
		if ( resp.Ok )
		    return resp.Ok;
		else {
		    console.error( resp );
		    throw Error( resp );
		}
	    } catch (err) {
		return err;
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
	map[method_name]	= mapZomeMethod( method_name );
	return map;
    }, {});

    return HoloFuel;
}

export default init;
