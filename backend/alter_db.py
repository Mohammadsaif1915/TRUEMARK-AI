import os
from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE scans ADD COLUMN source VARCHAR(50) DEFAULT 'official';"))
        db.session.commit()
        print("Column 'source' added successfully.")
    except Exception as e:
        print(f"Error adding 'source': {e}")
        
    try:
        db.session.execute(text("ALTER TABLE scans ADD COLUMN latitude FLOAT;"))
        db.session.commit()
        print("Column 'latitude' added successfully.")
    except Exception as e:
        print(f"Error adding 'latitude': {e}")
        
    try:
        db.session.execute(text("ALTER TABLE scans ADD COLUMN longitude FLOAT;"))
        db.session.commit()
        print("Column 'longitude' added successfully.")
    except Exception as e:
        print(f"Error adding 'longitude': {e}")
