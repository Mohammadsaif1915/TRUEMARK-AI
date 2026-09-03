from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models import User, Scan

dashboard_bp = Blueprint("dashboard", __name__)


def require_officer_or_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return None, (jsonify({"error": "User not found"}), 404)
    if user.role not in ("admin", "officer"):
        return None, (jsonify({"error": "Access denied. Admin or officer role required."}), 403)
    return user, None


@dashboard_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    try:
        user, error = require_officer_or_admin()
        if error:
            return error

        total_scans = Scan.query.count()
        compliant = Scan.query.filter_by(overall_status="compliant").count()
        non_compliant = Scan.query.filter_by(overall_status="non_compliant").count()
        partially_compliant = Scan.query.filter_by(overall_status="partially_compliant").count()

        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_scans = (
            Scan.query.filter(Scan.created_at >= seven_days_ago)
            .order_by(Scan.created_at.desc())
            .limit(10)
            .all()
        )

        scans_per_day = []
        for i in range(6, -1, -1):
            day = datetime.now(timezone.utc).date() - timedelta(days=i)
            day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            count = Scan.query.filter(
                Scan.created_at >= day_start, Scan.created_at < day_end
            ).count()
            scans_per_day.append({
                "date": day.isoformat(),
                "count": count,
            })

        violation_rows = (
            db.session.query(
                Scan.compliance_result,
            )
            .filter(Scan.compliance_result.isnot(None))
            .all()
        )
        violation_counts = {}
        for (result,) in violation_rows:
            if isinstance(result, dict):
                checks = result.get("checks", [])
                for check in checks:
                    if check.get("status") == "fail":
                        rule = check.get("rule_name", "Unknown")
                        violation_counts[rule] = violation_counts.get(rule, 0) + 1

        top_violations = sorted(
            violation_counts.items(), key=lambda x: x[1], reverse=True
        )[:10]
        top_violations_list = [
            {"rule": rule, "count": count} for rule, count in top_violations
        ]

        return jsonify({
            "stats": {
                "total_scans": total_scans,
                "compliant": compliant,
                "non_compliant": non_compliant,
                "partially_compliant": partially_compliant,
                "recent_scans": [s.to_dict() for s in recent_scans],
                "scans_per_day": scans_per_day,
                "top_violations": top_violations_list,
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch stats: {str(e)}"}), 500


@dashboard_bp.route("/scans", methods=["GET"])
@jwt_required()
def get_all_scans():
    try:
        user, error = require_officer_or_admin()
        if error:
            return error

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(per_page, 100)

        status = request.args.get("status")
        source = request.args.get("source")
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        manufacturer = request.args.get("manufacturer")

        query = Scan.query

        if status:
            query = query.filter_by(overall_status=status)
        if source:
            query = query.filter_by(source=source)
        if date_from:
            try:
                df = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
                query = query.filter(Scan.created_at >= df)
            except ValueError:
                return jsonify({"error": "Invalid date_from format. Use ISO 8601."}), 400
        if date_to:
            try:
                dt = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
                query = query.filter(Scan.created_at <= dt)
            except ValueError:
                return jsonify({"error": "Invalid date_to format. Use ISO 8601."}), 400
        if manufacturer:
            query = query.filter(
                Scan.manufacturer.ilike(f"%{manufacturer}%")
            )

        query = query.order_by(Scan.created_at.desc())
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
        return jsonify({"error": f"Failed to fetch scans: {str(e)}"}), 500


@dashboard_bp.route("/map", methods=["GET"])
@jwt_required()
def get_map_data():
    try:
        user, error = require_officer_or_admin()
        if error:
            return error

        state_rows = (
            db.session.query(
                Scan.state,
                func.count(Scan.id).label("total"),
                func.sum(db.case((Scan.overall_status == "compliant", 1), else_=0)).label("compliant"),
                func.sum(db.case((Scan.overall_status == "non_compliant", 1), else_=0)).label("non_compliant"),
            )
            .filter(Scan.state.isnot(None), Scan.state != "")
            .group_by(Scan.state)
            .all()
        )

        states = []
        for row in state_rows:
            states.append({
                "state": row.state,
                "total": row.total,
                "compliant": row.compliant or 0,
                "non_compliant": row.non_compliant or 0,
                "violation_rate": round((row.non_compliant or 0) / row.total * 100, 1),
            })

        return jsonify({"states": states}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch map data: {str(e)}"}), 500


@dashboard_bp.route("/alerts", methods=["GET"])
@jwt_required()
def get_repeat_offenders():
    try:
        user, error = require_officer_or_admin()
        if error:
            return error

        limit = request.args.get("limit", 20, type=int)
        limit = min(limit, 100)

        gtin_rows = (
            db.session.query(
                Scan.gtin,
                Scan.product_name,
                Scan.manufacturer,
                func.count(Scan.id).label("total_scans"),
                func.sum(db.case((Scan.overall_status == "non_compliant", 1), else_=0)).label("fail_count"),
                func.max(Scan.created_at).label("last_seen"),
            )
            .filter(Scan.gtin.isnot(None), Scan.gtin != "")
            .group_by(Scan.gtin, Scan.product_name, Scan.manufacturer)
            .having(func.count(Scan.id) > 1)
            .order_by(db.desc("fail_count"))
            .limit(limit)
            .all()
        )

        alerts = []
        for row in gtin_rows:
            total = row.total_scans
            fails = row.fail_count or 0
            risk_score = min(100, int((fails / total) * 100)) if total > 0 else 0
            alerts.append({
                "gtin": row.gtin,
                "product_name": row.product_name or "Unknown",
                "manufacturer": row.manufacturer or "Unknown",
                "total_scans": total,
                "fail_count": fails,
                "risk_score": risk_score,
                "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            })

        return jsonify({"alerts": alerts}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch alerts: {str(e)}"}), 500


@dashboard_bp.route("/leads", methods=["GET"])
@jwt_required()
def get_citizen_leads():
    try:
        user, error = require_officer_or_admin()
        if error:
            return error

        limit = request.args.get("limit", 50, type=int)

        leads = (
            Scan.query
            .filter_by(source="citizen")
            .filter(Scan.overall_status.in_(["non_compliant", "partially_compliant"]))
            .order_by(Scan.created_at.desc())
            .limit(limit)
            .all()
        )

        return jsonify({
            "leads": [lead.to_dict() for lead in leads]
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch leads: {str(e)}"}), 500
