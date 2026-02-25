from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from ..services.s3 import delete_from_s3
from ..database import get_db
from ..models import Folder, Photo, SharedFolder, User
from ..schemas import FolderCreate, FolderResponse, ShareFolderRequest
from ..dependencies import get_current_user

router = APIRouter(prefix="/folders", tags=["folders"])

@router.get("/", response_model=List[FolderResponse])
def get_folders(
    parent_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if parent_id is None:
        folders = db.query(Folder).filter(
            Folder.user_id == current_user.id,
            Folder.parent_id == None
        ).all()
        return folders

    parent_folder = db.query(Folder).filter(Folder.id == parent_id).first()
    if not parent_folder:
        raise HTTPException(status_code=404, detail="Папку не знайдено")

    has_access = False

    if parent_folder.user_id == current_user.id:
        has_access = True
    else:
        current_check = parent_folder
        while current_check:
            shared_link = db.query(SharedFolder).filter(
                SharedFolder.folder_id == current_check.id,
                SharedFolder.user_id == current_user.id
            ).first()
            
            if shared_link:
                has_access = True
                break
            
            if current_check.parent_id:
                current_check = db.query(Folder).filter(Folder.id == current_check.parent_id).first()
            else:
                break

    if not has_access:
        raise HTTPException(status_code=403, detail="У вас немає доступу до цієї папки")

    subfolders = db.query(Folder).filter(Folder.parent_id == parent_id).all()
    return subfolders

@router.post("/", response_model=FolderResponse)
def create_folder(
    data: FolderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if data.parent_id:
        parent = db.query(Folder).filter(
            Folder.id == data.parent_id,
            Folder.user_id == user.id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Батьківська папка не знайдена")

    folder = Folder(name=data.name, user_id=user.id, parent_id=data.parent_id)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder

def delete_folder_contents_from_s3(folder_id: UUID, db: Session):
    """Рекурсивно видаляє всі фото з S3 для папки та всіх її підпапок"""
    photos = db.query(Photo).filter(Photo.folder_id == folder_id).all()
    for photo in photos:
        delete_from_s3(photo.s3_key)

    subfolders = db.query(Folder).filter(Folder.parent_id == folder_id).all()
    for subfolder in subfolders:
        delete_folder_contents_from_s3(subfolder.id, db)

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()

    delete_folder_contents_from_s3(folder_id, db)

    db.delete(folder)
    db.commit()
    return {"message": "Папку та весь її вміст видалено"}

@router.get("/shared", response_model=List[FolderResponse])
def get_shared_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shared_records = db.query(SharedFolder).filter(SharedFolder.user_id == current_user.id).all()
    folder_ids = [record.folder_id for record in shared_records]
    
    if not folder_ids:
        return []

    folders = db.query(Folder).filter(Folder.id.in_(folder_ids)).all()
    return folders


@router.post("/{folder_id}/share")
def share_folder(
    folder_id: UUID,
    share_data: ShareFolderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Папку не знайдено або у вас немає прав")

    target_user = db.query(User).filter(User.email == share_data.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Користувача з таким email не знайдено")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Не можна поділитися з собою")

    already_shared = db.query(SharedFolder).filter(
        SharedFolder.folder_id == folder_id,
        SharedFolder.user_id == target_user.id
    ).first()
    
    if already_shared:
        already_shared.can_delete = share_data.can_delete
        db.commit()
        return {"message": "Права доступу оновлено"}

    new_share = SharedFolder(
        folder_id=folder_id, 
        user_id=target_user.id, 
        can_delete=share_data.can_delete
    )
    db.add(new_share)
    db.commit()

    return {"message": f"Папку успішно поширено для {target_user.email}"}