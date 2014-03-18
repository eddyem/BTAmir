attribute vec3 vertex;

uniform mat4 ProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform float WD;
uniform vec4 color;


varying vec4 frontColor;

void main(void) {
    gl_PointSize = WD;
//    gl_LineWidth = WD;
//float gl_ClipDistance[] - Массив расстояний до плоскостей отсечения
    frontColor = color;
    gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(vertex, 1.0);
}

