shader_type spatial;
render_mode cull_disabled, diffuse_toon;

uniform vec4 grass_color_top : source_color = vec4(0.3, 0.8, 0.4, 1.0);
uniform vec4 grass_color_bottom : source_color = vec4(0.15, 0.4, 0.2, 1.0);
uniform float wind_speed : hint_range(0.1, 5.0) = 1.5;
uniform float wind_strength : hint_range(0.0, 1.0) = 0.25;

void vertex() {
	// Only bend the top part of the blade (UV.y < 0.5)
	float bend = (1.0 - UV.y) * wind_strength;
	float wave = sin(TIME * wind_speed + VERTEX.x * 2.0 + VERTEX.z * 1.5);
	VERTEX.x += wave * bend;
	VERTEX.z += wave * bend * 0.5;
}

void fragment() {
	ALBEDO = mix(grass_color_bottom.rgb, grass_color_top.rgb, 1.0 - UV.y);
	ROUGHNESS = 0.8;
}