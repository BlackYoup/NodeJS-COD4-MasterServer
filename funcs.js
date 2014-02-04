require('colors');
var server = require('./server');

var self = exports;
var debug = true;
var allServers = [];
var actualBuffer;

exports.server;

exports.Debug = Debug = function(debugDatas){
    if(debug){
        var time = new Date();
        var logTime = '['+(time.getUTCHours() < 10 ? '0' : '')+time.getUTCHours()+'h'+(time.getUTCMinutes() < 10 ? '0' : '')+time.getUTCMinutes()+':'+(time.getUTCSeconds() < 10 ? '0' : '')+time.getUTCSeconds()+']';
        var logTimeColor = logTime.cyan;
        var debugColor = '[DEBUG] - '.red;

        if(typeof debugDatas === 'string'){
            var all = debugDatas.split('\n');
            for(var i = 0, j = all.length; i < j; i++){
                if(all[i] === ''){
                    continue;
                }
                console.log(logTimeColor + debugColor + all[i]);
            }
        }
        else{
            console.log(logTimeColor + debugColor);
            console.log(debugDatas);
        }
    }
};

exports.setServer = function(udp){
    self.server = udp;
};

exports.received = function(buffer, remote){
    var strBuffer = clean(buffer);

    var all = {
        buffer: strBuffer,
        remote: remote
    };
    router(all);
};

exports.sendMessage = function(msgConfig){
    var header = msgConfig.header || '\xFF\xFF\xFF\xFF';
    var ender = msgConfig.ender || ' \x0a';
    var encoding = msgConfig.encoding || 'binary';

    var buffer = msgConfig.buffer || new Buffer(header + msgConfig.message + ender, encoding);
    self.server.send(buffer, 0, buffer.length, msgConfig.port, msgConfig.address, msgConfig.complete);
};

function router(infos){
    var command = infos.buffer.substr(0, infos.buffer.indexOf(' ')).trim();
    var args = infos.buffer.substr(infos.buffer.indexOf(' ') + 1).trim();

    switch(command){
        case 'heartbeat':
            heartbeat(args, infos.remote);
        break;
        case 'statusResponse':
            statusResponse(args, infos.remote);
        break;
        case 'getservers':
            getServers(args, infos.remote);
        break;
    }
}

function heartbeat(args, rInfos){
    if(args === 'COD-4'){
        Debug('Received heartbeat from ' + rInfos.address + ':' + rInfos.port);
        createServer(rInfos);
    }
    else if(args === 'flatline'){
        Debug('Received flatline (quit) from ' + rInfos.address + ':' + rInfos.port);
        deleteServer(rInfos);
    }
}

function statusResponse(status, rInfos){
    Debug('Received status response from ' + rInfos.address + ':' + rInfos.port);
    var serverNumber = fetchServer(rInfos.address, rInfos.port);
    if(serverNumber !== false){
        allServers[serverNumber].setStatus(status);
    }
}

function updateBuffer(){
    var allBuff = [];

    allBuff.push(new Buffer('\xFF\xFF\xFF\xFFgetserversResponse\x0a\x00\x5c', 'binary'));

    for(var i = 0, j = allServers.length; i < j; i++){
        allBuff.push(new Buffer(allServers[i].ipConfigHex(), 'hex'));
        allBuff.push(new Buffer('\x5c', 'binary'));
    }

    allBuff.push(new Buffer('\E\O\T', 'binary'));

    actualBuffer = Buffer.concat(allBuff);
}

function getServers(args, rInfos){
    Debug('Received getservers command from ' + rInfos.address + ':' + rInfos.port);
    self.sendMessage({
        buffer: actualBuffer,
        address: rInfos.address,
        port: rInfos.port,
        complete: function(){
            Debug('Sent getserversResponse to ' + rInfos.address + ':' + rInfos.port);
        }
    });
}

function createServer(rInfos){
    var serverNumber = fetchServer(rInfos.address, rInfos.port);
    if(serverNumber === false){
        allServers.push(new server.Server({
            address: rInfos.address,
            port: rInfos.port
        }));
        updateBuffer();
        Debug('Server registered at ' + rInfos.address + ':' + rInfos.port);
    }
    else{
        allServers[serverNumber].updateStatus();
    }
}

function deleteServer(rInfos){
    var serverNumber = fetchServer(rInfos.address, rInfos.port);
    if(serverNumber !== false){
        allServers.splice(serverNumber, 1);
        updateBuffer();
        Debug('Server deleted at ' + rInfos.address + ':' + rInfos.port);
    }
}

function fetchServer(ip, port){
    var ret = false;
     for(var i = 0, j = allServers.length; i < j; i++){
        if(allServers[i].getIP() === ip && allServers[i].getPort() === port){
            ret = i;
            break;
        }
    }
    return ret;
}

function clean(buffer){
    var regex = new RegExp('\\s', 'g');
    return buffer.toString('utf-8', 4, buffer.length).replace(regex, ' ');
}