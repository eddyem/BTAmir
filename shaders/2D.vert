attribute vec2 vertex;
attribute vec3 color;

varying vec4 frontColor;

void main(void) {
    frontColor = vec4(color,1.0);
    gl_Position = vec4(vertex.x*2.-1., vertex.y*2.-1., 0.0, 1.0);
}  
