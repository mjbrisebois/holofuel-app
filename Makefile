

start-bootstrap-agent-dna:
	cd ~/src/holofuel;								\
	echo "" > bootstrap-agent.output;						\
	echo HC_N3H_PATH=~/src/n3h							\
	HC_AGENT=testAgent1								\
	hc run --logging --port 3000 | tee -a bootstrap-agent.output;			\
	HC_N3H_PATH=~/src/n3h								\
	HC_AGENT=testAgent1								\
	hc run --logging --port 3000 | tee -a bootstrap-agent.output

start-agent-dna:
	cd ~/src/holofuel;								\
	echo "" > agent.output;								\
	IPC=$$( ( tail +1f bootstrap-agent.output & ) | grep -m 1 "\- ipc\:"		\
		| sed 's/[[:space:]]*\- ipc:[[:space:]]*\(.*\)/\1/' );			\
	P2P=$$( ( tail +1f bootstrap-agent.output & ) | grep -m 1 "\- p2p\:"		\
		| sed 's/[[:space:]]*\- p2p:[[:space:]]*\[\"\(.*\)".*/\1/' );		\
	HC_N3H_PATH=~/src/n3h								\
	HC_AGENT=testAgent2								\
	HC_N3H_BOOTSTRAP_NODE=$$P2P							\
	HC_N3H_IPC_URI=$$IPC								\
	hc run --logging --port 3100 | tee -a agent.output

kill-n3h:
	kill $$( pgrep -f 'n3h' )
