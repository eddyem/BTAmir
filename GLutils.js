GLutils = function(){
const deg2rad = Math.PI / 180.0;
const FieldSize = 20.;
const _2PI = 2 * Math.PI;
var xClick0, yClick0; // начальные координаты щелчка (для вращения "сцены")
var X0, Y0; // начальные координаты щелчка (чтобы отличить вращение от щелчка)
var olddir=0; // начальное направление перемещения мыши (1-влево, -1-вправо)
var sign=0;   // направление вращения картины (1-против, -1-по часовой)
var RotAngle = 0.; // Угол вращения главной плоскости рисунка (вокруг вертикальной оси)
var Zangle = 0.; // Угол вращения по вертикали
const N1ID = 254;
const N2ID = 255;
const SouthID = 253;

var balls = []; // массив для шариков (будет сортироваться по Z)

function $(id){
	return document.getElementById(id);
}

function preventE(e){
	if(e.preventDefault) e.preventDefault();
	if(e.stopPropagation) e.stopPropagation();
}

function startRotate(e){ // обработка щелчка мыши: вращение, либо выбор
	preventE(e);
	xClick0 = X0 = e.clientX;
	yClick0 = Y0 = e.clientY;
	$W.canvas.onmousemove = doRotate;
	$W.canvas.onmouseup = endRotate;
}

function doRotate(evt){ // вращение сцены
	var X = evt.clientX, Y = evt.clientY, R = $W.canvas.clientWidth / 2;
	var Xc = $W.canvas.width/2, Xabs = (xClick0-Xc)/R;
	var Yc = $W.canvas.height/2, Yabs = (yClick0-Yc)/R;
	var dir = (xClick0-X)>0?1:-1;
	var Xabs1 = (X-Xc)/R, Yabs1 = (Y-Yc)/R;
	if(Xabs>1) Xabs=1; else if(Xabs<-1) Xabs=-1;
	if(Yabs>1) Yabs=1; else if(Yabs<-1) Yabs=-1;
	if(Xabs1>1) Xabs1=1; else if(Xabs1<-1) Xabs1=-1;
	if(Yabs1>1) Yabs1=1; else if(Yabs1<-1) Yabs1=-1;
	if(olddir == 0) olddir = dir;
	else if(olddir != dir){olddir = dir; sign = 0;}
	if((Y-yClick0)>0) dir *= -1; // тянут за "заднюю часть"
	var dphi = Math.abs(Math.acos(Xabs1) - Math.acos(Xabs))+
		Math.abs(Math.asin(Yabs1) - Math.asin(Yabs));
	var dz = (Math.asin(Yabs1) - Math.asin(Yabs))/deg2rad;
	xClick0 = X; yClick0 = Y;
	if(Math.abs(X0 - X)+Math.abs(Y0 - Y) > 5.)
		X0 = -100.; Y0 = -100.; // это уже явно вращение - сбрасываем переменные
	if(sign == 0) sign = dir;
	dphi *= sign/deg2rad;
	RotateScene(dphi, dz);
}

function endRotate(evt){ // прекращение вращения или выбор
	var X = evt.clientX, Y = evt.clientY;
	$W.canvas.onmousemove = '';
	$W.canvas.onmouseup = '';
	olddir=sign=0;
	var d = Math.abs(X0 - X) + Math.abs(Y0 - Y);
	// если за время щелчка мышь почти не сместилась, это - выбор
	if(d < 2.5) pick(X, Y);
	else doRotate(evt);
}
/*
function sort_objects(){
	function Z_sort(a, b){
		return (b.Z - a.Z);
	}
	for(var i = 0; i < $W.objects.length; i++){
		var C = $W.camera.position.elements;
		var P = $W.objects[i].position.elements;
		var rsum = 0.;
		for(var j=0; j < 3; j++) rsum += (C[j]-P[j])*(C[j]-P[j]);
		$W.objects[i].Z = rsum;
	}
	$W.objects = $W.objects.sort(Z_sort);
}*/

function RotateScene(dPhi, dZ){ // обновление сцены при вращении
	RotAngle += dPhi;
	Zangle += dZ;
	if(Zangle > 90.) Zangle = 90.;
	else if(Zangle < -90.)  Zangle = -90.;
	if(RotAngle > 360.) RotAngle -= 360.;
	else if(RotAngle < 0.) RotAngle += 360.;
//	sort_objects();
	$W.util.defaultUpdate();
	$W.util.defaultDraw();
}

function wheel(e){ // обновление сцены при изменении масштаба
	//preventE(e);
	$W.util.defaultUpdate();
	$W.util.defaultDraw();
}

var oldmat = new Array(); // массив для хранения "материалов" объектов
function pick(X,Y){ // выбор
	var oX = X; oY = Y;
	Y -= $W.canvas.offsetLeft;
	X -= $W.canvas.offsetTop;
	var ccolr = $W.GL.getParameter($W.GL.COLOR_CLEAR_VALUE);
	var blend = $W.GL.getParameter($W.GL.BLEND);
	if(blend) $W.GL.disable($W.GL.BLEND);
	$W.GL.clearColor(1., 1., 1., 1.); // фон имеет идентификатор "-1"
	$W.pickBuffer.bind(); // активируем "невидимый" буфер
	$W.util.defaultUpdate();
	$W.util.clear();
	$W.util.setupMatrices();
	for (var i = 0; i < $W.objects.length; i++) {
		$W.objects[i].material = MatPick; // сменяем "материал"
	}
	$W.util.defaultDraw(); // отрисовываем объекты
	for (var i = 0; i < $W.objects.length; i++) {
		$W.objects[i].material = oldmat[i]; // восстанавливаем "материалы"
	}
	var pix = new Uint8Array(4);
	$W.GL.readPixels(X,$W.canvas.height-Y,1,1,$W.GL.RGBA, $W.GL.UNSIGNED_BYTE, pix);
	$W.pickBuffer.unbind(); // отключаем буфер
	if(blend) $W.GL.enable($W.GL.BLEND);
	$W.GL.clearColor(ccolr[0],ccolr[1],ccolr[2],ccolr[3]);
	var id = pix[0]+(pix[1]<<8)+(pix[2]<<16)+(pix[3]<<24);
	delete pix;
	var str = null;
	if(!(str  = MirSensors.TempString(id))){
		if(id == N2ID) str = "Nasmyth 2";
		else if(id == N1ID) str = "Nasmyth 1";
		else if(id == SouthID) str = "To south";
	}
	if(str) MirSensors.Msg(str, 3000., oX, oY);
	//else alert(id);
}

function resize_canvas(){
	var W = window.innerWidth;
	with(document.getElementById("canvas")){
		height = window.innerHeight - 8;
		if(height < 50) height = 50;
		width  = W - 8;
		if(width < 50) width = 50;
	}
	var cds = $('temp_min').style;
	cds.left = 5; cds.top  = 15;
	cds = $('temp_max').style
	cds.left = W/2;  cds.top  = 15;
	cds = $('temp_scale').style;
	cds.left = 0; cds.top = 0; cds.width = W/2; cds.height = 15;
}
var MatPick;
function init(){
	window.onresize = function(){
		resize_canvas();
		$W.GL.viewport(0, 0, $W.canvas.width, $W.canvas.height);
		$W.camera.aspectRatio = $W.canvas.width / $W.canvas.height;
		$W.util.defaultUpdate(); // отрисовываем сцену
		$W.util.defaultDraw();
		}
	resize_canvas();
	if (!$W.initialize()) return false;
	with($W){
		useControlProfiles();
		canvas.onmousedown = startRotate;
		GL.clearColor(0.9, 0.9, 1.0, 1.0);
		camera.setPosition(12,0,0);
		camera.yfov = 60.;
		//GL.enable(GL.BLEND);
		//GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
		//GL.disable(GL.DEPTH_TEST);
		//GL.depthFunc(GL.ALWAYS);
	}
	$G.profiles.ScrollToZoomCamera.apply();
	$W.camera.profileUpdates.push(function(camera) {
		var cz = Math.cos(Zangle*deg2rad), sz = Math.sin(Zangle*deg2rad);
		$W.camera.position.elements = [FieldSize*Math.cos(RotAngle*deg2rad)*cz,
								FieldSize*sz,FieldSize*Math.sin(RotAngle*deg2rad)*cz];
	});
	window.addEventListener('DOMMouseScroll', wheel, false);
	// создаем "материал" для буфера выбора
	MatPick = new $W.Material({path:$W.paths.materials + "pick.json"});
	MatPick.setUniformAction('pickColor', function(uniform, object, material){
		var colr = [0.,0.,0.,0.];
		var id = object.id;
		for(var i = 0; i < 4; i++){
			colr[i] = (id & 0xff)/255.;
			id >>= 8;
		}
		$W.GL.uniform4fv(uniform.location, colr); }
	);
	// инициализируем буфер выбора
	try{
		$W.pickBuffer = new $W.Framebuffer();
		$W.pickBuffer.attachTexture($W.GL.RGBA, $W.canvas.width, $W.canvas.height, $W.GL.COLOR_ATTACHMENT0);
		$W.pickBuffer.attachRenderbuffer($W.GL.DEPTH_COMPONENT16, $W.canvas.width, $W.canvas.height, $W.GL.DEPTH_ATTACHMENT);
	}catch (e) {
		console.error(e);
	}
	return true;
}

function drawBall(rad, flags){ // если flags == true, то объект не рендерится (дочерний)
// если же объект самостоятельный, flags можно не определять
	var sphereData = $W.util.genSphere(30,30, rad);
	var ball = new $W.Object($W.GL.TRIANGLES, flags);
	var sphereModel= [
			["vertex", sphereData.vertices ],
			["texCoord", sphereData.texCoords],
			["normal",  sphereData.normals],
			['wglu_elements', sphereData.indices] ];
	ball.fillArrays(sphereModel);
	return ball;
}

function drawCylinder(R, H, n, flags){ // рисуем цилиндр радиуса R, высоты H из
// n боковых прямоугольников
	var v = [], norm = [];
	var C = new $W.Object($W.GL.TRIANGLE_STRIP, flags);
	C.vertexCount = n * 2+2;
	for(var i = -1; i < n; i++){
		var a = _2PI/n*i;
		var cc = Math.cos(a), ss = Math.sin(a);
		v = v.concat([R*cc, R*ss,0.]);
		v = v.concat([R*cc, R*ss,H]);
		norm = norm.concat([cc, ss, 0.]);
		norm = norm.concat([cc, ss, 0.]);
	}
	C.fillArray("vertex", v);
	C.fillArray("normal", norm);
	return C;
}

function drawCircle(R, n, w, flags){ // рисуем окружность радиуса R из n вершин ширины w
// flag - то же, что и в  drawBall
	var v = [];
	var C = new $W.Object($W.GL.LINE_LOOP, flags);
	C.vertexCount = n;
	for(var i = 0; i < n; i++){
		var a = _2PI/n*i;
		v = v.concat([R*Math.cos(a), R*Math.sin(a),0.]);
	}
	C.fillArray("vertex", v);
	if(typeof(w) != "undefined") C.WD = w;
	else C.WD = 1.;
	C.draw = function(){ // переопределяем для возможности изменения ширины линии
		var oldw = $W.GL.getParameter($W.GL.LINE_WIDTH);
		$W.GL.lineWidth(this.WD);
		this.drawAt(
			this.animatedPosition().elements,
			this.animatedRotation().matrix(),
			this.animatedScale().elements
		);
		$W.GL.lineWidth(oldw);
	};
	return C;
}

function createObjects() {
	var Tel = MirSensors.GetCoordinates();
	var Az = Tel.Azimuth, Zen = Tel.Zenith;
	$W.GL.lineWidth(5.);
	/*$W.GL.cullFace($W.GL.FRONT);
	$W.GL.enable($W.GL.CULL_FACE);*/

	var _2D = new $W.Material({path:$W.paths.materials + "2D.json"});

	var grad = new $W.Object($W.GL.LINE_STRIP);
	grad.vertexCount = 11;
	var gV = new Array(), gC = new Array();
	var ggg=grad.vertexCount-1;
	for(var i = 0; i < grad.vertexCount; i++){
		var p = i/ggg;
		gC.push(MirSensors.TGColors(p)); gV.push([p/2., 0.99]);
	}
	grad.fillArray("vertex", gV);
	grad.fillArray("color", gC);
	grad.setMaterial(_2D);
	grad.id = 500;

	var originLines = new $W.Object($W.GL.LINES);
	originLines.vertexCount = 6;
	originLines.fillArray("vertex",
		[[-4,0,0], [-8,0,0], [-7,0,-1], [-8,0,0], [-7,0,1], [-8,0,0]]);
	with ($W.constants.colors){
	  originLines.fillArray("color",
		[ BLUE, RED, RED, RED, RED, RED]);
	}
	originLines.id = SouthID;

    var GL_LIGHT_MODEL_AMBIENT = [ .1,.1,.15,1. ];
	light = {
		position: [0.,0.,24.],
		target:   [0.,0.,0.],
		color:    [1.,1.,1.,1.],
		fieldAngle: 90.,
		exponent: 1.,
		distanceFalloffRatio: 0.004
	};
	var lights = new $W.Material({path:$W.paths.materials + "light.json"});
	lights.setUniformAction('color', function(uniform, object, material){
			$W.GL.uniform4fv(uniform.location, object.color); });
	lights.setUniformAction('camera_position', function(uniform, object, material){
			$W.GL.uniform3fv(uniform.location, $W.camera.position.elements); });
	lights.setUniformAction('camera_direction', function(uniform, object, material){
			$W.GL.uniform3fv(uniform.location, $W.camera.target.elements); });
	lights.setUniformAction('obj_shininess', function(uniform, object, material){
			$W.GL.uniform1f(uniform.location, object.shininess); });
	lights.setUniformAction('obj_emission', function(uniform, object, material){
			$W.GL.uniform4fv(uniform.location, object.emission); });
	lights.setUniformAction('obj_specular', function(uniform, object, material){
			$W.GL.uniform4fv(uniform.location, object.specular); });
	lights.setUniformAction('l0_position', function(uniform, object, material){
			$W.GL.uniform3fv(uniform.location, light.position); });
	lights.setUniformAction('l0_color', function(uniform, object, material){
			$W.GL.uniform4fv(uniform.location, light.color); });
	lights.setUniformAction('l0_target', function(uniform, object, material){
			$W.GL.uniform3fv(uniform.location, light.target); });
	lights.setUniformAction('l0_spot_angle', function(uniform, object, material){
			$W.GL.uniform1f(uniform.location, light.fieldAngle); });
	lights.setUniformAction('l0_exponent', function(uniform, object, material){
			$W.GL.uniform1f(uniform.location, light.exponent); });
	lights.setUniformAction('l0_falloff', function(uniform, object, material){
			$W.GL.uniform1f(uniform.location, light.distanceFalloffRatio); });
	lights.setUniformAction('lmodel_ambient', function(uniform, object, material){
			$W.GL.uniform4fv(uniform.location, GL_LIGHT_MODEL_AMBIENT); });

	// material for lines & circles with different line width
	var line = new $W.Material({path:$W.paths.materials + "points.json"});
	line.setUniformAction('color', function(uniform, object, material){
		$W.GL.uniform4fv(uniform.location, object.color); });
	line.setUniformAction('WD', function(uniform, object, material){
			$W.GL.uniform1f(uniform.location, object.WD); });

    var Pl = drawCircle(4., 30., .05);
    //Pl.setPosition(0.,0.,0.);
    Pl.color = [1.,0.,0.,1.];
    Pl.setMaterial(line);
    Pl.setRotation(0.,90.,Az);

	var Cyl = drawCylinder(0.5,1.5,30, false);
	Cyl.color = [1.,0.,0.,1.];
	Cyl.shininess = 1.;
	Cyl.emission = [0.5, 0., 0., 1.]
	Cyl.specular = [1.,1.,1.,1.];
	// rot : y,x,z
	Cyl.setPosition(0.,-3.5, 0.)
	//Cyl.setRotation(0.,90.,Az);
	//Cyl.setRotation(0.,90.,0.);
	Cyl.setMaterial(lights);
	Cyl.id = N2ID;

	Pl.addChild(Cyl);
/*
	var ball = drawBall(0.05);
	ball.setPosition(light.position);
	ball.setMaterial(lights);
	ball.color = [0.7,0.7,0., 1.];
	ball.shininess = 5.;
	ball.emission = [0., .5, 0., 1.]
	ball.specular = [1.,1.,1.,1.];
	ball.id=1000000;
*/
	var Cyl1 = drawCylinder(0.5,1.5,30, false);
	Cyl1.color = [0.,.5,0.,1.];
	Cyl1.shininess = 1.;
	Cyl1.emission = [0., 0.5, 0., 1.]
	Cyl1.specular = [1.,1.,1.,1.];
	// rot : y,x,z
	Cyl1.setPosition(0.,7., 0.);
	Cyl1.setMaterial(lights);
	Cyl1.id = N1ID;
	Cyl.addChild(Cyl1);

    var C = drawCircle(3., 30., .5, false);
    C.setRotation(Zen,0.,0.);
    C.setPosition(0.,3.5,0.5);
    C.color = [0.,0.,1.,1.];
    C.setMaterial(line);
    Cyl.addChild(C);

	var C1 = drawCircle(3., 30., 1., false);
	C1.setPosition(0.,0.,-0.5);
	C1.color = [0.,1.,0.,1.];
    C1.setMaterial(line);
    C.addChild(C1);

	var sensors = MirSensors.GetSensors();

    for(var i = 0; i < sensors.length; i++){
		var S = sensors[i];
		var ball = drawBall(S.R, false);
		ball.setPosition(S.Position);
		ball.setMaterial(lights);
		ball.color = S.Color;
		ball.shininess = 1.;
		ball.emission = [S.Color[0]/2., S.Color[1]/2., S.Color[2]/2., 1.];
		ball.specular = ball.emission;
		ball.id = S.Id;
		//balls.push(ball);
		C.addChild(ball);
	}
}

function AfterUpdating(){
	createObjects(); // создаем объекты сцены
	// и сохраняем "материалы"
	for (var i = 0; i < $W.objects.length; i++) {
		var o = $W.objects[i];
		oldmat.push(o.material);
	}
	/*var FPS = document.getElementById('overlay');
	$W.update = function() {
		FPS.innerHTML = $W.FPS;
	}*/
	//sort_objects();
	$W.util.defaultUpdate(); // отрисовываем сцену
	$W.util.defaultDraw();
	MirSensors.ClrMsg();
	//$W.start(100);
}

function start() {
	if (init()) {
		MirSensors.UpdateAll(AfterUpdating);
	}
}
return{
	start:	start
};
}();

