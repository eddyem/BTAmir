#ifdef GL_ES
precision highp float;
#endif
#define PI 3.141593
#define PI2 PI / 2.
#define PI180 PI / 180.0

// свойства источника света
uniform vec4 l0_color;		// цвет источника (l_diffuse = l_specular)
uniform float l0_spot_angle;// угловая ширина конуса света прожектора
uniform float l0_falloff;	// квадратичное затухание света (kq)
uniform float l0_exponent;  // (GL_SPOT_EXPONENT)

// свойства объекта, камеры и модели
uniform vec4 obj_emission;    // излучаемый объектом свет (mat_emission)
uniform float obj_shininess;  // отражаемость объекта (mat_shininess)
uniform vec3 camera_position; // положение камеры (GL_CAMERA_POSITION)
uniform vec3 camera_direction; // направление камеры
uniform vec4 lmodel_ambient;  // общий фоновый свет (GL_LIGHT_MODEL_AMBIENT)
uniform vec4 obj_specular;    // цвет материала в белом блике (mat_specular)

varying vec4 frontColor;      // цвет поверхности (mat_ambient)
varying vec3 surface_point;   // точка на поверхности
varying vec3 surface_normal;  // и нормаль с учетом модельно-видовой матрицы
varying vec3 l_position;      // вычисленное положение источника
varying vec3 l_target;        // вычисленное направление источника

vec4 getLightContrib(const vec3 point, const vec3 normal, const vec4 color);

float spot_angle = l0_spot_angle * PI180;
vec3 l0_spot_dir = normalize(l_target - l_position);

void main(void) {
	gl_FragColor = getLightContrib(surface_point, surface_normal, frontColor);
	//if(gl_FragColor.a < 0.5) discard;
}

/*
 * Расчет света в модели openGL для i источников проводится по формуле
 * result_Color = mat_emission
 * 		+ lmodel_ambient * mat_ambient
 * 		Sum_i(D * S * [l_ambient * mat_ambient + max{dot(L,n),0}*l_diffuse*mat_diffuse
 * 			+ max{dot(s,n),0}^mat_shininess * l_specular * mat_specular
 * 			)
 *
 * где
 * result_Color - итоговый цвет вершины
 * mat_X - свойства материала
 * l_X - свойства i-го источника света
 * emission - излучаемый свет (т.е. материал - источник света)
 * lmodel_ambient - общий рассеянный свет модели освещения (не зависит от источников,
 * 		т.е. это - фоновый свет)
 * ambient - фоновый свет (цвет материала вне источников света,
 * 		рассеянная световая составляющая i-го источника света)
 * D - коэффициент ослабления света, D = 1/(kc + kl*d + kq*d^2)
 * 		d - расстояние от источника до вершины
 * 		kc - постоянный коэффициент ослабления ("серый фильтр")
 * 		kl - линейный коэффициент ослабления (ХЗ, в реальности такого вроде нет)
 * 		kq - квадратичный коэффициент ослабления
 * S - эффект прожектора, вычисляется так:
 * 		= 1, если источник света - не прожектор (бесконечно удаленный параллельный пучок)
 * 		= 0, если источник - прожектор, но вершина вне конуса излучения
 * 		= max{dot(v,dd),0}^GL_SPOT_EXPONENT в остальных случаях, здесь
 * 			v - нормированный вектор от прожектора (GL_POSITION) к вершине,
 * 			dd (GL_SPOT_DIRECTION) - ориентация прожектора
 * L = -v (нормированный вектор от вершины к источнику)
 * n - нормаль к вершине
 * diffuse - рассеянный свет, не зависит от угла падения/отражения
 * s - нормированный вектор, равный сумме L и вектора от вершины к глазу
 * shininess - степень блеска (от 0 до 128, чем больше, тем меньше размер блика)
 * specular - цвет зеркального компонента
 *
 * в реальной жизни рассеянный и фоновый цвет материала - одно и то же,
 * l_ambient определяется только моделью,
 * а l_diffuse = l_specular == l_color, поэтому
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
	//float NdL = dot(-normal, l0_spot_dir); // к-т освещенности вершины
	vec3 l0_dir = normalize(l0_line_to_point); // L, нормированное направление от вершины к свету
	float NdL = dot(normal, l0_dir); // к-т освещенности вершины
	float cos_vertex = dot(l0_dir, -l0_spot_dir); // косинус угла между светом и направлением на вершину
	float cos_beam = cos(spot_angle/2.); // косинус полуширины угла прожектора
	vec3 s = normalize(l0_dir+normalize(camera_position-point));
	float D;
	if(l0_falloff == 0.)
		D = 1.;
	else
		D = 1./l0_falloff/(d*d+1.); // коэффициент затухания

	float S = 0.;
	if(l0_spot_angle >= 180.) S = 1.; // не прожектор
	else if(NdL > 0. && cos_beam < cos_vertex){ // вершина внутри конуса
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
