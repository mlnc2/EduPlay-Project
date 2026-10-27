from pathlib import Path
import json
import mimetypes
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Flask, jsonify, render_template, request, send_from_directory, abort

BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
DATA_FILE = BASE_DIR / "library.json"
ALLOWED_EXTENSIONS = {
    ".mp4", ".webm", ".ogg", ".mp3", ".wav", ".m4a", ".aac", ".oga"
}
MAX_UPLOAD_BYTES = 1024 * 1024 * 1024  # 1 GB

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
MEDIA_DIR.mkdir(exist_ok=True)


def load_library():
    if not DATA_FILE.exists():
        return []
    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_library(items):
    DATA_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def public_item(item):
    return {
        **item,
        "url": f"/media/{item['filename']}"
    }


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/library")
def api_library():
    return jsonify([public_item(item) for item in load_library()])


@app.post("/api/library")
def api_add_item():
    uploaded = request.files.get("file")
    title = (request.form.get("title") or "").strip()
    kind = (request.form.get("kind") or "").strip().lower()
    subject = (request.form.get("subject") or "Geral").strip()[:80]
    description = (request.form.get("description") or "").strip()[:500]

    if not uploaded or not uploaded.filename:
        return jsonify({"error": "Selecione um arquivo de áudio ou vídeo."}), 400
    if not title:
        title = Path(uploaded.filename).stem[:120] or "Novo conteúdo"
    if kind not in {"video", "audio"}:
        return jsonify({"error": "Tipo de conteúdo inválido."}), 400

    original_name = secure_filename(uploaded.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Formato não permitido. Use MP4/WebM para vídeo ou MP3/WAV/M4A/OGG para áudio."}), 400

    if kind == "video" and extension not in {".mp4", ".webm", ".ogg"}:
        return jsonify({"error": "Para videoaulas, use MP4, WebM ou OGG."}), 400
    if kind == "audio" and extension not in {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".oga"}:
        return jsonify({"error": "Formato de áudio não suportado."}), 400

    stored_name = f"{uuid.uuid4().hex}{extension}"
    destination = MEDIA_DIR / stored_name
    uploaded.save(destination)

    item = {
        "id": uuid.uuid4().hex,
        "title": title[:120],
        "kind": kind,
        "subject": subject or "Geral",
        "description": description,
        "filename": stored_name,
        "original_filename": original_name,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    items = load_library()
    items.insert(0, item)
    save_library(items)
    return jsonify(public_item(item)), 201


@app.delete("/api/library/<item_id>")
def api_delete_item(item_id):
    items = load_library()
    target = next((item for item in items if item.get("id") == item_id), None)
    if not target:
        return jsonify({"error": "Conteúdo não encontrado."}), 404

    path = MEDIA_DIR / target.get("filename", "")
    try:
        path.resolve().relative_to(MEDIA_DIR.resolve())
        if path.is_file():
            path.unlink()
    except (ValueError, OSError):
        pass

    save_library([item for item in items if item.get("id") != item_id])
    return jsonify({"ok": True})


@app.get("/media/<path:filename>")
def media(filename):
    # Files are served only from the dedicated media directory.
    return send_from_directory(MEDIA_DIR, filename, as_attachment=False, conditional=True)


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Arquivo muito grande. O limite por envio é 1 GB."}), 413


if __name__ == "__main__":
    # Local development server. Do not expose this debug server to the public internet.
    app.run(host="127.0.0.1", port=5000, debug=True)
