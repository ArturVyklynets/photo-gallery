import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT= os.getenv("SMTP_PORT")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_photo_notification_email(recipient_emails: list[str], uploader_email: str, folder_name: str):
    """Фонова задача для відправки листів усім, з ким поділилися папкою"""
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Попередження: Не налаштовано SMTP_USER або SMTP_PASSWORD. Лист не відправлено.")
        return

    msg = EmailMessage()
    msg['Subject'] = f"Нове фото у спільній папці '{folder_name}'!"
    msg['From'] = SMTP_USER
    msg['To'] = ", ".join(recipient_emails) 
    
    msg.set_content(
        f"Привіт!\n\n"
        f"Користувач {uploader_email} щойно завантажив нове фото у спільну папку '{folder_name}'.\n"
        f"Зайдіть у свій PhotoAlbum, щоб переглянути його!\n\n"
        f"З повагою, ваш PhotoAlbum."
    )

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            print(f"Листи успішно відправлено на {recipient_emails}")
    except Exception as e:
        print(f"Помилка при відправці листа: {e}")