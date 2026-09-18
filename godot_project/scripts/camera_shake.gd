# res://scripts/camera_shake.gd
class_name CameraShake
extends Camera3D

@export var trauma_decay: float = 1.2
@export var max_offset: Vector2 = Vector2(0.3, 0.3)
@export var max_roll: float = 0.05

var trauma: float = 0.0
var time: float = 0.0

func _process(delta: float) -> void:
	if trauma > 0.0:
		trauma = max(trauma - trauma_decay * delta, 0.0)
		time += delta * 30.0
		var shake_amount = trauma * trauma
		h_offset = max_offset.x * shake_amount * sin(time * 1.3)
		v_offset = max_offset.y * shake_amount * cos(time * 1.7)
		rotation.z = max_roll * shake_amount * sin(time * 0.9)
	else:
		h_offset = 0.0
		v_offset = 0.0
		rotation.z = 0.0

func add_trauma(amount: float) -> void:
	trauma = clamp(trauma + amount, 0.0, 1.0)