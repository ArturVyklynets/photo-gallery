import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import io

load_dotenv()

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

s3_client = boto3.client(
    's3',
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

def upload_to_s3(contents: bytes, s3_key: str, content_type: str):
    """Завантажує файл у Cloudflare R2"""
    try:
        file_obj = io.BytesIO(contents)
        s3_client.upload_fileobj(
            file_obj,
            R2_BUCKET_NAME,
            s3_key,
            ExtraArgs={"ContentType": content_type}
        )
    except ClientError as e:
        print(f"Помилка завантаження в R2: {e}")
        raise e

def get_presigned_url(s3_key: str, expiration=3600) -> str:
    """Генерує тимчасове посилання на файл"""
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': R2_BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        print(f"Помилка генерації URL: {e}")
        return ""

def delete_from_s3(s3_key: str):
    """Видаляє файл з Cloudflare R2"""
    try:
        s3_client.delete_object(
            Bucket=R2_BUCKET_NAME,
            Key=s3_key
        )
    except ClientError as e:
        print(f"Помилка видалення з R2: {e}")
        raise e