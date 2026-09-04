"""
inspection.py — Manual inspection routes.

POST /api/inspection/<scan_id>   — Submit a manual inspection for a check row.
GET  /api/inspection/<scan_id>   — List all manual inspections for a scan.
DELETE /api/inspection/<int:mi_id> — Remove a manual inspection (admin/supervisor).
"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Scan, ManualInspection

from app.services.cloudinary_service import upload_to_cloudinary

inspection_bp = Blueprint("inspection", __name__)

ALLOWED_EVIDENCE_EXTS = {"png", "jpg", "jpeg", "webp", "pdf"}


def _allowed_evidence(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EVIDENCE_EXTS


@inspection_bp.route("/<int:scan_id>", methods=["POST"])
@jwt_required()
def submit_inspection(scan_id):
    """Submit a manual inspection record for a single compliance check."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        scan = Scan.query.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404

        # --- Parse form fields (multipart) ---
        check_index_raw = request.form.get("check_index")
        if check_index_raw is None:
            return jsonify({"error": "check_index is required"}), 400
        try:
            check_index = int(check_index_raw)
        except ValueError:
            return jsonify({"error": "check_index must be an integer"}), 400

        outcome = (request.form.get("outcome") or "").strip().lower()
        if outcome not in ("pass", "fail", "complete"):
            return jsonify({"error": "outcome must be 'pass', 'fail', or 'complete'"}), 400

        rule_name = (request.form.get("rule_name") or "").strip() or None
        citation = (request.form.get("citation") or "").strip() or None
        field_value = (request.form.get("field_value") or "").strip() or None
        notes = (request.form.get("notes") or "").strip() or None

        # --- Handle evidence uploads ---
        evidence_paths = []
        upload_dir = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)

        evidence_files = request.files.getlist("evidence")
        for f in evidence_files:
            if f and f.filename and _allowed_evidence(f.filename):
                ext = f.filename.rsplit(".", 1)[1].lower()
                filename = f"evidence_{uuid.uuid4().hex}.{ext}"
                local_path = os.path.join(upload_dir, filename)
                f.save(local_path)
                # Try to push to Cloudinary; fall back to local path
                cloud_url = upload_to_cloudinary(local_path)
                evidence_paths.append(cloud_url if cloud_url else local_path)

        # --- Check if an inspection for this check_index already exists → update ---
        existing = ManualInspection.query.filter_by(
            scan_id=scan_id, check_index=check_index
        ).first()

        if existing:
            existing.rule_name = rule_name or existing.rule_name
            existing.citation = citation or existing.citation
            existing.field_value = field_value
            existing.outcome = outcome
            existing.notes = notes
            existing.evidence_paths = evidence_paths or existing.evidence_paths
            existing.inspected_by_id = user_id
            db.session.commit()
            return jsonify({"message": "Inspection updated", "inspection": existing.to_dict()}), 200

        mi = ManualInspection(
            scan_id=scan_id,
            check_index=check_index,
            rule_name=rule_name,
            citation=citation,
            field_value=field_value,
            outcome=outcome,
            notes=notes,
            evidence_paths=evidence_paths,
            inspected_by_id=user_id,
        )
        db.session.add(mi)
        db.session.commit()
        return jsonify({"message": "Inspection submitted", "inspection": mi.to_dict()}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": f"Failed to submit inspection: {str(e)}"}), 500


@inspection_bp.route("/<int:scan_id>", methods=["GET"])
@jwt_required()
def list_inspections(scan_id):
    """Return all manual inspection records for a given scan."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        scan = Scan.query.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404

        inspections = ManualInspection.query.filter_by(scan_id=scan_id).all()
        return jsonify({
            "scan_id": scan_id,
            "inspections": [mi.to_dict() for mi in inspections],
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to list inspections: {str(e)}"}), 500


@inspection_bp.route("/<int:mi_id>/delete", methods=["DELETE"])
@jwt_required()
def delete_inspection(mi_id):
    """Delete a manual inspection (admin/supervisor only)."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.role not in ("administrator", "admin", "supervisor"):
            return jsonify({"error": "Permission denied"}), 403

        mi = ManualInspection.query.get(mi_id)
        if not mi:
            return jsonify({"error": "Inspection record not found"}), 404

        db.session.delete(mi)
        db.session.commit()
        return jsonify({"message": "Inspection deleted"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete inspection: {str(e)}"}), 500
