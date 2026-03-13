import os
from supabase import create_client, Client
from flask import current_app
import logging

class StorageService:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_KEY')
        self.bucket = os.getenv('SUPABASE_BUCKET', 'certificates')
        self.client = None
        
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                logging.error(f"Failed to initialize Supabase client: {e}")

    def upload_file(self, file_path, destination_path):
        """
        Uploads a file to Supabase Storage if configured, otherwise stays local.
        Returns: (public_url, is_cloud)
        """
        if not self.client:
            return None, False

        try:
            with open(file_path, 'rb') as f:
                res = self.client.storage.from_(self.bucket).upload(
                    path=destination_path,
                    file=f,
                    file_options={"cache-control": "3600", "upsert": "true"}
                )
            
            # Get Public URL
            public_url = self.client.storage.from_(self.bucket).get_public_url(destination_path)
            return public_url, True
        except Exception as e:
            logging.error(f"Supabase Upload Error: {e}")
            return None, False

    def get_file_url(self, filename):
        """
        Returns the cloud URL or local fallback.
        """
        if self.client:
            return self.client.storage.from_(self.bucket).get_public_url(filename)
        return None

storage_service = StorageService()
