import os
from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")
from sqlalchemy import create_engine
from sqlalchemy import text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is missing")

engine = create_engine(database_url)
with engine.begin() as connection:
    try:
        connection.execute(text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'official';"))
        print("Column 'source' added successfully.")
    except Exception as e:
        print(f"Error adding 'source': {e}")
        
    try:
        connection.execute(text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS latitude FLOAT;"))
        print("Column 'latitude' added successfully.")
    except Exception as e:
        print(f"Error adding 'latitude': {e}")
        
    try:
        connection.execute(text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS longitude FLOAT;"))
        print("Column 'longitude' added successfully.")
    except Exception as e:
        print(f"Error adding 'longitude': {e}")

    try:
        connection.execute(text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS city VARCHAR(100);"))
        print("Column 'city' added successfully.")
    except Exception as e:
        print(f"Error adding 'city': {e}")

    try:
        connection.execute(text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS ocr_regions JSON;"))
        print("Column 'ocr_regions' added successfully.")
    except Exception as e:
        print(f"Error adding 'ocr_regions': {e}")

    for column_sql, label in (
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;", "is_active"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;", "last_login_at"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP WITH TIME ZONE;", "last_logout_at"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;", "last_seen_at"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS working_city VARCHAR(100);", "working_city"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);", "phone_number"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);", "department"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);", "designation"),
        ("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;", "must_change_password"),
        ("ALTER TABLE scans ADD COLUMN IF NOT EXISTS shop_name VARCHAR(200);", "shop_name"),
        ("ALTER TABLE scans ADD COLUMN IF NOT EXISTS purchase_address TEXT;", "purchase_address"),
        ("ALTER TABLE scans ADD COLUMN IF NOT EXISTS report_description TEXT;", "report_description"),
        ("ALTER TABLE scans ADD COLUMN IF NOT EXISTS assigned_inspector_id INTEGER REFERENCES users(id);", "assigned_inspector_id"),
        ("ALTER TABLE scans ADD COLUMN IF NOT EXISTS report_status VARCHAR(30);", "report_status"),
        ("ALTER TABLE scans ADD COLUMN IF NOT EXISTS analysis_image_path VARCHAR(500);", "analysis_image_path"),
    ):
        try:
            connection.execute(text(column_sql))
            print(f"Column '{label}' added successfully.")
        except Exception as e:
            print(f"Error adding '{label}': {e}")
