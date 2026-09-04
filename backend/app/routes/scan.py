import os
import uuid
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models import User, Scan, VALID_ROLES
from app.services.ocr_service import process_image_pipeline
from app.services.validation_service import validate_compliance
from app.services.mismatch_service import cross_check
from app.services.report_service import generate_pdf_report
from app.services.mismatch_service import parse_ecommerce_url

scan_bp = Blueprint("scan", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "tiff", "bmp", "webp"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def reverse_geocode_city(latitude, longitude):
    """Best-effort city lookup; coordinates remain available when lookup fails."""
    if latitude is None or longitude is None:
        return None
    try:
        query = urlencode({"lat": latitude, "lon": longitude, "format": "jsonv2"})
        request = Request(
            f"https://nominatim.openstreetmap.org/reverse?{query}",
            headers={"User-Agent": "TrueMark-Inspection/1.0"},
        )
        with urlopen(request, timeout=5) as response:
            address = json.loads(response.read().decode("utf-8")).get("address", {})
        return address.get("city") or address.get("town") or address.get("municipality") or address.get("village")
    except Exception as error:
        print(f"Reverse geocoding skipped: {error}")
        return None


@scan_bp.route("/fetch-url", methods=["POST"])
@jwt_required()
def fetch_product_url():
    """Return URL product fields using the existing listing parser."""
    payload = request.get_json(silent=True) or {}
    url = str(payload.get("url", "")).strip()
    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "A valid http(s) product URL is required"}), 400
    product = parse_ecommerce_url(url)
    if not product:
        return jsonify({"error": "No product details could be extracted from this URL"}), 422
    return jsonify({"product": product}), 200


