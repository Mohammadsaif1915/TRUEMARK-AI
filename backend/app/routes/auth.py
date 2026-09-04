import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from app import db
from app.models import User, VALID_ROLES, ROLE_DISPLAY_NAMES

auth_bp = Blueprint("auth", __name__)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        if not data.get("email") or not data.get("password"):
            return jsonify({"error": "Email and password are required"}), 400

        email = data["email"].strip().lower()
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(data["password"]):
            return jsonify({"error": "Invalid email or password"}), 401

        if user.must_change_password:
            return jsonify({
                "error": "Temporary password detected. Please change your password.",
                "must_change_password": True,
                "email": email
            }), 403

        user.is_active = True
        user.last_login_at = datetime.now(timezone.utc)
        user.last_seen_at = user.last_login_at
        user.last_logout_at = None
        db.session.commit()
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": user.to_dict(),
        }), 200

    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/change-password", methods=["POST"])
def change_password():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        email = data.get("email", "").strip().lower()
        temp_password = data.get("temporary_password")
        new_password = data.get("new_password")

        if not email or not temp_password or not new_password:
            return jsonify({"error": "Missing required fields"}), 400

        if len(new_password) < 8:
            return jsonify({"error": "New password must be at least 8 characters"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(temp_password):
            return jsonify({"error": "Invalid email or temporary password"}), 401

        if not user.must_change_password:
            return jsonify({"error": "Password change not required"}), 400

        user.set_password(new_password)
        user.must_change_password = False
        user.is_active = True
        user.last_login_at = datetime.now(timezone.utc)
        user.last_seen_at = user.last_login_at
        user.last_logout_at = None
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Password updated successfully",
            "access_token": access_token,
            "user": user.to_dict(),
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Password change failed: {str(e)}"}), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"user": user.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch user: {str(e)}"}), 500


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        user = User.query.get(int(get_jwt_identity()))
        if user:
            user.is_active = False
            user.last_logout_at = datetime.now(timezone.utc)
            db.session.commit()
        return jsonify({"message": "Logout recorded"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Logout failed: {str(e)}"}), 500


@auth_bp.route("/heartbeat", methods=["POST"])
@jwt_required()
def heartbeat():
    try:
        user = User.query.get(int(get_jwt_identity()))
        if user:
            user.is_active = True
            user.last_seen_at = datetime.now(timezone.utc)
            db.session.commit()
        return jsonify({"message": "Activity recorded"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Activity update failed: {str(e)}"}), 500
