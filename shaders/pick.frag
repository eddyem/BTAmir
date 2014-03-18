#ifdef GL_ES
precision highp float;
#endif
varying vec4 FrontColor;
void main(void) {
    gl_FragColor = FrontColor;
} 
