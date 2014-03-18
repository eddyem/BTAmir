#pragma WEBGLU_LIGHTS
attribute vec3 normal;
attribute vec3 vertex;

uniform vec4 color;
uniform vec3 l0_position;	// положение источника (GL_LIGHT_POSITION)
uniform vec3 l0_target;		// точка в направлении источника (почти d, GL_SPOT_DIRECTION)
uniform mat4 ModelViewMatrix;
uniform mat4 ProjectionMatrix;
uniform mat3 NormalMatrix;

//uniform vec3 camera_rotation; // угол вращения камеры

varying vec3 surface_point;
varying vec3 surface_normal;
varying vec4 frontColor;
varying vec3 l_position;
varying vec3 l_target;

void main(void) {
	gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(vertex, 1.0);
	//l_position = (ModelViewMatrix * vec4(l0_position, 1.0)).xyz;
	//l_target = (ModelViewMatrix * vec4(l0_target, 1.0)).xyz;
	surface_normal = normal;
	l_position = l0_position;
	l_target = l0_target;
	frontColor = color;
	surface_point = (ModelViewMatrix * vec4(vertex, 1.0)).xyz;
	//surface_point = vertex;
	//surface_normal= normalize((ModelViewMatrix * vec4(normal,1.0)).xyz);
	//surface_normal= normalize(NormalMatrix * normal);
	//surface_normal =  (ModelViewMatrix * vec4(normal,1.0)).xyz;
}
