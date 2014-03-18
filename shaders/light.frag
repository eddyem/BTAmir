#ifdef GL_ES
precision highp float;
#endif
#define PI 3.141593
#define PI2 PI / 2.
#define PI180 PI / 180.0

// �������� ��������� �����
uniform vec4 l0_color;		// ���� ��������� (l_diffuse = l_specular)
uniform float l0_spot_angle;// ������� ������ ������ ����� ����������
uniform float l0_falloff;	// ������������ ��������� ����� (kq)
uniform float l0_exponent;  // (GL_SPOT_EXPONENT)

// �������� �������, ������ � ������
uniform vec4 obj_emission;    // ���������� �������� ���� (mat_emission)
uniform float obj_shininess;  // ������������ ������� (mat_shininess)
uniform vec3 camera_position; // ��������� ������ (GL_CAMERA_POSITION)
uniform vec3 camera_direction; // ����������� ������
uniform vec4 lmodel_ambient;  // ����� ������� ���� (GL_LIGHT_MODEL_AMBIENT)
uniform vec4 obj_specular;    // ���� ��������� � ����� ����� (mat_specular)

varying vec4 frontColor;      // ���� ����������� (mat_ambient)
varying vec3 surface_point;   // ����� �� �����������
varying vec3 surface_normal;  // � ������� � ������ ��������-������� �������
varying vec3 l_position;      // ����������� ��������� ���������
varying vec3 l_target;        // ����������� ����������� ���������

vec4 getLightContrib(const vec3 point, const vec3 normal, const vec4 color);

float spot_angle = l0_spot_angle * PI180;
vec3 l0_spot_dir = normalize(l_target - l_position);

void main(void) {
	gl_FragColor = getLightContrib(surface_point, surface_normal, frontColor);
	//if(gl_FragColor.a < 0.5) discard;
}

/*
 * ������ ����� � ������ openGL ��� i ���������� ���������� �� �������
 * result_Color = mat_emission
 * 		+ lmodel_ambient * mat_ambient
 * 		Sum_i(D * S * [l_ambient * mat_ambient + max{dot(L,n),0}*l_diffuse*mat_diffuse
 * 			+ max{dot(s,n),0}^mat_shininess * l_specular * mat_specular
 * 			)
 *
 * ���
 * result_Color - �������� ���� �������
 * mat_X - �������� ���������
 * l_X - �������� i-�� ��������� �����
 * emission - ���������� ���� (�.�. �������� - �������� �����)
 * lmodel_ambient - ����� ���������� ���� ������ ��������� (�� ������� �� ����������,
 * 		�.�. ��� - ������� ����)
 * ambient - ������� ���� (���� ��������� ��� ���������� �����,
 * 		���������� �������� ������������ i-�� ��������� �����)
 * D - ����������� ���������� �����, D = 1/(kc + kl*d + kq*d^2)
 * 		d - ���������� �� ��������� �� �������
 * 		kc - ���������� ����������� ���������� ("����� ������")
 * 		kl - �������� ����������� ���������� (��, � ���������� ������ ����� ���)
 * 		kq - ������������ ����������� ����������
 * S - ������ ����������, ����������� ���:
 * 		= 1, ���� �������� ����� - �� ��������� (���������� ��������� ������������ �����)
 * 		= 0, ���� �������� - ���������, �� ������� ��� ������ ���������
 * 		= max{dot(v,dd),0}^GL_SPOT_EXPONENT � ��������� �������, �����
 * 			v - ������������� ������ �� ���������� (GL_POSITION) � �������,
 * 			dd (GL_SPOT_DIRECTION) - ���������� ����������
 * L = -v (������������� ������ �� ������� � ���������)
 * n - ������� � �������
 * diffuse - ���������� ����, �� ������� �� ���� �������/���������
 * s - ������������� ������, ������ ����� L � ������� �� ������� � �����
 * shininess - ������� ������ (�� 0 �� 128, ��� ������, ��� ������ ������ �����)
 * specular - ���� ����������� ����������
 *
 * � �������� ����� ���������� � ������� ���� ��������� - ���� � �� ��,
 * l_ambient ������������ ������ �������,
 * � l_diffuse = l_specular == l_color, �������
 * result_Color = mat_emission
 * 		+ lmodel_ambient * mat_ambient
 * 		+ Sum_i(D * S * l_color * [max{dot(L,n),0} * mat_ambient
 * 			+ max{dot(s,n),0}^mat_shininess * mat_specular]
 * 			)
 * , D =  1/kq*d^2, kq = l_falloff
 */

vec4 getLightContrib(const vec3 point, const vec3 normal, const vec4 color){
	vec3 l0_line_to_point = l_position - point;
	float d = length(l0_line_to_point);
	//float NdL = dot(-normal, l0_spot_dir); // �-� ������������ �������
	vec3 l0_dir = normalize(l0_line_to_point); // L, ������������� ����������� �� ������� � �����
	float NdL = dot(normal, l0_dir); // �-� ������������ �������
	float cos_vertex = dot(l0_dir, -l0_spot_dir); // ������� ���� ����� ������ � ������������ �� �������
	float cos_beam = cos(spot_angle/2.); // ������� ���������� ���� ����������
	vec3 s = normalize(l0_dir+normalize(camera_position-point));
	float D;
	if(l0_falloff == 0.)
		D = 1.;
	else
		D = 1./l0_falloff/(d*d+1.); // ����������� ���������

	float S = 0.;
	if(l0_spot_angle >= 180.) S = 1.; // �� ���������
	else if(NdL > 0. && cos_beam < cos_vertex){ // ������� ������ ������
		const float cos_min = 0.1;
		float k = (cos_vertex - cos_beam > cos_min) ? 1. : sin(cos_vertex - cos_beam) / sin(cos_min);
		S = pow(max(cos_vertex, 0.), l0_exponent) * k;
	}
	float dotsn = dot(s,normal);
	//float dotsn = dot(l0_dir,normal);
	return vec4(obj_emission + lmodel_ambient*frontColor
		+ D * S * l0_color * (max(NdL, 0.) * frontColor
			+ pow(max(dotsn, 0.), obj_shininess)*obj_specular));//).rgb,
				//max(dot(normal, -normalize(camera_position-camera_direction)),0.));
				//-u+u*max(dot(-normal, normalize(camera_position-point)), 0.));
}



/*
float _2PI = 2.*PI;

vec4 f(float x, float y,vec2 mid) {
    float r, g, b;
	const float Rmax = 0.5;
    r = sin(x*_2PI/0.1);
    g = cos(y*_2PI/0.15);
	float R = x*x + y*y;
    b = R < Rmax ? pow(cos(R*PI/Rmax/2.),2.) : 0.;
	vec2 lightpos = vec2(sin(3.),cos(3.))/2.;
	float Rl = pow(x-lightpos.x,2.)+pow(y-lightpos.y,2.);
	if(Rl<0.05){r+=sin(Rl*_2PI/0.05)*(0.05-Rl)/0.05;
		   g-=cos(Rl*_2PI/0.05)*(0.05-Rl)/0.05;
		   }
    return vec4(r, g, b, 1.);
}

void main( void ) {
vec2 resolution = vec2(400.,600.);
float X = resolution.x > resolution.y ? resolution.y : resolution.x;
vec2 position = gl_FragCoord.xy / X;
	vec2 mid = resolution / X / 2.;
position -= mid;
    gl_FragColor = f(position.x, position.y,mid);

}
*/
