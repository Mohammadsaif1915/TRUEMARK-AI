from datetime import datetime, timezone
from app import db
import bcrypt


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="viewer")
    full_name = db.Column(db.String(150), nullable=True)
    badge_number = db.Column(db.String(50), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    scans = db.relationship("Scan", backref="user", lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(
            password.encode("utf-8"), self.password_hash.encode("utf-8")
        )

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name,
            "badge_number": self.badge_number,
            "created_at": self.created_at.isoformat(),
        }


class Scan(db.Model):
    __tablename__ = "scans"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    ocr_text = db.Column(db.Text, nullable=True)
    extracted_fields = db.Column(db.JSON, nullable=True)
    compliance_result = db.Column(db.JSON, nullable=True)
    overall_status = db.Column(db.String(20), nullable=True)
    product_name = db.Column(db.String(200), nullable=True)
    manufacturer = db.Column(db.String(200), nullable=True)
    gtin = db.Column(db.String(50), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    source = db.Column(db.String(50), nullable=False, default="official")
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    mismatch_result = db.Column(db.JSON, nullable=True)
    image_hash = db.Column(db.String(64), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        img_url = None
        if self.image_path and self.image_path.startswith("http"):
            img_url = self.image_path

        return {
            "id": self.id,
            "user_id": self.user_id,
            "image_path": self.image_path,
            "image_url": img_url,
            "ocr_text": self.ocr_text,
            "extracted_fields": self.extracted_fields,
            "compliance_result": self.compliance_result,
            "overall_status": self.overall_status,
            "product_name": self.product_name,
            "manufacturer": self.manufacturer,
            "gtin": self.gtin,
            "state": self.state,
            "source": self.source,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "mismatch_result": self.mismatch_result,
            "image_hash": self.image_hash,
            "created_at": self.created_at.isoformat(),
        }
