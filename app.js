var udp = require('dgram');
var server = udp.createSocket('udp4');
var funcs = require('./funcs');
var Debug = funcs.Debug;
funcs.setServer(server);

server.on('message', function(buffer, remote){
	funcs.received(buffer, remote);
});

server.bind(20810);