exports.Server = function(rInfos){
	var funcs = require('./funcs');
	var ip = rInfos.address;
	var port = rInfos.port;
	var challenge = new Date().getTime();
	var myStatus = {};
	var self = this;

	this.getIP = function(){
		return ip;
	};
	this.getPort = function(){
		return port;
	};
	this.getchallenge = function(){
		return challenge;
	};
	this.setStatus = function(status){
		var splitted = status.split('\\');
		splitted.splice(0, 1);
		for(var i = 0, j = splitted.length; i < j; i += 2){
			myStatus[splitted[i]] = splitted[i + 1];
		}
	};
	this.ipConfigHex = function(){
		var ret = '';
		var splittedIP = ip.split('.');
		for(var i = 0, j = splittedIP.length; i < j; i++){
			var temp = parseInt(splittedIP[i]);
			if(temp < 10){
				ret += (0 + '' + temp.toString(16));
			}
			else{
				ret += temp.toString(16);
			}
		}
		ret += '' + parseInt(port).toString(16);
		return ret;
	};
	this.updateStatus = function(){
		funcs.sendMessage({
			address: ip,
			port: port,
			message: 'getstatus -' + challenge,
			complete: function(){
				funcs.Debug('Sent getstatus command to ' + rInfos.address + ':' + rInfos.port);
			}
		});
	};

	function init(){
		funcs.sendMessage({
			address: ip,
			port: port,
			message: 'getchallenge -' + challenge,
			complete: function(){
				funcs.Debug('Sent challenge to ' + rInfos.address + ':' + rInfos.port);
			}
		});
		self.updateStatus();
	}
	init();
}