@scan_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_scan():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if "images" not in request.files:
            return jsonify({"error": "No image files provided"}), 400

        files = request.files.getlist("images")
        listing_url = request.form.get("listing_url")
        gtin = request.form.get("gtin")
        state = request.form.get("state")
        city = request.form.get("city")
        shop_name = request.form.get("shop_name")
        purchase_address = request.form.get("purchase_address")
        report_description = request.form.get("report_description")
        submitted_product_name = request.form.get("product_name")
        latitude_str = request.form.get("latitude")
        longitude_str = request.form.get("longitude")
        latitude = float(latitude_str) if latitude_str else None
        longitude = float(longitude_str) if longitude_str else None
        city = city or reverse_geocode_city(latitude, longitude)
        
        if not files or all(f.filename == "" for f in files):
            return jsonify({"error": "No files selected"}), 400

        image_paths = []
        upload_dir = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            if file and allowed_file(file.filename):
                ext = file.filename.rsplit(".", 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                file.save(filepath)
                image_paths.append(filepath)

        if not image_paths:
            return jsonify({
                "error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        try:
            from PIL import Image
            imgs = [Image.open(p) for p in image_paths]
            target_height = 800
            resized_imgs = []
            for img in imgs:
                w_percent = (target_height / float(img.size[1]))
                h_size = int((float(img.size[0]) * float(w_percent)))
                resized = img.resize((h_size, target_height), Image.Resampling.LANCZOS)
                resized_imgs.append(resized)
            
            total_width = sum(i.size[0] for i in resized_imgs)
            max_height = max(i.size[1] for i in resized_imgs)
            
            stitched = Image.new('RGB', (total_width, max_height))
            x_offset = 0
            for img in resized_imgs:
                stitched.paste(img, (x_offset, 0))
                x_offset += img.size[0]
                
            stitched_path = os.path.join(upload_dir, f"stitched_{uuid.uuid4().hex}.jpg")
            stitched.save(stitched_path, format="JPEG", quality=85)
        except Exception as e:
            print(f"Stitching failed: {e}")
            stitched_path = image_paths[0]

        import hashlib
        try:
            with open(stitched_path, "rb") as f:
                image_hash = hashlib.sha256(f.read()).hexdigest()
        except Exception as e:
            print(f"Hashing failed: {e}")
            image_hash = None

        from app.services.cloudinary_service import upload_to_cloudinary
        cloud_url = upload_to_cloudinary(stitched_path)
        final_image_path = cloud_url if cloud_url else stitched_path

        pipeline_data = process_image_pipeline(image_paths)
        extracted_fields = {}
        compliance_result = validate_compliance(pipeline_data, extracted_fields)
        ocr_text = pipeline_data.get("full_text", "")
        
        mismatch_result = cross_check(listing_url, extracted_fields) if listing_url else None

        product_name = submitted_product_name or extracted_fields.get("product_name", "")
        manufacturer = extracted_fields.get("manufacturer", "")

        scan = Scan(
            user_id=user_id,
            image_path=final_image_path,
            ocr_text=ocr_text,
            extracted_fields=extracted_fields,
            compliance_result=compliance_result,
            mismatch_result=mismatch_result,
            gtin=gtin,
            state=state,
            city=city,
            latitude=latitude,
            longitude=longitude,
            ocr_regions=pipeline_data.get("extracted_data", []),
            overall_status=compliance_result.get("overall_status", "unknown"),
            product_name=product_name,
            manufacturer=manufacturer,
            image_hash=image_hash,
            shop_name=shop_name,
            purchase_address=purchase_address,
            report_description=report_description,
            report_status="submitted",
        )
        db.session.add(scan)
        db.session.commit()

        return jsonify({
            "message": "Scan uploaded and processed successfully",
            "scan": scan.to_dict(),
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@scan_bp.route("/<int:scan_id>", methods=["GET"])
@jwt_required()
def get_scan(scan_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        scan = Scan.query.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404

        if user.role not in set(VALID_ROLES) | {"admin", "officer"} and scan.user_id != user_id:
            return jsonify({"error": "Access denied"}), 403

        return jsonify({"scan": scan.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch scan: {str(e)}"}), 500


@scan_bp.route("/<int:scan_id>/analyze", methods=["POST"])
@jwt_required()
def analyze_citizen_report(scan_id):
    """Run the existing OCR/compliance pipeline only after inspector review starts."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        scan = Scan.query.get(scan_id)
        if not user or not scan:
            return jsonify({"error": "Report not found"}), 404
        if scan.source != "citizen":
            return jsonify({"error": "This action is only available for citizen reports"}), 400
        if scan.assigned_inspector_id != user_id and user.role not in {"administrator", "admin", "officer"}:
            return jsonify({"error": "Only the assigned inspector can start this scan"}), 403

        image_path = scan.analysis_image_path or scan.image_path
        if not image_path or image_path.startswith("http"):
            return jsonify({"error": "The original report image is not available for analysis"}), 422
        if not os.path.isabs(image_path):
            image_path = os.path.join(current_app.config["UPLOAD_FOLDER"], os.path.basename(image_path))
        if not os.path.exists(image_path):
            return jsonify({"error": "The original report image could not be found"}), 404

        pipeline_data = process_image_pipeline([image_path])
        extracted_fields = {}
        compliance_result = validate_compliance(pipeline_data, extracted_fields)
        scan.ocr_text = pipeline_data.get("full_text", "")
        scan.extracted_fields = extracted_fields
        scan.compliance_result = compliance_result
        scan.ocr_regions = pipeline_data.get("extracted_data", [])
        scan.overall_status = compliance_result.get("overall_status", "unknown")
        scan.report_status = "analyzed"
        if not scan.product_name:
            scan.product_name = extracted_fields.get("product_name") or ""
        scan.manufacturer = extracted_fields.get("manufacturer", "")
        db.session.commit()
        return jsonify({"message": "Report analyzed", "scan": scan.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Report analysis failed: {str(e)}"}), 500


@scan_bp.route("/<int:scan_id>/report", methods=["GET"])
@jwt_required()
def get_report(scan_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        scan = Scan.query.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404

        if user.role not in set(VALID_ROLES) | {"admin", "officer"} and scan.user_id != user_id:
            return jsonify({"error": "Access denied"}), 403

        report_path = generate_pdf_report(scan)
        if not report_path or not os.path.exists(report_path):
            return jsonify({"error": "Failed to generate report"}), 500

        return send_file(
            os.path.abspath(report_path),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"truemark_report_{scan_id}.pdf",
        )

    except Exception as e:
        return jsonify({"error": f"Report generation failed: {str(e)}"}), 500


@scan_bp.route("/gtin/<string:gtin>/risk", methods=["GET"])
@jwt_required()
def gtin_risk(gtin):
    try:
        scans = Scan.query.filter_by(gtin=gtin).all()
        if not scans:
            return jsonify({"risk_score": 0, "message": "No history found for this GTIN", "history": []}), 200

        failed_count = sum(1 for s in scans if s.overall_status == "non_compliant")
        review_count = sum(1 for s in scans if s.overall_status == "review_required")
        total = len(scans)

        # Simple heuristic for risk out of 100
        risk_score = min(100, int(((failed_count * 1.0) + (review_count * 0.5)) / total * 100))

        risk_tier = "LOW"
        if risk_score > 60:
            risk_tier = "HIGH"
        elif risk_score > 30:
            risk_tier = "MEDIUM"

        return jsonify({
            "gtin": gtin,
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "total_scans": total,
            "history": [{"scan_id": s.id, "status": s.overall_status, "date": s.created_at.isoformat()} for s in scans]
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to calculate risk: {str(e)}"}), 500


@scan_bp.route("/public-upload", methods=["POST"])
def public_upload_scan():
    try:
        user = User.query.filter_by(username="anonymous_citizen").first()
        if not user:
            return jsonify({"error": "System not ready for public submissions"}), 500

        user_id = user.id

        if "images" not in request.files:
            return jsonify({"error": "No image files provided"}), 400

        files = request.files.getlist("images")
        gtin = request.form.get("gtin")
        latitude_str = request.form.get("latitude")
        longitude_str = request.form.get("longitude")
        city = request.form.get("city")
        shop_name = request.form.get("shop_name")
        purchase_address = request.form.get("purchase_address")
        report_description = request.form.get("report_description")
        submitted_product_name = request.form.get("product_name")

        latitude = float(latitude_str) if latitude_str else None
        longitude = float(longitude_str) if longitude_str else None
        city = city or reverse_geocode_city(latitude, longitude)
        
        if not files or all(f.filename == "" for f in files):
            return jsonify({"error": "No files selected"}), 400

        image_paths = []
        upload_dir = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            if file and allowed_file(file.filename):
                ext = file.filename.rsplit(".", 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                file.save(filepath)
                image_paths.append(filepath)

        if not image_paths:
            return jsonify({
                "error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        try:
            from PIL import Image
            imgs = [Image.open(p) for p in image_paths]
            target_height = 800
            resized_imgs = []
            for img in imgs:
                w_percent = (target_height / float(img.size[1]))
                h_size = int((float(img.size[0]) * float(w_percent)))
                resized = img.resize((h_size, target_height), Image.Resampling.LANCZOS)
                resized_imgs.append(resized)
            
            total_width = sum(i.size[0] for i in resized_imgs)
            max_height = max(i.size[1] for i in resized_imgs)
            
            stitched = Image.new('RGB', (total_width, max_height))
            x_offset = 0
            for img in resized_imgs:
                stitched.paste(img, (x_offset, 0))
                x_offset += img.size[0]
                
            stitched_path = os.path.join(upload_dir, f"stitched_{uuid.uuid4().hex}.jpg")
            stitched.save(stitched_path, format="JPEG", quality=85)
        except Exception as e:
            print(f"Stitching failed: {e}")
            stitched_path = image_paths[0]

        import hashlib
        try:
            with open(stitched_path, "rb") as f:
                image_hash = hashlib.sha256(f.read()).hexdigest()
        except Exception as e:
            print(f"Hashing failed: {e}")
            image_hash = None

        from app.services.cloudinary_service import upload_to_cloudinary
        cloud_url = upload_to_cloudinary(stitched_path)
        final_image_path = cloud_url if cloud_url else stitched_path

        product_name = submitted_product_name or ""

        scan = Scan(
            user_id=user_id,
            image_path=final_image_path,
            ocr_text=None,
            extracted_fields={},
            compliance_result=None,
            gtin=gtin,
            source="citizen",
            latitude=latitude,
            longitude=longitude,
            city=city,
            ocr_regions=None,
            overall_status="pending_review",
            product_name=product_name,
            manufacturer=None,
            image_hash=image_hash,
            shop_name=shop_name,
            purchase_address=purchase_address,
            report_description=report_description,
            report_status="submitted",
            analysis_image_path=stitched_path,
        )
        db.session.add(scan)
        db.session.commit()

        return jsonify({
            "message": "Scan uploaded successfully. Thank you for your report.",
            "scan": scan.to_dict(),
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500
