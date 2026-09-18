extends Area3D
class_name ItemPickup

## ====================================================================
## ItemPickup - Contoh Script Objek Interaktif / Collectible
## ====================================================================

signal item_diambil(nama_item: String)

@export var nama_item: String = "Kunci Laboratorium"
@export var speed_rotasi: float = 2.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	# Efek rotasi mengambang
	rotate_y(speed_rotasi * delta)

func _on_body_entered(body: Node3D) -> void:
	if body is CharacterBody3D:
		emit_signal("item_diambil", nama_item)
		print("[Item] ", nama_item, " berhasil diambil oleh player!")
		queue_free()