shader_type spatial;
render_mode diffuse_toon, specular_toon;

uniform vec4 albedo_color : source_color = vec4(0.4, 0.6, 0.9, 1.0);
uniform sampler2D texture_albedo : source_color, filter_linear_mipmap;
uniform float roughness : hint_range(0.0, 1.0) = 0.5;
uniform float rim_threshold : hint_range(0.0, 1.0) = 0.6;
uniform vec4 rim_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
	vec4 tex_color = texture(texture_albedo, UV);
	ALBEDO = albedo_color.rgb * tex_color.rgb;
	ROUGHNESS = roughness;

	// Rim Light effect (Stylized Edge Glow)
	float rim = 1.0 - dot(NORMAL, VIEW);
	if (rim > rim_threshold) {
		ALBEDO += rim_color.rgb * (rim - rim_threshold) * 1.5;
	}
}