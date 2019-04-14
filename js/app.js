import { debounce }			from "debounce";
import connect				from "./holofuel-connect.js";

(async function(global) {
    
    const HoloFuel				= await connect('ws://localhost:3000');
    const whoami				= await HoloFuel.whoami();
    let ledger					= await HoloFuel.ledger_state();
    let transactions				= await HoloFuel.list_transactions();

    function snapshot( q ) {
	const html				= document.querySelector(q).outerHTML;
	console.log( html );
    }
    
    const routeComponents			= {
	"/": {
	    "template": (await import('./home.html')).default,
	    "data": function() {
		return {
		    "selectedTab": 0,
		    whoami,
		    ledger,
		    transactions,
		};
	    },
	    "methods": {
		selectTab (idx) {
		    console.log( idx );
		    this.selectedTab = idx;
		},
	    },
	},
    };
    console.log( routeComponents );

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
	data: {
	},
	created: async function() {
	}
    }).$mount('#app');

    global.HoloFuel				= HoloFuel;
    global.App					= app;
    
})(window);
