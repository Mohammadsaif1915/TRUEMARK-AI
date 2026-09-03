"""
rules_engine/engine.py
-----------------------
Yeh module rules.json padhta hai aur OCR se nikle hue combined text/words ko
har rule ke against check karta hai.

Ab OCR result multi-image hota hai (product ke alag-alag sides ki photos se),
isliye har rule do tarah se check hota hai:
  1. Pehle har image ke apne text mein match dhoondo (isse bounding box bhi
     mil jaata hai us specific image pe - annotation ke liye zaroori hai)
  2. Agar kisi single image mein match nahi mila, toh combined (saari
     images ka jode hua) text pe try karo - kabhi kabhi ek declaration
     multiple photos mein OCR ki wajah se split ho sakti hai

Simple logic har rule ke liye:
  1. Agar rule ka field "font_size" hai -> alag se height-based check
     (saari images ke saare words milaake)
  2. Nahi toh -> upar wala regex match process

Isko "AI" mat samjho - yeh ek seedha checklist evaluator hai.
Iska fayda yeh hai ki yeh 100% explainable hai - judge poochhega
"yeh fail kyun hua" toh tum exact reason dikha sakte ho, kisi black-box
model ka bharosa nahi karna padta.
"""

import json
import re
import os

RULES_PATH = os.path.join(os.path.dirname(__file__), "rules.json")


def load_rules():
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["rules"]


def find_bounding_box_for_match(matched_text, words):
    """
    Regex se jo text match hua, uske corresponding OCR words dhundo
    taaki hum image pe box draw kar sakein (annotated report ke liye).

    Simple approach: matched_text ke pehle 2-3 words ko OCR words list
    mein dhundo (case-insensitive), aur unki bounding box union nikaalo.
    """
    matched_tokens = matched_text.lower().split()[:3]
    if not matched_tokens:
        return None

    found_boxes = []
    for word in words:
        if word["text"].lower().strip(".,:") in matched_tokens:
            found_boxes.append(word)

    if not found_boxes:
        return None

    left = min(w["left"] for w in found_boxes)
    top = min(w["top"] for w in found_boxes)
    right = max(w["left"] + w["width"] for w in found_boxes)
    bottom = max(w["top"] + w["height"] for w in found_boxes)

    return {"left": left, "top": top, "right": right, "bottom": bottom}


def check_font_size_rule(rule, ocr_result):
    """
    Font-size / readability heuristic check.
    Logic: har OCR word (chahe woh kisi bhi side-photo se aaya ho) ki
    height_ratio (uski apni image ke relative) dekho.
    Agar average text-height-ratio minimum threshold se kam hai,
    toh flag karo ki text bahut chhota hai.

    IMPORTANT LIMITATION (report mein bhi mention karna):
    Yeh sirf ek heuristic hai. Asli legal font-size (mm mein) nikalne
    ke liye photo mein ek known-size reference object (jaise ek scale/ruler)
    ya camera calibration chahiye hoti hai. Prototype ke liye hum sirf
    "relative to image size" check kar rahe hain.
    """
    # Saari images ke saare words ek flat list mein le aao
    all_words = [w for img in ocr_result["images"] for w in img["words"]]

    if not all_words:
        return {
            "rule_id": rule["id"],
            "label": rule["label"],
            "status": "FAIL",
            "reason": "Koi text detect nahi hua, font size check nahi ho paaya.",
            "severity": rule["severity"],
            "extracted_value": None,
            "bbox": None
        }

    ratios = [w["height_ratio"] for w in all_words if w["height_ratio"] > 0]
    avg_height_ratio = sum(ratios) / len(ratios) if ratios else 0
    small_text_count = sum(1 for w in all_words if w["height_ratio"] < rule["min_text_height_ratio"])
    small_text_pct = round((small_text_count / len(all_words)) * 100, 1) if all_words else 0

    if avg_height_ratio < rule["min_text_height_ratio"]:
        return {
            "rule_id": rule["id"],
            "label": rule["label"],
            "status": "FAIL",
            "reason": f"Average text height ratio ({round(avg_height_ratio, 4)}) minimum threshold "
                      f"({rule['min_text_height_ratio']}) se kam hai. ~{small_text_pct}% words bahut chhote hain.",
            "severity": rule["severity"],
            "extracted_value": f"{small_text_pct}% text below minimum readable size",
            "bbox": None
        }
    else:
        return {
            "rule_id": rule["id"],
            "label": rule["label"],
            "status": "PASS",
            "reason": "Text ka average size acceptable range mein hai.",
            "severity": rule["severity"],
            "extracted_value": f"avg ratio: {round(avg_height_ratio, 4)}",
            "bbox": None
        }


def check_regex_rule(rule, ocr_result):
    """
    Generic regex-based rule check (MRP, net qty, mfg date, waghera).
    Har uploaded side-photo mein ek-ek karke dhoondta hai, taaki bounding
    box us exact image pe mil sake jahan declaration mili.
    """
    pattern = re.compile(rule["regex"], re.IGNORECASE)

    # Step 1: Har image ke apne text mein try karo (bbox + image_index milta hai)
    for image_index, img in enumerate(ocr_result["images"]):
        match = pattern.search(img["full_text"].lower())
        if match:
            matched_text = match.group(0)
            bbox = find_bounding_box_for_match(matched_text, img["words"])
            if bbox:
                bbox["image_index"] = image_index
            return {
                "rule_id": rule["id"],
                "label": rule["label"],
                "status": "PASS",
                "reason": "Declaration mil gayi aur format sahi hai.",
                "severity": rule["severity"],
                "extracted_value": matched_text.strip()[:100],
                "bbox": bbox
            }

    # Step 2: Kisi single image mein nahi mila -> combined text pe fallback try karo
    combined_match = pattern.search(ocr_result["full_text"].lower())
    if combined_match:
        matched_text = combined_match.group(0)
        return {
            "rule_id": rule["id"],
            "label": rule["label"],
            "status": "PASS",
            "reason": "Declaration mil gayi aur format sahi hai.",
            "severity": rule["severity"],
            "extracted_value": matched_text.strip()[:100],
            "bbox": None
        }

    return {
        "rule_id": rule["id"],
        "label": rule["label"],
        "status": "FAIL" if rule["required"] else "WARNING",
        "reason": f"'{rule['label']}' kisi bhi upload ki hui photo mein nahi mili ya format galat hai. "
                  f"Expected keywords: {', '.join(rule['keywords'])}",
        "severity": rule["severity"],
        "extracted_value": None,
        "bbox": None
    }


def run_compliance_check(ocr_result):
    """
    MAIN FUNCTION - isko app.py se call karo.
    ocr_result yahan extract_text_and_boxes_multi() ka output hona chahiye
    (ek ya zyada side-photos ka combined result).
    Har rule ko check karta hai aur ek summary dict return karta hai.
    """
    rules = load_rules()
    results = []

    for rule in rules:
        if rule["field"] == "font_size":
            result = check_font_size_rule(rule, ocr_result)
        else:
            result = check_regex_rule(rule, ocr_result)
        results.append(result)

    total_rules = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    warnings = sum(1 for r in results if r["status"] == "WARNING")

    compliance_score = round((passed / total_rules) * 100, 1) if total_rules else 0
    overall_status = "COMPLIANT" if failed == 0 else "NON-COMPLIANT"

    return {
        "results": results,
        "total_rules": total_rules,
        "passed": passed,
        "failed": failed,
        "warnings": warnings,
        "compliance_score": compliance_score,
        "overall_status": overall_status
    }
