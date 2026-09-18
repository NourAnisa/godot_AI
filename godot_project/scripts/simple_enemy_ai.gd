extends CharacterBody3D
class_name SimpleEnemyAI

## ====================================================================
## SimpleEnemyAI - Finite State Machine (FSM) AI untuk Pembelajaran Game
## State: IDLE (Diam) -> PATROL (Patroli) -> CHASE (Kejar) -> ATTACK (Serang)
## ====================================================================

enum State { IDLE, PATROL, CHASE, ATTACK }

@export var player_target: Node3D
@export var speed_patroli: float = 2.5
@export var speed_kejar: float = 4.2
@export var radius_deteksi: float = 12.0
@export var radius_serang: float = 2.0

var current_state: State = State.IDLE
var timer_state: float = 0.0
var target_titik_patroli := Vector3.ZERO
var gravitasi: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _ready() -> void:
	pilih_titik_patroli_baru()

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravitasi * delta

	# Evaluasi transisi State berdasarkan jarak ke pemain
	var jarak_ke_player: float = 999.0
	if is_instance_valid(player_target):
		jarak_ke_player = global_position.distance_to(player_target.global_position)

	match current_state:
		State.IDLE:
			velocity.x = lerpf(velocity.x, 0.0, delta * 5.0)
			velocity.z = lerpf(velocity.z, 0.0, delta * 5.0)
			timer_state += delta
			if jarak_ke_player <= radius_deteksi:
				ubah_state(State.CHASE)
			elif timer_state > 3.0:
				pilih_titik_patroli_baru()
				ubah_state(State.PATROL)

		State.PATROL:
			var arah := (target_titik_patroli - global_position)
			arah.y = 0
			if arah.length() < 1.0 or timer_state > 6.0:
				ubah_state(State.IDLE)
			else:
				arah = arah.normalized()
				velocity.x = arah.x * speed_patroli
				velocity.z = arah.z * speed_patroli
				look_at(global_position + arah, Vector3.UP)
			
			if jarak_ke_player <= radius_deteksi:
				ubah_state(State.CHASE)

		State.CHASE:
			if jarak_ke_player <= radius_serang:
				ubah_state(State.ATTACK)
			elif jarak_ke_player > radius_deteksi * 1.3:
				ubah_state(State.IDLE)
			else:
				var arah := (player_target.global_position - global_position)
				arah.y = 0
				arah = arah.normalized()
				velocity.x = arah.x * speed_kejar
				velocity.z = arah.z * speed_kejar
				look_at(global_position + arah, Vector3.UP)

		State.ATTACK:
			velocity.x = 0
			velocity.z = 0
			if jarak_ke_player > radius_serang:
				ubah_state(State.CHASE)

	move_and_slide()

func ubah_state(state_baru: State) -> void:
	current_state = state_baru
	timer_state = 0.0

func pilih_titik_patroli_baru() -> void:
	var offset_x = randf_range(-8.0, 8.0)
	var offset_z = randf_range(-8.0, 8.0)
	target_titik_patroli = global_position + Vector3(offset_x, 0, offset_z)