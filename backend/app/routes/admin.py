from collections import Counter
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import User, Scan

admin_bp = Blueprint("admin", __name__)
ADMIN_ROLES = {"administrator", "admin"}
INSPECTOR_ROLES = {"inspector", "enforcement_officer", "supervisor", "field_officer", "officer"}


def _status(scan):
    return (scan.overall_status or "unknown").lower().replace("-", "_")


@admin_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role not in ADMIN_ROLES:
        return jsonify({"error": "Administrator access required"}), 403

    inspectors = User.query.filter(User.role.in_(INSPECTOR_ROLES)).order_by(User.full_name, User.username).all()
    scans = Scan.query.filter(Scan.user_id.in_([item.id for item in inspectors])).all() if inspectors else []
    scans_by_user = {}
    for scan in scans:
        scans_by_user.setdefault(scan.user_id, []).append(scan)

    city_counts = Counter(scan.city for scan in scans if scan.city)
    city_rows = []
    for city, total in city_counts.most_common(10):
        city_scans = [scan for scan in scans if scan.city == city]
        compliant = sum(_status(scan) == "compliant" for scan in city_scans)
        non_compliant = sum(_status(scan) == "non_compliant" for scan in city_scans)
        city_rows.append({
            "city": city,
            "inspections": total,
            "compliant": compliant,
            "non_compliant": non_compliant,
            "violation_rate": round(non_compliant / total * 100, 1) if total else 0,
        })

    inspector_rows = []
    active_cutoff = datetime.now(timezone.utc) - timedelta(seconds=90)
    for inspector in inspectors:
        own_scans = scans_by_user.get(inspector.id, [])
        own_cities = Counter(scan.city for scan in own_scans if scan.city)
        is_currently_active = bool(inspector.is_active and inspector.last_seen_at and inspector.last_seen_at >= active_cutoff)
        inspector_rows.append({
            "id": inspector.id,
            "name": inspector.full_name or inspector.username,
            "role": inspector.role_display_name,
            "working_city": inspector.working_city,
            "status": "active" if is_currently_active else "signed_out",
            "registered_at": inspector.created_at.isoformat(),
            "last_login_at": inspector.last_login_at.isoformat() if inspector.last_login_at else None,
            "last_logout_at": inspector.last_logout_at.isoformat() if inspector.last_logout_at else None,
            "inspections": len(own_scans),
            "compliant": sum(_status(scan) == "compliant" for scan in own_scans),
            "non_compliant": sum(_status(scan) == "non_compliant" for scan in own_scans),
            "top_city": own_cities.most_common(1)[0][0] if own_cities else None,
        })

    return jsonify({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "registered_inspectors": len(inspectors),
            "active_inspectors": sum(item["status"] == "active" for item in inspector_rows),
            "signed_out_inspectors": sum(item["status"] == "signed_out" for item in inspector_rows),
            "total_inspections": len(scans),
            "compliant_inspections": sum(_status(scan) == "compliant" for scan in scans),
            "non_compliant_inspections": sum(_status(scan) == "non_compliant" for scan in scans),
        },
        "inspectors": inspector_rows,
        "cities": city_rows,
        "privacy": "Operational aggregates only. Confidential product, OCR, image, coordinate, email, and badge data are excluded.",
    }), 200


@admin_bp.route("/reports", methods=["GET"])
@jwt_required()
def citizen_reports():
    user = User.query.get(int(get_jwt_identity()))
    if not user or user.role not in ADMIN_ROLES:
        return jsonify({"error": "Administrator access required"}), 403
    reports = Scan.query.filter_by(source="citizen").order_by(Scan.created_at.desc()).limit(100).all()
    return jsonify({"reports": [{
        "id": report.id,
        "created_at": report.created_at.isoformat(),
        "product_name": report.product_name,
        "shop_name": report.shop_name,
        "purchase_address": report.purchase_address,
        "report_description": report.report_description,
        "city": report.city,
        "state": report.state,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "image_url": report.to_dict().get("image_url"),
        "image_path": report.image_path,
        "report_status": report.report_status or "submitted",
        "assigned_inspector_id": report.assigned_inspector_id,
    } for report in reports]}), 200


@admin_bp.route("/reports/<int:scan_id>/assign", methods=["POST"])
@jwt_required()
def assign_citizen_report(scan_id):
    user = User.query.get(int(get_jwt_identity()))
    if not user or user.role not in ADMIN_ROLES:
        return jsonify({"error": "Administrator access required"}), 403
    report = Scan.query.filter_by(id=scan_id, source="citizen").first()
    if not report:
        return jsonify({"error": "Citizen report not found"}), 404
    payload = request.get_json(silent=True) or {}
    inspector_id = payload.get("inspector_id")
    inspector = User.query.filter(User.id == inspector_id, User.role.in_(INSPECTOR_ROLES)).first()
    if not inspector:
        return jsonify({"error": "A valid inspector is required"}), 400
    report.assigned_inspector_id = inspector.id
    report.report_status = "assigned"
    db.session.commit()
    return jsonify({"message": "Report assigned", "report_id": report.id, "inspector": inspector.full_name or inspector.username, "working_city": inspector.working_city}), 200
