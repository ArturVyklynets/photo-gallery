import os
import shutil
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = "uploads"

def upload_to_s3(file_bytes: bytes, key: str, content_type: str):
    full_path = os.path.join(UPLOAD_DIR, key)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

def get_presigned_url(key: str, expires: int = 3600) -> str:
    return f"http://localhost:8000/uploads/{key}"

def delete_from_s3(key: str):
    full_path = os.path.join(UPLOAD_DIR, key)
    if os.path.exists(full_path):
        os.remove(full_path)
