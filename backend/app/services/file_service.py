import os
import uuid
from fastapi import UploadFile
from typing import Tuple, Optional
import aiofiles
from PIL import Image

class FileUploadService:
    UPLOAD_DIR = "uploads/chat_files"
    MAX_FILE_SIZE = 50 * 1024 * 1024  
    ALLOWED_EXTENSIONS = {
        'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
        'video': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
        'audio': ['.mp3', '.wav', '.ogg', '.m4a'],
        'document': ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    }
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        return os.path.splitext(filename)[1].lower()
    
    @staticmethod
    def get_file_type(filename: str) -> str:
        ext = FileUploadService.get_file_extension(filename)
        for file_type, extensions in FileUploadService.ALLOWED_EXTENSIONS.items():
            if ext in extensions:
                return file_type
        return 'document'  
    
    @staticmethod
    def get_mime_type(filename: str) -> str:
        ext = FileUploadService.get_file_extension(filename)
        
        mime_map = {
            '.gif': 'image/gif',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
        
        return mime_map.get(ext, 'application/octet-stream')
    
    @staticmethod
    def is_allowed_file(filename: str) -> bool:
        ext = FileUploadService.get_file_extension(filename)
        all_extensions = []
        for extensions in FileUploadService.ALLOWED_EXTENSIONS.values():
            all_extensions.extend(extensions)
        
        return ext in all_extensions
    
    @staticmethod
    def is_safe_content(header: bytes, expected_ext: str) -> bool:
        """Rudimentary magic bytes checker to prevent executable spoofing"""
        if header.startswith(b'MZ'): 
            return False # Windows executable
        if header.startswith(b'\x7fELF'): 
            return False # Linux executable
            
        if expected_ext in ['.jpg', '.jpeg'] and not header.startswith(b'\xff\xd8\xff'):
            return False
        if expected_ext == '.png' and not header.startswith(b'\x89PNG\r\n\x1a\n'):
            return False
        if expected_ext == '.pdf' and not header.startswith(b'%PDF'):
            return False
            
        return True
    
    @staticmethod
    async def save_upload_file(upload_file: UploadFile) -> Tuple[Optional[dict], Optional[str]]:
        os.makedirs(FileUploadService.UPLOAD_DIR, exist_ok=True)
        
        if not upload_file.filename:
            return None, "File must have a name"
        
        if not FileUploadService.is_allowed_file(upload_file.filename):
            return None, f"File type not allowed. Allowed: images, videos, audio, documents"
        
        file_size = 0
        try:
            content = await upload_file.read()
            file_size = len(content)
            
            if file_size > FileUploadService.MAX_FILE_SIZE:
                return None, f"File too large. Max size: {FileUploadService.MAX_FILE_SIZE/1024/1024}MB"
                
            if file_size > 0:
                header = content[:2048]
                if not FileUploadService.is_safe_content(header, FileUploadService.get_file_extension(upload_file.filename)):
                    return None, "File content does not match extension or is potentially malicious"
                    
            await upload_file.seek(0)  
        except Exception as e:
            return None, f"Error reading file: {str(e)}"
        
        file_id = str(uuid.uuid4())
        original_filename = upload_file.filename
        file_extension = FileUploadService.get_file_extension(original_filename)
        stored_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(FileUploadService.UPLOAD_DIR, stored_filename)
        try:
            async with aiofiles.open(file_path, 'wb') as out_file:
                while chunk := await upload_file.read(8192):
                    await out_file.write(chunk)
        except Exception as e:
            return None, f"Error saving file: {str(e)}"

        thumbnail_url = None
        file_type = FileUploadService.get_file_type(original_filename)
        
        if file_type == 'image':
            thumbnail_url = await FileUploadService.generate_image_thumbnail(file_path, file_id)
        elif file_type == 'video':
            thumbnail_url = await FileUploadService.generate_video_thumbnail(file_path, file_id)
        
        file_url = f"/uploads/chat_files/{stored_filename}"
        
        return {
            "file_id": file_id,
            "file_url": file_url,
            "file_name": original_filename,
            "file_size": file_size,
            "file_mime_type": FileUploadService.get_mime_type(original_filename),
            "thumbnail_url": thumbnail_url,
            "message_type": file_type
        }, None
    
    @staticmethod
    async def generate_image_thumbnail(image_path: str, file_id: str) -> Optional[str]:
        try:
            thumb_dir = os.path.join(FileUploadService.UPLOAD_DIR, "thumbnails")
            os.makedirs(thumb_dir, exist_ok=True)
            thumb_path = os.path.join(thumb_dir, f"{file_id}_thumb.jpg")
            with Image.open(image_path) as img:
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                img.thumbnail((200, 200))
                img.save(thumb_path, "JPEG", quality=85)
            
            return f"/uploads/chat_files/thumbnails/{file_id}_thumb.jpg"
        except Exception as e:
            print(f"Failed to generate image thumbnail: {e}")
            return None
    
    @staticmethod
    async def generate_video_thumbnail(video_path: str, file_id: str) -> Optional[str]:
        try:
            thumb_dir = os.path.join(FileUploadService.UPLOAD_DIR, "thumbnails")
            os.makedirs(thumb_dir, exist_ok=True)
            thumb_path = os.path.join(thumb_dir, f"{file_id}_thumb.jpg")
            from PIL import Image, ImageDraw, ImageFont
            img = Image.new('RGB', (200, 200), color=(40, 40, 40))
            d = ImageDraw.Draw(img)
            d.ellipse([50, 50, 150, 150], outline='white', width=3)
            d.polygon([(80, 70), (80, 130), (130, 100)], fill='white')
            
            img.save(thumb_path)
            
            return f"/uploads/chat_files/thumbnails/{file_id}_thumb.jpg"
        except Exception as e:
            print(f"Failed to generate video thumbnail: {e}")
            return None
    
    @staticmethod
    def delete_file(file_url: str):
        try:
            if file_url.startswith("/uploads/"):
                file_path = file_url[1:] 
                if os.path.exists(file_path):
                    os.remove(file_path)
                
                if "/chat_files/" in file_path:
                    file_id = os.path.basename(file_path).split('.')[0]
                    thumb_dir = os.path.dirname(file_path).replace("chat_files", "chat_files/thumbnails")
                    thumb_path = os.path.join(thumb_dir, f"{file_id}_thumb.jpg")
                    
                    if os.path.exists(thumb_path):
                        os.remove(thumb_path)
        except Exception as e:
            print(f"Error deleting file: {e}")