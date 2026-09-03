from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Scan

history_bp = Blueprint("history", __name__)


@history_bp.route("", methods=["GET"])
@jwt_required()
def get_history():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(per_page, 100)

        query = Scan.query.filter_by(user_id=user_id).order_by(Scan.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "scans": [s.to_dict() for s in pagination.items],
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total_pages": pagination.pages,
                "total_items": pagination.total,
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch history: {str(e)}"}), 500


@history_bp.route("/<int:scan_id>", methods=["DELETE"])
@jwt_required()
def delete_scan(scan_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        scan = Scan.query.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404

        if scan.user_id != user_id and user.role != "admin":
            return jsonify({"error": "Access denied. You can only delete your own scans."}), 403

        db.session.delete(scan)
        db.session.commit()

        return jsonify({"message": "Scan deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete scan: {str(e)}"}), 500
