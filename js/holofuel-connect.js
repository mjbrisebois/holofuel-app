import * as holochainClient		from "@holochain/hc-web-client";
import hClient				from "./hClient.js";

async function init( wsURL ) {

    console.log("Initialize holochain connection: ", wsURL );
    const holoClientOpts			= {
	hostUrl:	wsURL,
	happId:		"QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS", //location.hostname.split('qmpxnfajazkn1uacnxdjgerakytvvwm5gukgytv3do8n7k'),
    };
    console.log("Initialize holo-client wrapper with options", holoClientOpts, "around", holochainClient );

    hClient.installLoginDialog();
    const client				= await hClient.makeWebClient( holochainClient, holoClientOpts );
    
    console.log("Initialize client connection", client );
    const {call, callZome, close}		= await client.connect();
    
    console.log("Trigger login prompt");
    await hClient.startLoginProcess( 'test@example.com', 'Password1234', false ); // 'test@example.com', 'Password1234' 
    // await hClient.triggerLoginPrompt();

    const agent_id				= await hClient.getCurrentAgentId();

    console.log("Connected to envoy");
    function mapZomeMethod( method_name ) {
	const zomeMethod			= callZome( `QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c::${agent_id}`, 'transactions', method_name );

	return async function ( params ) {
	    let resp;
	    
	    try {
		resp				= await zomeMethod( params || {} );
		// if ( resp.Ok )
		//     return resp.Ok;
		// else {
		//     console.error( resp );
		//     throw Error( resp );
		// }
	    } catch (err) {
		console.error(err);
		return err;
	    }

	    console.log("Zome call response for request 'transactions->"+ method_name +"':", resp );
	    return resp;
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
