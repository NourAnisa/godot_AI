# res://scripts/save_manager.gd
class_name SaveManager
extends Node

const SAVE_PATH: String = "user://savegame.json"

signal game_saved()
signal game_loaded(data: Dictionary)

static func save_data(data: Dictionary) -> bool:
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if not file:
		push_error("Gagal membuka file penyimpanan: " + str(FileAccess.get_open_error()))
		return false
	var json_string = JSON.stringify(data, "\t")
	file.store_string(json_string)
	file.close()
	print("[SaveManager] Data berhasil disimpan ke " + SAVE_PATH)
	return true

static func load_data() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		print("[SaveManager] File save belum ada, mengembalikan dictionary kosong.")
		return {}
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not file:
		return {}
	var content = file.get_as_text()
	file.close()
	var json = JSON.new()
	var parse_result = json.parse(content)
	if parse_result != OK:
		push_error("[SaveManager] Gagal membaca JSON savegame.")
		return {}
	return json.data
