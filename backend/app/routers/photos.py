from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from ..database import get_db
from ..models import Photo, User
from ..schemas import PhotoResponse
from ..dependencies import get_current_user
from ..services.s3 import upload_to_s3, get_presigned_url, delete_from_s3
import uuid

router = APIRouter(prefix="/photos", tags=["photos"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

@router.get("/", response_model=List[PhotoResponse])
def get_photos(
    folder_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    photos = db.query(Photo).filter(
        Photo.user_id == user.id,
        Photo.folder_id == folder_id
    ).all()

    result = []
    for photo in photos:
        result.append(PhotoResponse(
            id=photo.id,
            filename=photo.filename,
            url=get_presigned_url(photo.s3_key),
            folder_id=photo.folder_id,
            created_at=photo.created_at,
        ))
    return result

@router.post("/upload", response_model=PhotoResponse)
async def upload_photo(
    file: UploadFile = File(...),
    folder_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    print(f"folder_id отримано: {folder_id}")
    print(f"currentFolder: {folder_id}")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Дозволені тільки зображення")

    contents = await file.read()
    s3_key = f"{user.id}/{uuid.uuid4()}-{file.filename}"
    upload_to_s3(contents, s3_key, file.content_type)

    photo = Photo(
        filename=file.filename,
        s3_key=s3_key,
        size=len(contents),
        mime_type=file.content_type,
        user_id=user.id,
        folder_id=folder_id,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return PhotoResponse(
        id=photo.id,
        filename=photo.filename,
        url=get_presigned_url(s3_key),
        folder_id=photo.folder_id,
        created_at=photo.created_at,
    )

@router.delete("/{photo_id}")
def delete_photo(
    photo_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == user.id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не знайдено")

    delete_from_s3(photo.s3_key)
    db.delete(photo)
    db.commit()
    return {"message": "Фото видалено"}
