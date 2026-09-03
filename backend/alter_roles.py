"""
Migration script to update the role column for TrueMark role-based registration.

1. Widens users.role from VARCHAR(20) to VARCHAR(30).
2. Migrates old role values to the new role constants:
   - 'viewer' -> 'inspector'
   - 'admin' -> 'administrator'
   - 'officer' -> 'enforcement_officer'
3. Safe: runs within transactions, handles errors gracefully.

Usage:
    cd backend
    python alter_roles.py
"""
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Step 1: Widen the role column
    try:
        db.session.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30);"))
        db.session.commit()
        print("+ Column 'role' widened to VARCHAR(30).")
    except Exception as e:
        db.session.rollback()
        print(f"  Column resize skipped (may already be done): {e}")

    # Step 2: Migrate old role values
    migrations = [
        ("viewer", "inspector"),
        ("admin", "administrator"),
        ("officer", "enforcement_officer"),
    ]

    for old_role, new_role in migrations:
        try:
            result = db.session.execute(
                text("UPDATE users SET role = :new WHERE role = :old"),
                {"new": new_role, "old": old_role},
            )
            db.session.commit()
            count = result.rowcount
            if count > 0:
                print(f"+ Migrated {count} user(s) from '{old_role}' to '{new_role}'.")
            else:
                print(f"  No users with role '{old_role}' to migrate.")
        except Exception as e:
            db.session.rollback()
            print(f"  Error migrating '{old_role}' -> '{new_role}': {e}")

    print("\nDone. Role migration complete.")
