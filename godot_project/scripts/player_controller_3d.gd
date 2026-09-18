extends CharacterBody3D
class_name PlayerController3D

## ====================================================================
## PlayerController3D - Skrip Karakter Edukatif untuk Mahasiswa
## Konsep: Kinematika, Gravitasi, Input Polling, Vector Math & Lerp
## ====================================================================

@export_group("Pengaturan Kecepatan")
@export var jalan_speed: float = 5.0
@export var sprint_speed: float = 8.5
@export var jump_velocity: float = 4.5
@export var percepatan_lerp: float = 10.0

@export_group("Pengaturan Kamera")
@export var sensitivitas_mouse: float = 0.003
@export var node_kamera: Camera3D

# Gravitasi default dari Project Settings Godot
var gravitasi: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var rotasi_x_kamera: float = 0.0

func _ready() -> void:
	# Kunci kursor mouse ke tengah layar untuk kontrol FPS/TPS
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
	# Kontrol rotasi kamera berdasarkan pergerakan mouse
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		# Rotasi horizontal karakter (Yaw - sumbu Y)
		rotate_y(-event.relative.x * sensitivitas_mouse)
		
		# Rotasi vertikal kamera (Pitch - sumbu X)
		if node_kamera:
			rotasi_x_kamera = clampf(rotasi_x_kamera - event.relative.y * sensitivitas_mouse, -deg_to_rad(80), deg_to_rad(80))
			node_kamera.rotation.x = rotasi_x_kamera

	# Tekan tombol ESC untuk melepas atau mengunci kursor
	if event.is_action_pressed("ui_cancel"):
		if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		else:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _physics_process(delta: float) -> void:
	# 1. Terapkan gravitasi jika karakter sedang di udara
	if not is_on_floor():
		velocity.y -= gravitasi * delta

	# 2. Tangani input lompat (Space / ui_accept)
	if (Input.is_key_pressed(KEY_SPACE) or Input.is_action_just_pressed("ui_accept")) and is_on_floor():
		velocity.y = jump_velocity

	# 3. Tangani Sprint (Shift)
	var speed_aktif: float = sprint_speed if Input.is_key_pressed(KEY_SHIFT) else jalan_speed

	# 4. Ambil vektor input pergerakan (WASD / Panah)
	var input_dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_action_pressed("ui_up"):
		input_dir.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_action_pressed("ui_down"):
		input_dir.y += 1
	if Input.is_key_pressed(KEY_A) or Input.is_action_pressed("ui_left"):
		input_dir.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_action_pressed("ui_right"):
		input_dir.x += 1
	input_dir = input_dir.normalized()

	# 5. Transformasi arah input sesuai orientasi hadap karakter
	var arah_dunia := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

	# 6. Interpolasi kecepatan horisontal secara halus (Lerp)
	if arah_dunia:
		velocity.x = lerpf(velocity.x, arah_dunia.x * speed_aktif, delta * percepatan_lerp)
		velocity.z = lerpf(velocity.z, arah_dunia.z * speed_aktif, delta * percepatan_lerp)
	else:
		velocity.x = lerpf(velocity.x, 0.0, delta * percepatan_lerp)
		velocity.z = lerpf(velocity.z, 0.0, delta * percepatan_lerp)

	# 7. Eksekusi pergerakan dan deteksi tabrakan
	move_and_slide()