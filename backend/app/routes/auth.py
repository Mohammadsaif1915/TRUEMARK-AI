import re
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


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        required_fields = ["username", "email", "password", "role"]
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        # Email format validation
        email = data["email"].strip().lower()
        if not EMAIL_REGEX.match(email):
            return jsonify({"error": "Invalid email address"}), 400

        # Password length validation
        if len(data["password"]) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # Duplicate checks
        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"error": "Username already exists"}), 409
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 409

        # Role validation
        role = data["role"].strip().lower()
        if role not in VALID_ROLES:
            return jsonify({
                "error": f"Please select a role. Must be one of: {', '.join(ROLE_DISPLAY_NAMES[r] for r in VALID_ROLES)}"
            }), 400

        user = User(
            username=data["username"].strip(),
            email=email,
            role=role,
            full_name=data.get("full_name", "").strip() or None,
            badge_number=data.get("badge_number", "").strip() or None,
        )
        user.set_password(data["password"])

        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


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

        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": user.to_dict(),
        }), 200

    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


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
