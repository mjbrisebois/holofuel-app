
const path				= require('path');
const fs				= require('fs');

function get_file_contents ( relative ) {
    const filepath			= path.resolve( __dirname, relative );
    return fs.readFileSync( filepath, "utf8" );
}

const agent1_hcid			= get_file_contents("./agent-1.hcid").trim();
const agent2_hcid			= get_file_contents("./agent-2.hcid").trim();

module.exports = {
    "instance_prefix": "app-name",
    "log_level": true,
    "connection": {
	"secure": false,
	"port": 42211
    },
    "web_user_legend": {
	"bob@holo.host":	agent1_hcid,
	"alice@holo.host":	agent2_hcid,
    }
};
