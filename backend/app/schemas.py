from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[UUID] = None

class FolderResponse(BaseModel):
    id: UUID
    name: str
    parent_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True

class PhotoResponse(BaseModel):
    id: UUID
    filename: str
    url: str
    folder_id: Optional[UUID]
    created_at: datetime
    size: Optional[int] = None

    class Config:
        from_attributes = True

class ShareRequest(BaseModel):
    email: EmailStr

class ShareFolderRequest(BaseModel):
    email: EmailStr
    can_delete: bool = False

class FolderUpdate(BaseModel):
    name: str

class PhotoUpdate(BaseModel):
    filename: str