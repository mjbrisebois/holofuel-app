
const fs				= require('fs');
const agent1_hcid			= fs.readFileSync("./agent-1.hcid", "utf8").trim();
const agent2_hcid			= fs.readFileSync("./agent-2.hcid", "utf8").trim();

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
