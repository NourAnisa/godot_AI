extends CharacterBody3D
@export var speed = 200
func _ready():
	await get_tree().create_timer(1.0).timeout