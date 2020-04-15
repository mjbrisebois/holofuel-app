SHELL			= /bin/bash

http-server:
	python3 -m http.server 80 > http.log 2>&1 &


.PHONY:

use-local-web-sdk:
	npm uninstall @holo-host/web-sdk; npm install --save ../web-sdk/holo-host-web-sdk-0.1.0.tgz
use-npm-web-sdk:
	npm uninstall @holo-host/web-sdk; npm install --save @holo-host/web-sdk


package-lock.json: package.json
	npm install
	touch $@
node_modules: package-lock.json
	npm install

#
# Sim2h Server
#
check-sim2h:
	ps -efH | grep sim2h_server | grep 9000 | grep -v grep
restart-sim2h:		stop-sim2h start-sim2h
start-sim2h:
	@if [[ $$(ps -efH | grep sim2h_server | grep 9000 | grep -v grep) ]]; then	\
		echo "sim2h is already running on port 9000";				\
	else										\
		echo "Starting sim2h_server on port 9000";				\
		sim2h_server -p 9000 > sim2h.log 2>&1 &					\
	fi
stop-sim2h:
	@if [[ $$(ps -efH | grep sim2h_server | grep 9000 | grep -v grep) ]]; then	\
		echo "Stopping sim2h_server...";					\
		killall sim2h_server || true;						\
	else										\
		echo "sim2h is not running on port 9000";				\
	fi


#
# Holochain Conductor
#
HCC_STORAGE 	= ./conductor
$(HCC_STORAGE):
	mkdir -p $(HCC_STORAGE)
reset-hcc:
	rm $(HCC_STORAGE)/* -rf
conductor.log:
	touch $@
start-hcc:		conductor.toml conductor.log start-sim2h
	holochain -c $< > conductor.log 2>&1 & tail -f conductor.log

conductor.toml:		conductor.template.toml agents Makefile	$(HCC_STORAGE)
	@echo "Creating Holochain conductor config for Agents";				\
	AGENT1_HCID=$$(cat agent-1.hcid);						\
	AGENT2_HCID=$$(cat agent-2.hcid);						\
	SIM2H_URL=ws://localhost:9000;							\
	sed -e "s|AGENT1_HCID|$$AGENT1_HCID|g"						\
	    -e "s|AGENT2_HCID|$$AGENT2_HCID|g"						\
	    -e "s|SIM2H_URL|$$SIM2H_URL|g"						\
	    < $<									\
	    > $@;									\
	echo " ... Wrote new $@ (from $<)"

agents:		agent-1.key.json agent-2.key.json
agent-%.key.json:
	@echo "Creating Holochain key for Agent $*: $@";
	echo $$( hc keygen --nullpass --quiet --path $@)				\
		| while read key _; do							\
			echo $$key > agent-$*.hcid;					\
		done
	@echo "Agent ID: $$(cat agent-$*.hcid)";


#
# Chaperone Server
#
start-chaperone:	agents node_modules
	npx chaperone-server --config chaperone-config.js


#
# Web App
#
build:		node_modules
	npm run build
