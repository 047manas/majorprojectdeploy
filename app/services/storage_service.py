import os
from supabase import create_client, Client
from flask import current_app
import logging

class StorageService:
    def __init__(self):
        self._client = None
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_KEY')
        self.bucket = os.getenv('SUPABASE_BUCKET', 'certificates')

    @property
    def client(self):
        if self._client is None:
            # Try to refresh from environment/config in case they were set late
            self.url = self.url or os.getenv('SUPABASE_URL')
            self.key = self.key or os.getenv('SUPABASE_KEY')
            self.bucket = self.bucket or os.getenv('SUPABASE_BUCKET', 'certificates')

            if self.url and self.key:
                try:
                    self._client = create_client(self.url, self.key)
                    # Simple connectivity check: list buckets (requires service role or policy)
                    # We'll just log success for now to avoid overhead, or a shallow check.
                    logging.info(f"Supabase client initialized for bucket: {self.bucket}")
                except Exception as e:
                    logging.error(f"Failed to initialize Supabase client: {str(e)}")
                    self._client = None
            else:
                logging.warning("Supabase storage not configured: missing URL or KEY.")
        return self._client

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
