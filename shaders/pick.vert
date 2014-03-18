attribute vec3 vertex;

uniform vec4 pickColor;
uniform mat4 ProjectionMatrix;
uniform mat4 ModelViewMatrix;

//varying vec4 view;
varying vec4 FrontColor;

void main(void) {
    gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(vertex, 1.);
    FrontColor = pickColor;
}
