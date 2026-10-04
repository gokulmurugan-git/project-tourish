"""
Firebase configuration for Smart Tourist Guide.
Initializes Firebase Admin SDK using environment variables securely.
Includes fallback handling for local evaluation and testing.
"""

import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("smart_tourist_guide.firebase")

db = None
auth_client = None
firebase_initialized = False

def init_firebase():
    """
    Initializes Firebase Admin SDK using environment credentials.
    Supports either explicit fields (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
    or a JSON string in FIREBASE_CREDENTIALS_JSON or a file path in GOOGLE_APPLICATION_CREDENTIALS.
    """
    global db, auth_client, firebase_initialized

    if firebase_initialized:
        return db, auth_client

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, auth

        if firebase_admin._apps:
            db = firestore.client()
            auth_client = auth
            firebase_initialized = True
            return db, auth_client

        cred = None
        creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        private_key = os.getenv("FIREBASE_PRIVATE_KEY")
        cred_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if cred_file and os.path.exists(cred_file):
            cred = credentials.Certificate(cred_file)
        elif creds_json:
            try:
                cred_dict = json.loads(creds_json)
                cred = credentials.Certificate(cred_dict)
            except Exception as e:
                logger.warning(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")
        elif project_id and client_email and private_key:
            # Clean formatted private key
            formatted_key = private_key.replace("\\n", "\n")
            cred_dict = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": formatted_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            cred = credentials.Certificate(cred_dict)

        if cred:
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            auth_client = auth
            firebase_initialized = True
            logger.info("Firebase Admin initialized successfully with credentials.")
        else:
            logger.info("No Firebase service account credentials found. Operating in local mode with initial sample datasets.")
    except Exception as e:
        logger.warning(f"Firebase initialization notice: {e}. Fallback data provider active.")

    return db, auth_client

# Initialize on import
init_firebase()
