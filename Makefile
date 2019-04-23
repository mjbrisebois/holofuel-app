SHELL			= /bin/bash

start-bootstrap-agent-dna:
	cd ~/src/holofuel;								\
	echo "" > bootstrap-agent.output;						\
	HC_N3H_MODE=REAL								\
	HC_N3H_PATH=~/src/n3h								\
	HC_AGENT=testAgent_bootstrap							\
	hc run --networked --logging --port 3000 | tee -a bootstrap-agent.output

start-agent-dna: start-agent-dna-1
start-agent-dna-%:
	cd ~/src/holofuel;								\
	echo "" > agent_$*.output;							\
	IPC=$$( ( tail +1f bootstrap-agent.output & ) | grep -m 1 "\- ipc\:"		\
		| sed 's/[[:space:]]*\- ipc:[[:space:]]*\(.*\)/\1/' );			\
	P2P=$$( ( tail +1f bootstrap-agent.output & ) | grep -m 1 "\- p2p\:"		\
		| sed 's/[[:space:]]*\- p2p:[[:space:]]*\[\"\(.*\)".*/\1/' );		\
	HC_N3H_MODE=REAL								\
	HC_N3H_PATH=~/src/n3h								\
	HC_AGENT=testAgent_$*								\
	HC_N3H_BOOTSTRAP_NODE=$$P2P							\
	HC_N3H_IPC_URI=$$IPC								\
	hc run --networked --logging --port "$$(( 3099 + $* ))" | tee -a agent_$*.output

kill-n3h:
	kill $$( pgrep -f 'n3h' )

# Start the conductors to access the DNA w/ real keys; ...-agent-0 is the "bootstrap" node
# - Copy the conductor-config.toml to conductor-config-agent-N.toml w/ the appropriate changes
# - If keystore-agent-N.key doesn't exist create a new key and symbolic link to it
# - If we try to start an agent 1,2,..., and there isn't yet an output file for Agent 0, we'll start one.
.PHONY: bootstrap serve-%
bootstrap: serve-0

serve-%: conductor-%.toml
	@echo "Starting Holochain w/ config $<..."
	RUST_BACKTRACE=full holochain -c $< 2>&1 | tee conductor-$*.out &
	sleep 10 # actually, wait for output signalling conductor has started...
	@echo "  Started Holochain conductor, into conductor-$*.out"


# Create a conductor configuration using an agent # (1, 2, ...) and a keystore-agent-#.key link (which must link to 
# a filename ending in the public key, eg.
#     $ ls -l keystore-agent-3.key
#     lrwxrwxr-x  1 perry  staff  125 18 Apr 13:58 keystore-agent-3.key -> /Users/p.../keys/HcSCiGvvwq63Yyqa46H3C8OgioEkyt9ye3UF6J9PmINHuyrpUUh7Oisbfrr49da

#$(MAKE) keystore-%.key conductor-0.out conductor.toml.master

.PRECIOUS: conductor-%.toml
conductor-%.toml: keystore-%.key
	@(( $* )) && [ ! -r conductor-0.out ] && $(MAKE) serve-0;			\
	echo "Creating Holochain conductor config for Agent $*...";			\
	AGENT=$*;									\
	PUBKEY=$$( ls -l $< ); PUBKEY=$${PUBKEY##*/};					\
	KEYFILE=$<;									\
	WSPORT=$$(( 3000 + $* ));							\
	UIPORT=$$(( 8800 + $* ));							\
	IPCURI=$$( if (( $* )); then							\
	  sed -n 's/[[:space:]]*\- ipc:[[:space:]]*\(.*\)/\1/p'				\
	    < conductor-0.out;								\
	fi );										\
	BSNODES=$$( if (( $* )); then							\
	  sed -n 's/[[:space:]]*\- p2p:[[:space:]]*\[\([^]]*\)\]/\1/p'			\
	    < conductor-0.out;								\
	fi );										\
	sed -e "s/PUBKEY/$$PUBKEY/g"							\
	    -e "s/KEYFILE/$$KEYFILE/g"							\
	    -e "s/WSPORT/$$WSPORT/g"							\
	    -e "s/UIPORT/$$UIPORT/g"							\
	    -e "s|IPCURI|$$IPCURI|g"							\
	    -e "s|BSNODES|$$BSNODES|g"							\
	    -e "s|AGENT|$$AGENT|g"							\
	    < conductor.toml.master							\
	    > $@;									\
	echo "	Wrote new $@"

# If the target doesn't exist, create a new key. The last segment of the link.  Don't delete it, if
# we do had to create one as an intermediate target.
.PRECIOUS: keystore-%.key
keystore-%.key:
	@echo -n "Creating Holochain key for Agent $*...";				\
	eval $$( hc keygen --nullpass --quiet						\
	  | python -c "import sys;						\
	      print('\n'.join('%s=%s' % ( k, v.strip() )			\
		for (k, v) in zip(['KEY','KEYFILE'], sys.stdin.readlines())))"	\
	);										\
	echo " $@ -> $$KEYFILE";							\
	ln -fs $$KEYFILE $@

