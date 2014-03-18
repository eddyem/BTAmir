MirSensors = function(){

Array.prototype.max = function() {
	var i, l = this.length, Max = -300.;
	for(i = 0; i < l; i++) if(this[i] > Max) Max = this[i];
	return Max;
}
Array.prototype.min = function() {
	var i, l = this.length, Min = 1000.;
	for(i = 0; i < l; i++) if(this[i] < Min) Min = this[i];
	return Min;
}
function $(id){
	return document.getElementById(id);
}

const SNUM = 26;
var GlobTemp = new Array(SNUM); // температуры датчиков
var TelAz = 0; var TelZ = 0; // азимут и зенитное расстояние телескопа
var MaxTemp, MinTemp;
var RetFN; // функция, которая будет исполняться после того, как все обновится

const SenPos = [
	[ 4.3, -1.3, -1], // 1
	[ 5.4, -1.7, -1], // 2
	[ 5.7, -1.2,  0], // 3
	[  0 , -4.4, -1], // 4
	[  0 , -5.8, -1], // 5
	[ 0.5, -5.7,  0], // 6
	[-4.2,  1.2, -1], // 7
	[-5.5,  1.5, -1], // 8
	[-5.6,  1.2,  0], // 9
	[  0 ,  4.3, -1], // 10
	[  0 ,  5.9, -1], // 11
	[-0.5,  5.8,  0], // 12
	[  0 , -0.5,  0], // 13
	[  0 ,  0.5,  0], // 14
	[ -5 ,  1.7, -1], // 15
	[-5.4,  1.9,  0], // 16
	[ 0.2, -1.4, -1], // 17
	[ 0.7, -1.4, -1], // 18
	[ 1.2, -1.4, -1], // 19
	[ 1.6, -1.4, -1], // 20
	[ 5.1,  -2 , -1], // 21
	[ 5.4, -2.1,  0], // 22
	[-0.3, -5.5, -1], // 23
	[-0.5, -5.8,  0], // 24
	[ 0.3,  5.3, -1], // 25
	[ 0.6,  5.8,  0]  // 26
];

// timeout for floating message
var MsgTimeout = 0;
/*
 * show floating message
 * str - string to show
 * timeout - message timeout (if 0, show till ClearMessage() call)
 * 3rd & 4th arguments - message position;
 * 		if (-1) - middle of window
 * 		if omited - 30,30
 */
function Message(str, timeout){
	ClearMessage();
	var Nargs = Message.arguments.length;
	var X = 30, Y = 30;
	var MsgDiv = $('feedback');
	var W = [document.body.clientWidth, document.body.clientHeight];
	MsgDiv.innerHTML = str;
	var sz = W.min()/30.; if(sz < 6) sz = 6;
	MsgDiv.style.fontSize = sz;
	MsgDiv.hidden = false;
	if(Nargs > 2){
		X = Message.arguments[2];
		if(X == -1) X = W[0]/2. - MsgDiv.clientWidth/2.;
	}//else X = event.clientX;
	if(Nargs > 3){
		var H = MsgDiv.clientHeight;
		Y = Message.arguments[3];
		if(Y == -1) Y = W[1]/2. - H/2.;
		else  Y -= H;
	}//else Y = event.clientY;
	MsgDiv.style.left = X+"px"; MsgDiv.style.top = Y+"px";
	if(timeout) MsgTimeout = setTimeout(ClearMessage, timeout);
}

function ClearMessage(){
	//$('feedback').innerHTML = "";
	clearTimeout(MsgTimeout);
	$('feedback').hidden = true;
}

function to16(v){
	var vh = parseInt(v).toString(16);
	if(vh.length == 1) vh = '0' + vh;
	return vh;
}


function getC(Temp){
	if(Temp === undefined) return [0.4,0.4,0.4,0.4];
	var i, r, g, b, dT = (MaxTemp - MinTemp)/4, Ti;
	i = Math.floor( (Temp - MinTemp) / dT);
	Ti = (Temp - MinTemp - dT * i) / dT;
	switch(i){
		case 0:
			r = 0.;
			g = Ti;
			b = 1.;
		break;
		case 1:
			r = 0.;
			g = 1.;
			b = 1. - Ti;
		break;
		case 2:
			r = Ti;
			g = 1.;
			b = 0.;
		break;
		case 3:
			r = 1.;
			g = 1. - Ti;
			b = 0.;
		break;
		default:
			if(i>3){r=1.; g=0.; b=0.;}
			if(i<0){r=0.; g=0.; b=0.;}
	}
	return [r, g, b];
}
function getColor(Temp){
	var C = getC(Temp);
	return [C[0],C[1],C[2],1.];
}

function Sensor(Id, T, R){
	var genVal = function() {return Math.random() * 3. - 1.5;}
	this.Id = Id;
	this.Temp = T;
	this.R = (T === undefined) ? R/3.:R;
	var pos = SenPos[Id];
	this.Position = [pos[1]/2., -pos[0]/2., pos[2]/2.];
	this.Color = getColor(T);
	return this;
}

function UpdateAll(retfunct){
	Message("Please, wait", 0, -1, -1);
	RetFN = retfunct;
	sendrequest("http://tb.sao.ru/cgi-bin/eddy/bta_pos.cgi", "", parseCoords);
}

function parseCoords(req){
	var i, args;
	var data = req.responseText.split(' ');
	var l = data.length;
	for(i=0; i<l; i++){
		args = data[i].split('=');
		switch(args[0]){
			case "telA": TelAz = Number(parseFloat(args[1]).toFixed(2)); break;
			case "telZ": TelZ  = Number(parseFloat(args[1]).toFixed(2)); break;
		}
	}
	sendrequest("http://acs.sao.ru/cgi-bin/eddy/can_req.cgi", "", parseTemp);
}

function parseTemp(req){
	var i, l, n, t;
	var lines = req.responseText.split('\n');
	l = lines.length;
	for(i=0; i<l; i++){
		var args = lines[i].split(' ');
		if(args[0].indexOf("t_mirror_") > -1){
			n = Number(parseInt(args[0].substr(9))); // номер датчика
			t = Number(parseFloat(args[3]).toFixed(1)); // температура
			GlobTemp[n] = t;
		}
	}
	MaxTemp = GlobTemp.max();
	MinTemp = GlobTemp.min();
	$('temp_min').innerHTML = MinTemp;
	$('temp_max').innerHTML = MaxTemp;
	RetFN();
}

function sendrequest(CGI_PATH, req_STR, fn_OK){
	var timeout_id, str;
	var request = new XMLHttpRequest();
	request.open("POST", CGI_PATH, true);
	request.setRequestHeader("Accept-Charset", "koi8-r");
	request.overrideMimeType("multipart/form-data;");
	request.onreadystatechange=function(){
		if(request.readyState == 4){
			if(request.status == 200){
				clearTimeout(timeout_id);
				fn_OK(request);
			}
			else{
				clearTimeout(timeout_id);
				alert("Error: can't connect to data server");
				fn_OK(request);
			}
		}
	}
	request.send(req_STR);
	timeout_id = setTimeout(function(){
			request.onreadystatechange=null; request.abort();
		}, 1500);
}

// return object - telescope coordinates (Azimuth, Zenith)
function GetCoords(){
	this.Azimuth = TelAz;
	this.Zenith  = TelZ;
	return this;
}

// return array of objects - sensors (Id, Temp, R, Position, Color)
function GetS(){
	delete Sensors;
	var Sensors = new Array();
	for(var i = 0; i < SNUM; i++){
		var S = new Sensor(i, GlobTemp[i], 0.2);
		Sensors.push(S);
	}
	return Sensors;
}

// return a string with id's sensor T
function TempString(id){
	var str = null;
	if(id > -1 && id < SNUM){
		str = "Sensor " + id + ": ";
		if(GlobTemp[id] === undefined) str += "N/A";
		else str += "T="+GlobTemp[id];
	}
	return str;
}

function ShowTemp(evt){
	var cds = $('temp_ptr').style, X = evt.clientX;
	var x = MinTemp+(MaxTemp-MinTemp)*(X / window.innerWidth * 2);
	cds.top = 15; cds.left = X;
	$('temp_ptr').innerHTML = x.toFixed(1);
}

// return color for temperature min+(max-min)*x
function TGColors(x){
	return getC(MinTemp+(MaxTemp-MinTemp)*x);
}

return{
	UpdateAll: UpdateAll,
	GetSensors:	GetS,
	GetCoordinates: GetCoords,
	TempString: TempString,
	Msg: Message,
	TGColors: TGColors,
	ClrMsg: ClearMessage,
	ShowTemp: ShowTemp
};
}();
