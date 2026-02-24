from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from ..database import get_db
from ..models import Folder, User
from ..schemas import FolderCreate, FolderResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/folders", tags=["folders"])

@router.get("/", response_model=List[FolderResponse])
def get_folders(
    parent_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(Folder).filter(
        Folder.user_id == user.id,
        Folder.parent_id == parent_id
    ).all()

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

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Папку не знайдено")

    db.delete(folder)
    db.commit()
    return {"message": "Папку видалено"}
