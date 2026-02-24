from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email      = Column(String, unique=True, nullable=False)
    name       = Column(String)
    password   = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    folders = relationship("Folder", back_populates="user")
    photos  = relationship("Photo", back_populates="user")


class Folder(Base):
    __tablename__ = "folders"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String, nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id  = Column(UUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User", back_populates="folders")
    parent   = relationship("Folder", remote_side=[id], back_populates="children")
    children = relationship("Folder", back_populates="parent")
    photos   = relationship("Photo", back_populates="folder")


class Photo(Base):
    __tablename__ = "photos"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename   = Column(String, nullable=False)
    s3_key     = Column(String, nullable=False)
    size       = Column(Integer)
    mime_type  = Column(String)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    folder_id  = Column(UUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user   = relationship("User", back_populates="photos")
    folder = relationship("Folder", back_populates="photos")
