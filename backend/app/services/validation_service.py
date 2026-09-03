import json
import os
import re

from app.services.llm_judge_service import evaluate_rule
RULES_FILE = os.path.join(os.path.dirname(__file__), "..", "rules", "rules_2026_amend_3.json")

def load_rules():
    with open(RULES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def validate_compliance(pipeline_data, extracted_fields=None):
    """
    Evaluates extracted facts against versioned rules.
    pipeline_data is the dict from process_image_pipeline.
    """
    if extracted_fields is None:
        extracted_fields = {}

    if not pipeline_data or not pipeline_data.get("extracted_data"):
        return {
            "overall_status": "non_compliant",
            "checks": [
                {
                    "rule_name": "OCR Text Extraction",
                    "status": "fail",
                    "message": "No text could be extracted from the image.",
                    "citation": "System",
                    "severity": "critical",
                }
            ],
        }

    rules_def = load_rules()
    checks = []
    
    extracted_data = pipeline_data.get("extracted_data", [])
    full_text = pipeline_data.get("full_text", "")
    pixels_per_mm = pipeline_data.get("calibrated_pixels_per_mm")

    # Group texts by zone for easier checking
    zone_texts = {}
    for item in extracted_data:
        zone = item.get("zone", "unknown")
        if zone not in zone_texts:
            zone_texts[zone] = []
        zone_texts[zone].append(item)

    for rule in rules_def["rules"]:
        rule_type = rule["type"]
        field_zone = rule["field"]
        
        # Determine which text blocks to check
        items_to_check = []
        if field_zone == "any":
            items_to_check = extracted_data
        elif field_zone in zone_texts:
            items_to_check = zone_texts[field_zone]
        else:
            # If the zone wasn't found by heuristics, fallback to all text (graceful degradation)
            items_to_check = extracted_data

        combined_text_for_zone = " ".join([i["text"] for i in items_to_check])

        if rule_type == "regex":
            pattern = re.compile(rule["pattern"])
            match = pattern.search(combined_text_for_zone)
            
            if match:
                # Calculate avg confidence of items in this zone that might contain the match
                # Rough approximation: take avg confidence of the zone
                avg_conf = sum([i["confidence"] for i in items_to_check]) / len(items_to_check) if items_to_check else 0
                
                status = "pass"
                if avg_conf < 0.60:
                    status = "human_review_required"
                    
                checks.append({
                    "rule_name": rule["name"],
                    "status": status,
                    "message": f"Found: {match.group(0).strip()}",
                    "citation": rule["citation"],
                    "severity": "info" if status == "pass" else "warning"
                })
                
                # Populate extracted_fields for DB
                if rule["id"] == "mrp_declaration":
                    extracted_fields["mrp"] = match.group(0).strip()
                elif rule["id"] == "net_quantity":
                    extracted_fields["net_quantity"] = match.group(0).strip()
                elif rule["id"] == "manufacturer":
                    extracted_fields["manufacturer"] = match.group(0).strip()
                elif rule["id"] == "country_of_origin":
                    extracted_fields["country_of_origin"] = match.group(2).strip() if match.lastindex and match.lastindex >= 2 else match.group(0).strip()
                elif rule["id"] == "consumer_care":
                    extracted_fields["consumer_care"] = match.group(0).strip()
            else:
                checks.append({
                    "rule_name": rule["name"],
                    "status": "fail" if rule["severity"] == "critical" else "likely_violation",
                    "message": rule["error_msg"],
                    "citation": rule["citation"],
                    "severity": rule["severity"]
                })

        elif rule_type == "height_check":
            if not pixels_per_mm:
                checks.append({
                    "rule_name": rule["name"],
                    "status": "human_review_required",
                    "message": "No reference card detected. Could not calibrate physical font size.",
                    "citation": rule["citation"],
                    "severity": "warning"
                })
                continue
                
            min_height = rule.get("min_height_mm", 0)
            # Find max height in the relevant zone
            max_item_height = 0
            for item in items_to_check:
                h = item.get("physical_height_mm", 0)
                if h > max_item_height:
                    max_item_height = h
                    
            if max_item_height >= min_height:
                checks.append({
                    "rule_name": rule["name"],
                    "status": "pass",
                    "message": f"Measured height {max_item_height:.2f}mm meets minimum {min_height}mm.",
                    "citation": rule["citation"],
                    "severity": "info"
                })
            else:
                checks.append({
                    "rule_name": rule["name"],
                    "status": "likely_violation",
                    "message": f"Largest text in zone measured {max_item_height:.2f}mm. Minimum required is {min_height}mm.",
                    "citation": rule["citation"],
                    "severity": rule["severity"]
                })
        
        elif rule_type == "llm_evaluation":
            eval_result = evaluate_rule(rule["prompt"], combined_text_for_zone)
            if eval_result == "pass":
                checks.append({
                    "rule_name": rule["name"],
                    "status": "pass",
                    "message": "Groq LLM semantically verified compliance.",
                    "citation": rule["citation"],
                    "severity": "info"
                })
            elif eval_result == "fail":
                checks.append({
                    "rule_name": rule["name"],
                    "status": "fail" if rule["severity"] == "critical" else "likely_violation",
                    "message": rule.get("error_msg", "Failed semantic evaluation."),
                    "citation": rule["citation"],
                    "severity": rule["severity"]
                })
            else:
                checks.append({
                    "rule_name": rule["name"],
                    "status": "human_review_required",
                    "message": "Groq LLM could not definitively pass or fail the rule.",
                    "citation": rule["citation"],
                    "severity": "warning"
                })

    # --- NEW: Bilingual/Script Compliance & Mistranslation Detector (USP 2) ---
    if full_text:
        from app.services.translation_check_service import check_translation_consistency
        translation_result = check_translation_consistency(full_text)
        
        if translation_result["status"] == "mismatch":
            checks.append({
                "rule_name": "Bilingual Mistranslation Detector",
                "status": "fail",
                "message": "Mistranslations detected between English and Hindi: " + "; ".join(translation_result["mismatches"]),
                "citation": "Rule 8 (Cross-check)",
                "severity": "critical"
            })
        elif translation_result["status"] == "match":
            checks.append({
                "rule_name": "Bilingual Mistranslation Detector",
                "status": "pass",
                "message": "Hindi and English declarations match semantically.",
                "citation": "Rule 8 (Cross-check)",
                "severity": "info"
            })
        elif translation_result["status"] == "skipped" or translation_result["status"] == "error":
             checks.append({
                "rule_name": "Bilingual Mistranslation Detector",
                "status": "human_review_required",
                "message": "Translation cross-check could not be completed.",
                "citation": "Rule 8 (Cross-check)",
                "severity": "warning"
            })

    # Overall status calculation
    failed_critical = sum(1 for c in checks if c["status"] == "fail")
    needs_review = sum(1 for c in checks if c["status"] in ["human_review_required", "likely_violation"])

    if failed_critical == 0 and needs_review == 0:
        overall_status = "compliant"
    elif failed_critical == 0 and needs_review > 0:
        overall_status = "review_required"
    else:
        overall_status = "non_compliant"
        
    llm_data = pipeline_data.get("llm_extracted_data", {})
    if llm_data:
        if llm_data.get("product_name"): extracted_fields["product_name"] = llm_data.get("product_name")
        if llm_data.get("mrp"): extracted_fields["mrp"] = llm_data.get("mrp")
        if llm_data.get("net_quantity"): extracted_fields["net_quantity"] = llm_data.get("net_quantity")
        if llm_data.get("manufacturer"): extracted_fields["manufacturer"] = llm_data.get("manufacturer")
        if llm_data.get("manufacturing_date"): extracted_fields["manufacturing_date"] = llm_data.get("manufacturing_date")
        if llm_data.get("unit_sale_price"): extracted_fields["unit_sale_price"] = llm_data.get("unit_sale_price")
        if llm_data.get("batch_number"): extracted_fields["batch_number"] = llm_data.get("batch_number")
        if llm_data.get("address"): extracted_fields["address"] = llm_data.get("address")
        
        if llm_data.get("confidence_score", 100) < 80:
            overall_status = "manual_review"

    return {
        "overall_status": overall_status,
        "rule_version_applied": rules_def["version"],
        "checks": checks,
    }
