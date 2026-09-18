@tool
extends EditorPlugin

var toolbar_button: Button
var http_request: HTTPRequest
var timer: Timer
var daemon_url := "http://127.0.0.1:32124"

func _enter_tree() -> void:
	toolbar_button = Button.new()
	toolbar_button.text = "🎓 Sync AI Mahasiswa"
	toolbar_button.tooltip_text = "Tarik kode terbaru dari AI / GitHub ke folder tugas"
	toolbar_button.pressed.connect(_on_sync_pressed)
	add_control_to_container(CONTAINER_TOOLBAR, toolbar_button)

	http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(_on_request_completed)

	timer = Timer.new()
	timer.wait_time = 12.0
	timer.autostart = true
	timer.timeout.connect(_check_status)
	add_child(timer)

func _exit_tree() -> void:
	if toolbar_button:
		remove_control_from_container(CONTAINER_TOOLBAR, toolbar_button)
		toolbar_button.queue_free()
	if timer:
		timer.queue_free()
	if http_request:
		http_request.queue_free()

func _on_sync_pressed() -> void:
	toolbar_button.disabled = true
	toolbar_button.text = "⏳ Menarik Kode AI..."
	var headers = ["Content-Type: application/json"]
	http_request.request(daemon_url + "/pull", headers, HTTPClient.METHOD_POST)

func _check_status() -> void:
	var client := HTTPRequest.new()
	add_child(client)
	client.request_completed.connect(func(result, code, headers, body):
		if code == 200:
			var json = JSON.parse_string(body.get_string_from_utf8())
			if json and json.has("behind") and json["behind"] > 0:
				toolbar_button.text = "🟡 Ada Update AI (" + str(json["behind"]) + ")"
				toolbar_button.modulate = Color(1.0, 0.8, 0.2)
			else:
				toolbar_button.text = "🎓 Sync AI Mahasiswa"
				toolbar_button.modulate = Color.WHITE
		client.queue_free()
	)
	client.request(daemon_url + "/status")

func _on_request_completed(result: int, response_code: int, headers: PackedStringArray, body: PackedStringArray) -> void:
	toolbar_button.disabled = false
	toolbar_button.text = "🎓 Sync AI Mahasiswa"
	if response_code == 200:
		print("[Godot AI] Kode berhasil disinkronkan dengan GitHub!")
		get_editor_interface().get_resource_filesystem().scan()
	else:
		print("[Godot AI] Gagal terhubung ke daemon port 32124")