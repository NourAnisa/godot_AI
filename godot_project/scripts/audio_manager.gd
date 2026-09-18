# res://scripts/audio_manager.gd
class_name AudioManager
extends Node

var bgm_player: AudioStreamPlayer
var sfx_pool: Array[AudioStreamPlayer] = []
const POOL_SIZE: int = 8

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	bgm_player = AudioStreamPlayer.new()
	bgm_player.bus = "Music"
	add_child(bgm_player)

	for i in range(POOL_SIZE):
		var p = AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		sfx_pool.append(p)

func play_bgm(stream: AudioStream, fade_in_sec: float = 1.0) -> void:
	if not stream:
		return
	if bgm_player.playing:
		var tween = create_tween()
		tween.tween_property(bgm_player, "volume_db", -80.0, fade_in_sec)
		tween.tween_callback(func():
			bgm_player.stream = stream
			bgm_player.volume_db = 0.0
			bgm_player.play()
		)
	else:
		bgm_player.stream = stream
		bgm_player.volume_db = 0.0
		bgm_player.play()

func play_sfx(stream: AudioStream, pitch_scale: float = 1.0) -> void:
	if not stream:
		return
	for p in sfx_pool:
		if not p.playing:
			p.stream = stream
			p.pitch_scale = pitch_scale
			p.play()
			return
	# Re-use first if all busy
	sfx_pool[0].stream = stream
	sfx_pool[0].pitch_scale = pitch_scale
	sfx_pool[0].play()
