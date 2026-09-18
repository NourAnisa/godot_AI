extends CharacterBody3D
@export var speed = 10
@onready var timer
func do_wait():
	await get_tree().create_timer(1.0), null)