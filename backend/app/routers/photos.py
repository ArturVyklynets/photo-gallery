from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from ..database import get_db
from ..models import Folder, Photo, SharedFolder, SharedPhoto, User
from ..schemas import PhotoResponse, ShareRequest
from ..dependencies import get_current_user
from ..services.s3 import upload_to_s3, get_presigned_url, delete_from_s3
from ..services.email import send_photo_notification_email
import uuid

router = APIRouter(prefix="/photos", tags=["photos"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"}

@router.get("/", response_model=List[PhotoResponse])
def get_photos(
    folder_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if folder_id is None:
        photos = db.query(Photo).filter(
            Photo.user_id == user.id,
            Photo.folder_id == None
        ).all()
    else:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Папку не знайдено")

        has_access = False
        
        if folder.user_id == user.id:
            has_access = True
        else:
            shared_folder = db.query(SharedFolder).filter(
                SharedFolder.folder_id == folder_id,
                SharedFolder.user_id == user.id
            ).first()
            if shared_folder:
                has_access = True
                
        if not has_access:
            raise HTTPException(status_code=403, detail="У вас немає доступу до цієї папки")

        photos = db.query(Photo).filter(Photo.folder_id == folder_id).all()

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
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
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

    if folder_id:
        current_folder_to_check = db.query(Folder).filter(Folder.id == folder_id).first()
        target_emails = set()
        main_folder_name = current_folder_to_check.name if current_folder_to_check else "папку"

        temp_folder = current_folder_to_check
        while temp_folder:
            shared_records = db.query(SharedFolder).filter(SharedFolder.folder_id == temp_folder.id).all()
            
            for record in shared_records:
                user_to_notify = db.query(User).filter(User.id == record.user_id).first()
                if user_to_notify and user_to_notify.id != user.id:
                    target_emails.add(user_to_notify.email)

            if temp_folder.parent_id:
                temp_folder = db.query(Folder).filter(Folder.id == temp_folder.parent_id).first()
            else:
                break

        if target_emails:
            background_tasks.add_task(
                send_photo_notification_email, 
                recipient_emails=list(target_emails), 
                uploader_email=user.email, 
                folder_name=main_folder_name
            )

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
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не знайдено")

    has_permission = False

    if photo.user_id == user.id:
        has_permission = True
    else:
        if photo.folder_id:
            shared_folder = db.query(SharedFolder).filter(
                SharedFolder.folder_id == photo.folder_id,
                SharedFolder.user_id == user.id
            ).first()
            
            if shared_folder and shared_folder.can_delete:
                has_permission = True

    if not has_permission:
        raise HTTPException(status_code=403, detail="У вас немає прав на видалення цього фото")

    delete_from_s3(photo.s3_key)
    db.delete(photo)
    db.commit()
    return {"message": "Фото видалено"}

@router.post("/{photo_id}/share")
def share_photo(
    photo_id: UUID,
    share_data: ShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не знайдено або ви не є його власником")

    target_user = db.query(User).filter(User.email == share_data.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Користувача з таким email не знайдено")
        
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Ви не можете поділитися фотографією самі з собою")

    already_shared = db.query(SharedPhoto).filter(
        SharedPhoto.photo_id == photo.id,
        SharedPhoto.user_id == target_user.id
    ).first()
    if already_shared:
        return {"message": "Доступ вже надано раніше"}

    shared_photo = SharedPhoto(photo_id=photo.id, user_id=target_user.id)
    db.add(shared_photo)
    db.commit()

    return {"message": f"Фото успішно поширено для {target_user.email}"}

@router.get("/shared", response_model=List[PhotoResponse])
def get_shared_photos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shared_records = db.query(SharedPhoto).filter(SharedPhoto.user_id == current_user.id).all()
    
    photo_ids = [record.photo_id for record in shared_records]
    
    if not photo_ids:
        return []

    photos = db.query(Photo).filter(Photo.id.in_(photo_ids)).all()

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