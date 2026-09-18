shader_type spatial;
render_mode specular_toon;

uniform vec4 water_color : source_color = vec4(0.1, 0.5, 0.8, 0.85);
uniform vec4 foam_color : source_color = vec4(0.9, 0.95, 1.0, 1.0);
uniform float wave_speed : hint_range(0.1, 4.0) = 1.0;
uniform float wave_height : hint_range(0.0, 1.0) = 0.15;

void vertex() {
	float wave = sin(TIME * wave_speed + VERTEX.x * 3.0) * cos(TIME * wave_speed + VERTEX.z * 2.5);
	VERTEX.y += wave * wave_height;
}

void fragment() {
	ALBEDO = water_color.rgb;
	ALPHA = water_color.a;
	ROUGHNESS = 0.1;
	SPECULAR = 0.8;
}