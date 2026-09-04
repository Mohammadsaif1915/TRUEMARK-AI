from datetime import datetime, timezone
from app import db
import bcrypt

# Controlled role constants
VALID_ROLES = (
    "inspector",
    "enforcement_officer",
    "administrator",
    "supervisor",
    "field_officer",
)

ROLE_DISPLAY_NAMES = {
    "inspector": "Inspector",
    "enforcement_officer": "Enforcement Officer",
    "administrator": "Administrator",
    "supervisor": "Supervisor",
    "field_officer": "Field Officer",
    # Legacy roles (for backward compatibility)
    "citizen": "Citizen",
    "viewer": "Viewer",
    "admin": "Administrator",
    "officer": "Officer",
}


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="inspector")
    full_name = db.Column(db.String(150), nullable=True)
    badge_number = db.Column(db.String(50), nullable=True)
    working_city = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=False)
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_logout_at = db.Column(db.DateTime, nullable=True)
    last_seen_at = db.Column(db.DateTime, nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    designation = db.Column(db.String(100), nullable=True)
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    scans = db.relationship("Scan", backref="user", lazy=True, foreign_keys="Scan.user_id")
    manual_inspections = db.relationship("ManualInspection", backref="inspector", lazy=True, foreign_keys="ManualInspection.inspected_by_id")

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(
            password.encode("utf-8"), self.password_hash.encode("utf-8")
        )

    @property
    def role_display_name(self):
        return ROLE_DISPLAY_NAMES.get(self.role, self.role.replace("_", " ").title())

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "role_display_name": self.role_display_name,
            "full_name": self.full_name,
            "badge_number": self.badge_number,
            "working_city": self.working_city,
            "phone_number": self.phone_number,
            "department": self.department,
            "designation": self.designation,
            "must_change_password": self.must_change_password,
            "is_active": self.is_active,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "last_logout_at": self.last_logout_at.isoformat() if self.last_logout_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
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
    city = db.Column(db.String(100), nullable=True)
    ocr_regions = db.Column(db.JSON, nullable=True)
    source = db.Column(db.String(50), nullable=False, default="official")
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    mismatch_result = db.Column(db.JSON, nullable=True)
    image_hash = db.Column(db.String(64), nullable=True)
    shop_name = db.Column(db.String(200), nullable=True)
    purchase_address = db.Column(db.Text, nullable=True)
    report_description = db.Column(db.Text, nullable=True)
    assigned_inspector_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    report_status = db.Column(db.String(30), nullable=True)
    analysis_image_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    manual_inspections = db.relationship(
        "ManualInspection", backref="scan", lazy=True, foreign_keys="ManualInspection.scan_id"
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
            "city": self.city,
            "ocr_regions": self.ocr_regions,
            "source": self.source,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "mismatch_result": self.mismatch_result,
            "image_hash": self.image_hash,
            "shop_name": self.shop_name,
            "purchase_address": self.purchase_address,
            "report_description": self.report_description,
            "assigned_inspector_id": self.assigned_inspector_id,
            "report_status": self.report_status,
            "analysis_image_path": self.analysis_image_path,
            "created_at": self.created_at.isoformat(),
            "manual_inspections": [mi.to_dict() for mi in (self.manual_inspections or [])],
        }


class ManualInspection(db.Model):
    """Stores a human inspector's manual verification of a single compliance check."""
    __tablename__ = "manual_inspections"

    id = db.Column(db.Integer, primary_key=True)
    scan_id = db.Column(db.Integer, db.ForeignKey("scans.id"), nullable=False)
    # Which check in compliance_result.checks[] this relates to (0-based index)
    check_index = db.Column(db.Integer, nullable=False)
    rule_name = db.Column(db.String(300), nullable=True)
    citation = db.Column(db.String(300), nullable=True)
    # What the inspector physically observed for the field
    field_value = db.Column(db.Text, nullable=True)
    # Inspector's determination: 'pass', 'fail', 'complete'
    outcome = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    # List of uploaded evidence image paths / URLs (JSON array)
    evidence_paths = db.Column(db.JSON, nullable=True, default=list)
    inspected_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "scan_id": self.scan_id,
            "check_index": self.check_index,
            "rule_name": self.rule_name,
            "citation": self.citation,
            "field_value": self.field_value,
            "outcome": self.outcome,
            "notes": self.notes,
            "evidence_paths": self.evidence_paths or [],
            "inspected_by_id": self.inspected_by_id,
            "inspector_name": self.inspector.full_name if self.inspector else None,
            "created_at": self.created_at.isoformat(),
        }
