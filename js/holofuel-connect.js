import { connect }			from "@holochain/hc-web-client";

async function init( wsURL ) {
    const {call, callZome, close}		= await connect( wsURL );

    function mapZomeMethod( method_name ) {
	const zomeMethod			= callZome( 'holofuel', 'transactions', method_name );
	return async function ( params ) {
	    try {
                console.log(method_name + "( " + JSON.stringify( params, null, 2 ) + " ) ---> ");
                const resp_json			= await zomeMethod( params || {} );
                console.log(method_name + " <--- " + resp_json );
		const resp			= JSON.parse( resp_json );
		if ( resp.Ok ) {
                    console.log(method_name + " <--- " + JSON.stringify( resp, null, 2 ));
		    return resp.Ok;
		} else {
                    console.log(method_name + " <-x- " + JSON.stringify( resp, null, 2 ));
		    console.error( resp );
		    throw Error( resp );
		}
	    } catch (err) {
                console.log(method_name + " <-x-; Exception: " + JSON.stringify( err, null, 2 ));
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
	map[method_name]			= mapZomeMethod( method_name );
	return map;
    }, {});

    return HoloFuel;
}

export default init;
