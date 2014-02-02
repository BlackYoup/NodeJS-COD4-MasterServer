require('colors');
var server = require('./server');

var self = exports;
var debug = true;
var allServers = [];

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
    Debug('received ' + strBuffer + ' from ' + remote.address + ':' + remote.port);

    var all = {
        buffer: strBuffer,
        remote: remote
    };
    router(all);
};

exports.sendMessage = function(msgConfig, encoding){
    var header = msgConfig.header || '\xFF\xFF\xFF\xFF';
    var ender = msgConfig.ender || ' \x0a';
    var encoding = encoding || 'binary';

    var buffer = msgConfig.buffer || new Buffer(header + msgConfig.message + ender, encoding);
    self.server.send(buffer, 0, buffer.length, msgConfig.port, msgConfig.address, function(){
        Debug('Sent ' + msgConfig.message + ' at ' + msgConfig.address + ':' + msgConfig.port);
    });
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

function heartbeat(args, remote){
    if(args === 'COD-4'){
        createServer(remote);
    }
    else if(args === 'flatline'){
        deleteServer(remote);
    }
}

function statusResponse(status, rInfos){
    var serverNumber = fetchServer(rInfos.address, rInfos.port);
    if(serverNumber !== false){
        allServers[serverNumber].setStatus(status);
    }
}

function getServers(args, rInfos){
    var tempBuff = new Array();
    tempBuff.push(new Buffer('\xFF\xFF\xFF\xFFgetserversResponse\x00\x0a\x5c', 'binary'));

    for(var i = 0, j = allServers.length; i < j; i++){
        tempBuff.push(allServers[i].ipConfigHex());
    }

    var retBuffer = new Buffer(4096);

    Debug(retBuffer);
    self.sendMessage({
        buffer: retBuffer,
        address: rInfos.address,
        port: rInfos.port
    }, 'hex');
}

function createServer(rInfos){
    if(!checkServer(rInfos)){
        allServers.push(new server.Server({
            address: rInfos.address,
            port: rInfos.port
        }));
        Debug('Server registered at ' + rInfos.address + ':' + rInfos.port);
    }
    else{
        Debug('Server already registered at ' + rInfos.address + ':' + rInfos.port)
    }
}
function checkServer(rInfos){
    return fetchServer(rInfos.ip, rInfos.port);
}

function deleteServer(rInfos){
    var serverNumber = fetchServer(rInfos.address, rInfos.port);
    if(serverNumber !== false){
        allServers.splice(serverNumber, 1);
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