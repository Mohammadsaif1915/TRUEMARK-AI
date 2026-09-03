import re
import cv2
import numpy as np
import os
import json
import tempfile
import google.generativeai as genai


# ============================================================
# Helpers
# ============================================================

def _get_reader():
    """
    Kept for backward compatibility.
    PaddleOCR reader is initialized inside extract_text().
    """
    return None


def _clean_json_response(text):
    """
    Removes markdown code fences if Gemini returns them.
    """
    if not text:
        return ""

    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ============================================================
# Image preprocessing
# ============================================================

def preprocess_image_for_ocr(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return image_path

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    enhanced = clahe.apply(gray)

    denoised = cv2.fastNlMeansDenoising(
        enhanced,
        None,
        h=10,
        searchWindowSize=21,
        templateWindowSize=7
    )

    fd, temp_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)

    cv2.imwrite(temp_path, denoised)

    return temp_path


# ============================================================
# Gemini Vision - structured extraction
# ============================================================

def extract_structured_data_gemini_vision(image_paths):
    """
    Primary multimodal extraction.

    Gemini is responsible for understanding the packaging and
    extracting structured compliance fields.

    Bounding boxes are intentionally NOT fabricated here.
    Spatial/bbox evidence comes from PaddleOCR.
    """

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        print(
            "WARNING: GEMINI_API_KEY not found. "
            "Skipping Gemini Vision."
        )
        return None

    try:
        genai.configure(api_key=api_key)

        prompt = """
You are a strict Legal Metrology packaging compliance extraction AI.

Analyze ALL provided product packaging images.

Extract the following information:

1. raw_text_detected
   - Transcribe ALL clearly visible packaging text.
   - Preserve important labels such as MRP, Net Quantity,
     Manufactured by, Imported by, Country of Origin,
     Batch No, MFD, PKD, consumer care details, etc.
   - Do not invent text.

2. product_name
3. mrp
4. unit_sale_price
5. manufacturer
6. address
7. net_quantity
8. manufacturing_date
9. batch_number
10. country_of_origin
11. consumer_care
12. confidence_score

If a value cannot be reliably found, return null.

Important:
- Do NOT hallucinate missing information.
- Keep extracted values close to the exact visible wording.
- MRP should include the currency/value when visible.
- Net quantity should preserve its unit.
- Manufacturing date should preserve the printed date.
- Country of origin should contain the actual country.
- Consumer care may be a phone number or email.
- confidence_score must be an integer from 0 to 100.

Return ONLY valid JSON.

Schema:
{
  "raw_text_detected": "string",
  "product_name": "string or null",
  "mrp": "string or null",
  "unit_sale_price": "string or null",
  "manufacturer": "string or null",
  "address": "string or null",
  "net_quantity": "string or null",
  "manufacturing_date": "string or null",
  "batch_number": "string or null",
  "country_of_origin": "string or null",
  "consumer_care": "string or null",
  "confidence_score": 0
}
"""

        images = []

        for path in image_paths:
            try:
                images.append(__import__("PIL").Image.open(path))
            except Exception as image_error:
                print(
                    f"Gemini image load error for {path}: "
                    f"{image_error}"
                )

        if not images:
            return None

        model = genai.GenerativeModel("gemini-3.6-flash")

        response = model.generate_content(
            [prompt] + images,
            request_options={"timeout": 30}
        )

        text = _clean_json_response(response.text)

        data = json.loads(text)

        if not isinstance(data, dict):
            print("Gemini Vision returned non-object JSON.")
            return None

        return data

    except Exception as e:
        print(f"Gemini Vision Error: {e}")
        return None


# ============================================================
# PaddleOCR - spatial OCR
# ============================================================

def extract_text(image_path):
    """
    Extract OCR text together with real bounding boxes.

    This is used for:
    - spatial evidence
    - heuristic zones
    - frontend bounding-box visualization
    - physical font-height measurement
    """

    temp_path = None

    try:
        temp_path = preprocess_image_for_ocr(image_path)

        # Compatibility with PaddleOCR / newer NumPy versions
        if not hasattr(np, "long"):
            np.long = np.int64

        if not hasattr(np, "ulong"):
            np.ulong = np.uint64

        from paddleocr import PaddleOCR

        ocr = PaddleOCR(
            use_textline_orientation=True,
            lang="en"
        )

        result = ocr.ocr(temp_path)

        extracted = []

        if not result:
            return extracted

        # PaddleOCR versions can return slightly different structures.
        first_result = result[0] if isinstance(result, list) else result

        if not first_result:
            return extracted

        for line in first_result:
            try:
                if not line or len(line) < 2:
                    continue

                bbox = line[0]
                text_info = line[1]

                if not bbox or len(bbox) < 4:
                    continue

                if not text_info or len(text_info) < 2:
                    continue

                word_text = str(text_info[0]).strip()
                probability = _safe_float(text_info[1])

                if not word_text:
                    continue

                extracted.append({
                    "text": word_text,
                    "bbox": bbox,
                    "confidence": probability,
                    "zone": "unknown"
                })

            except Exception as line_error:
                print(
                    f"PaddleOCR line parsing error: "
                    f"{line_error}"
                )

        return extracted

    except Exception as e:
        print(f"PaddleOCR Error: {e}")
        return []

    finally:
        if temp_path and temp_path != image_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass


# ============================================================
# Gemini structured extraction from OCR text
# ============================================================

def extract_structured_data_llm(ocr_text):
    """
    Secondary structured extraction from PaddleOCR text.
    """

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return {"confidence_score": 0}

    try:
        genai.configure(api_key=api_key)

        prompt = f"""
You are a strict Legal Metrology packaging extraction AI.

Extract structured fields from the following OCR text.

Do not invent values.

If a field is not present, return null.

Fields:
- product_name
- mrp
- unit_sale_price
- manufacturer
- address
- net_quantity
- manufacturing_date
- batch_number
- country_of_origin
- consumer_care
- confidence_score

OCR TEXT:
{ocr_text}

Return ONLY valid JSON:

{{
  "product_name": "string or null",
  "mrp": "string or null",
  "unit_sale_price": "string or null",
  "manufacturer": "string or null",
  "address": "string or null",
  "net_quantity": "string or null",
  "manufacturing_date": "string or null",
  "batch_number": "string or null",
  "country_of_origin": "string or null",
  "consumer_care": "string or null",
  "confidence_score": 0
}}
"""

        model = genai.GenerativeModel("gemini-3.6-flash")

        response = model.generate_content(prompt)

        text = _clean_json_response(response.text)

        data = json.loads(text)

        if not isinstance(data, dict):
            return {"confidence_score": 0}

        return data

    except Exception as e:
        print(f"Gemini LLM Error: {e}")
        return {"confidence_score": 0}



# ============================================================
# Local deterministic declaration extraction
# ============================================================

def extract_structured_data_local(ocr_text):
    """
    API-independent Legal Metrology field extraction.

    Uses OCR text only. Never invents values.
    Designed as the fallback when Gemini/Groq are unavailable.
    """

    text = str(ocr_text or "")
    lines = [re.sub(r"\s+", " ", x).strip() for x in text.splitlines()]
    lines = [x for x in lines if x]

    result = {
        "product_name": None,
        "mrp": None,
        "unit_sale_price": None,
        "manufacturer": None,
        "address": None,
        "net_quantity": None,
        "manufacturing_date": None,
        "batch_number": None,
        "country_of_origin": None,
        "consumer_care": None,
        "confidence_score": 0,
    }

    def first_match(patterns, source):
        for pattern in patterns:
            match = re.search(pattern, source, re.IGNORECASE)
            if match:
                return match
        return None

    # Normalize common OCR variants without changing actual values.
    normalized = text.replace("???", "Rs ").replace("?", "Rs ")
    normalized = normalized.replace("INR", "Rs ")

    # --------------------------------------------------------
    # MRP / price
    # --------------------------------------------------------
    mrp_patterns = [
        r"\b(?:MRP|M\.R\.P\.|MAXIMUM\s+RETAIL\s+PRICE)\s*[:\-]?\s*(?:RS\.?)?\s*(\d+(?:\.\d{1,2})?)",
        r"\b(?:PRICE)\s*[:\-]?\s*(?:RS\.?)?\s*(\d+(?:\.\d{1,2})?)",
        r"(?:RS\.?)\s*(\d+(?:\.\d{1,2})?)\s*(?:\b(?:INCL|INCLUDING)\b)?",
    ]
    match = first_match(mrp_patterns, normalized)
    if match:
        result["mrp"] = match.group(1).strip()

    # --------------------------------------------------------
    # Net quantity
    # --------------------------------------------------------
    quantity_patterns = [
        r"\b(?:NET\s+(?:QUANTITY|QTY|WEIGHT))\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(ML|L|G|GM|KG|GRAM|GRAMS|LITRE|LITER|LTR)\b",
        r"\b(\d+(?:\.\d+)?)\s*(ML|L|G|GM|KG|GRAM|GRAMS|LITRE|LITER|LTR)\b",
    ]
    match = first_match(quantity_patterns, normalized)
    if match:
        result["net_quantity"] = f"{match.group(1)} {match.group(2)}"

    # --------------------------------------------------------
    # Consumer care
    # --------------------------------------------------------
    care_patterns = [
        r"\b(?:CALL|CONTACT|CUSTOMER\s+CARE|CONSUMER\s+CARE|HELPLINE)\s*(?:US)?\s*[:\-]?\s*((?:\+?91[\s\-]?)?\d[\d\s\-]{7,}\d)",
        r"\b(?:EMAIL|E-MAIL|MAIL)\s*[:\-]?\s*([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})",
        r"\b([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})\b",
        r"\b((?:\+?91[\s\-]?)?\d[\d\s\-]{8,}\d)\b",
    ]
    match = first_match(care_patterns, normalized)
    if match:
        result["consumer_care"] = match.group(1).strip()

    # --------------------------------------------------------
    # Manufacturer / packer / importer / marketed by
    # --------------------------------------------------------
    manufacturer_patterns = [
        r"\b(?:MANUFACTURED\s+BY|MANUFACTURER|PACKED\s+BY|PACKER|MARKETED\s+BY|IMPORTED\s+BY|IMPORTER)\s*[:\-]?\s*(.+)",
    ]
    for line in lines:
        match = first_match(manufacturer_patterns, line)
        if not match and ('BRAND OWNEDBY' in line.upper() or 'BRAND OWNED BY' in line.upper()):
            idx = lines.index(line)
            if idx + 1 < len(lines):
                result['manufacturer'] = lines[idx + 1].strip()
                break
        if match:
            value = match.group(1).strip()
            if value:
                result["manufacturer"] = value
                break

    # --------------------------------------------------------
    # Manufacturing date
    # --------------------------------------------------------
    date_patterns = [
        r"\b(?:MFD|MFG|M\.F\.D\.|MANUFACTURED\s+ON|MANUFACTURING\s+DATE|DATE\s+OF\s+MANUFACTURE)\s*[:\-]?\s*([A-Z0-9\/\-. ]{3,20})",
    ]
    match = first_match(date_patterns, normalized)
    if match:
        result["manufacturing_date"] = match.group(1).strip()

    # --------------------------------------------------------
    # Batch / lot number
    # --------------------------------------------------------
    batch_patterns = [
        r"\b(?:BATCH\s*(?:NO|NUMBER)?|LOT\s*(?:NO|NUMBER))\s*[:#\-]\s*([A-Z0-9][A-Z0-9\/\-.]{2,30})\b",
    ]
    match = first_match(batch_patterns, normalized)
    if match:
        result["batch_number"] = match.group(1).strip()

    # --------------------------------------------------------
    # Country of origin
    # --------------------------------------------------------
    country_patterns = [
        r"\b(?:MADE\s+IN|COUNTRY\s+OF\s+ORIGIN|ORIGIN)\s*[:\-]?\s*([A-Z][A-Z ]{2,30})",
    ]
    match = first_match(country_patterns, normalized)
    if match:
        result["country_of_origin"] = match.group(1).strip()

    # --------------------------------------------------------
    # Address
    # --------------------------------------------------------
    address_keywords = (
        "address", "road", "street", "lane", "nagar", "industrial",
        "estate", "plot", "floor", "pincode", "pin code"
    )

    for line in lines:
        low = line.lower()
        if any(keyword in low for keyword in address_keywords):
            if len(line) >= 10:
                result["address"] = line
                break

    # --------------------------------------------------------
    # Product name
    # --------------------------------------------------------
    excluded = (
        "mrp", "price", "manufacturer", "manufactured", "marketed",
        "imported", "packed", "batch", "lot", "net quantity",
        "customer care", "consumer care", "call us", "email",
        "made in", "country of origin", "address", "best before"
    )

    candidates = []
    for line in lines:
        low = line.lower()

        if len(line) < 3 or len(line) > 80:
            continue
        if any(keyword in low for keyword in excluded):
            continue
        if any(k in low for k in ('road', 'highway', 'mumbai', 'maharashtra', 'pvt ltd', 'private limited', 'recyclable', 'carton', 'scan to', 'for sale in')):
            continue
        if any(k in low for k in ('bar code', 'barcode', 'qr code', 'read first', 'lot no', 'other details', 'visit us', 'write to us', 'how may we', 'fsc')):
            continue
        if "@" in line:
            continue
        if re.search(r"\d{7,}", line):
            continue
        if re.fullmatch(r"[\W\d_]+", line):
            continue

        candidates.append(line)

    if candidates:
        # Prefer a reasonably short, text-heavy line.
        candidates.sort(key=lambda x: (sum(c.isalpha() for c in x), -len(x)), reverse=True)
        result["product_name"] = candidates[0]

    # --------------------------------------------------------
    # Unit sale price
    # --------------------------------------------------------
    unit_patterns = [
        r"\b(?:UNIT\s+SALE\s+PRICE|SALE\s+PRICE)\s*[:\-]?\s*(?:RS\.?)?\s*(\d+(?:\.\d{1,2})?)",
        r"\b(?:RS\.?)\s*(\d+(?:\.\d{1,2})?)\s*(?:PER|\/)\s*(?:KG|G|L|ML)\b",
    ]
    match = first_match(unit_patterns, normalized)
    if match:
        result["unit_sale_price"] = match.group(1).strip()

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------
    detected = sum(
        1 for key, value in result.items()
        if key != "confidence_score" and value
    )

    result["confidence_score"] = min(95, detected * 9)

    return result


# ============================================================
# Zone detection
# ============================================================

def assign_heuristic_zones(extracted_data, image_height):
    """
    Assign useful semantic zones to OCR regions.

    Priority:
    1. Text keywords
    2. Spatial proximity
    3. Bottom panel fallback
    """

    if not extracted_data:
        return extracted_data

    if image_height <= 0:
        image_height = 1

    # --------------------------------------------------------
    # Pass 1 - keyword based zones
    # --------------------------------------------------------

    for item in extracted_data:
        text = str(item.get("text", "")).lower()

        bbox = item.get("bbox", [])

        if not bbox or len(bbox) < 4:
            item["zone"] = "unknown"
            continue

        y_coords = [float(p[1]) for p in bbox]
        center_y = sum(y_coords) / len(y_coords)

        normalized_text = (
            text
            .replace("₹", "rs")
            .replace("â‚¹", "rs")
        )

        # MRP / price
        if (
            "mrp" in normalized_text
            or "m.r.p" in normalized_text
            or "maximum retail price" in normalized_text
            or "price" in normalized_text
            or re.search(r"\brs\.?\b", normalized_text)
            or re.search(r"\binr\b", normalized_text)
        ):
            item["zone"] = "mrp_zone"

        # Consumer care
        elif (
            "consumer care" in normalized_text
            or "customer care" in normalized_text
            or "care" in normalized_text
            or "helpline" in normalized_text
            or "contact" in normalized_text
            or "email" in normalized_text
            or "e-mail" in normalized_text
            or re.search(r"\+?\d[\d\s\-]{6,}", normalized_text)
            or "@" in normalized_text
        ):
            item["zone"] = "consumer_care_zone"

        # Manufacturer
        elif (
            "manufacturer" in normalized_text
            or "manufactured by" in normalized_text
            or "marketed by" in normalized_text
            or "imported by" in normalized_text
            or "importer" in normalized_text
            or "packer" in normalized_text
        ):
            item["zone"] = "manufacturer_zone"

        # Net quantity
        elif (
            "net quantity" in normalized_text
            or "net qty" in normalized_text
            or re.search(
                r"\b\d+(?:\.\d+)?\s*(g|kg|ml|l|ltr|litre|liters|gm|kgs)\b",
                normalized_text
            )
            or "weight" in normalized_text
        ):
            item["zone"] = "net_qty_zone"

        # Bottom panel
        elif center_y > image_height * 0.70:
            item["zone"] = "bottom_panel"

        else:
            item["zone"] = "unknown"

    # --------------------------------------------------------
    # Pass 2 - spatial proximity
    # --------------------------------------------------------

    known_items = [
        item for item in extracted_data
        if item.get("zone") in {
            "mrp_zone",
            "consumer_care_zone",
            "manufacturer_zone",
            "net_qty_zone"
        }
    ]

    max_distance = image_height * 0.15

    for unknown_item in extracted_data:

        if unknown_item.get("zone") != "unknown":
            continue

        bbox = unknown_item.get("bbox", [])

        if not bbox or len(bbox) < 4:
            continue

        unk_x = sum(float(p[0]) for p in bbox) / len(bbox)
        unk_y = sum(float(p[1]) for p in bbox) / len(bbox)

        best_distance = float("inf")
        best_zone = None

        for known_item in known_items:

            known_bbox = known_item.get("bbox", [])

            if not known_bbox or len(known_bbox) < 4:
                continue

            known_x = (
                sum(float(p[0]) for p in known_bbox)
                / len(known_bbox)
            )

            known_y = (
                sum(float(p[1]) for p in known_bbox)
                / len(known_bbox)
            )

            distance = (
                (unk_x - known_x) ** 2
                + (unk_y - known_y) ** 2
            ) ** 0.5

            if (
                distance < best_distance
                and distance <= max_distance
            ):
                best_distance = distance
                best_zone = known_item.get("zone")

        if best_zone:
            unknown_item["zone"] = best_zone

    return extracted_data


# ============================================================
# Credit-card reference detection
# ============================================================

def detect_credit_card_reference(image_path):
    """
    Attempts to detect a standard ISO/IEC 7810 ID-1 card
    reference for pixels-per-mm calibration.

    Standard card size:
    85.6 mm x 53.98 mm
    """

    img = cv2.imread(image_path)

    if img is None:
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    blurred = cv2.GaussianBlur(
        gray,
        (5, 5),
        0
    )

    edges = cv2.Canny(
        blurred,
        50,
        150
    )

    contours, _ = cv2.findContours(
        edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    target_ratio = 85.6 / 53.98
    tolerance = 0.20

    for cnt in contours:

        if cv2.contourArea(cnt) < 2000:
            continue

        x, y, w, h = cv2.boundingRect(cnt)

        if min(w, h) <= 0:
            continue

        ratio = max(w, h) / min(w, h)

        if abs(ratio - target_ratio) <= tolerance:

            long_side_pixels = max(w, h)

            pixels_per_mm = (
                long_side_pixels / 85.6
            )

            return pixels_per_mm

    return None


# ============================================================
# OCR line grouping
# ============================================================

def build_full_text(extracted_data):
    """
    Converts spatial OCR results into readable line-based text.
    """

    if not extracted_data:
        return ""

    sorted_data = sorted(
        extracted_data,
        key=lambda item: (
            sum(float(p[1]) for p in item["bbox"])
            / len(item["bbox"])
        )
    )

    lines = []
    current_line = []
    last_y = None

    for item in sorted_data:

        bbox = item.get("bbox", [])

        if not bbox:
            continue

        y_center = (
            sum(float(p[1]) for p in bbox)
            / len(bbox)
        )

        if (
            last_y is not None
            and abs(y_center - last_y) < 15
        ):
            current_line.append(item)

        else:
            if current_line:

                current_line.sort(
                    key=lambda i: (
                        sum(float(p[0]) for p in i["bbox"])
                        / len(i["bbox"])
                    )
                )

                lines.append(
                    " ".join(
                        str(i["text"])
                        for i in current_line
                    )
                )

            current_line = [item]
            last_y = y_center

    if current_line:

        current_line.sort(
            key=lambda i: (
                sum(float(p[0]) for p in i["bbox"])
                / len(i["bbox"])
            )
        )

        lines.append(
            " ".join(
                str(i["text"])
                for i in current_line
            )
        )

    return "\n".join(lines)


# ============================================================
# Main image pipeline
# ============================================================

def process_image_pipeline(image_paths):
    """
    Complete extraction pipeline.

    Gemini Vision:
        Structured semantic extraction.

    PaddleOCR:
        Real OCR text + real bounding boxes + zones.

    Gemini OCR LLM:
        Structured extraction from PaddleOCR text.

    This avoids the previous fake 100x100 Gemini bounding box.
    """

    if not image_paths:
        return {
            "calibrated_pixels_per_mm": None,
            "extracted_data": [],
            "full_text": "",
            "llm_extracted_data": {
                "confidence_score": 0
            }
        }

    # --------------------------------------------------------
    # 1. Gemini Vision
    # --------------------------------------------------------

    try:
        if os.getenv("GEMINI_VISION_DISABLED", "").lower() in ("1", "true", "yes"):
            print("Gemini Vision disabled; using PaddleOCR/local extraction.")
            gemini_data = {}
        else:
            gemini_data = extract_structured_data_gemini_vision(
                image_paths
            )
    except Exception as e:
        print(f"Gemini Vision failed, continuing with PaddleOCR: {e}")
        gemini_data = {}

    if gemini_data:
        print(
            "Gemini Vision structured extraction completed."
        )

    else:
        print(
            "Gemini Vision unavailable or failed."
        )

    # --------------------------------------------------------
    # 2. PaddleOCR - ALWAYS run for spatial evidence
    # --------------------------------------------------------

    print(
        "Running PaddleOCR for spatial text evidence..."
    )

    first_img = cv2.imread(image_paths[0])

    image_height = 0
    image_width = 0

    if first_img is not None:
        image_height, image_width = first_img.shape[:2]

    all_raw_data = []

    for path in image_paths:

        img = cv2.imread(path)

        current_height = 0

        if img is not None:
            current_height = img.shape[0]

        extracted = extract_text(path)

        if extracted:
            assign_heuristic_zones(
                extracted,
                current_height
            )

            all_raw_data.extend(extracted)

    # --------------------------------------------------------
    # 3. Fallback if PaddleOCR failed
    # --------------------------------------------------------

    if not all_raw_data and gemini_data:

        raw_text = gemini_data.get(
            "raw_text_detected",
            ""
        )

        if raw_text:

            print(
                "PaddleOCR returned no text. "
                "Using Gemini text as fallback evidence."
            )

            all_raw_data = [{
                "text": raw_text,
                "bbox": [
                    [0, 0],
                    [image_width or 100, 0],
                    [image_width or 100, image_height or 100],
                    [0, image_height or 100]
                ],
                "confidence": (
                    _safe_float(
                        gemini_data.get(
                            "confidence_score",
                            0
                        )
                    ) / 100.0
                ),
                "zone": "unknown"
            }]

    # --------------------------------------------------------
    # 4. Re-apply zones after collecting all OCR
    # --------------------------------------------------------

    if all_raw_data:
        assign_heuristic_zones(
            all_raw_data,
            image_height
        )

    # --------------------------------------------------------
    # 5. Physical font-size calibration
    # --------------------------------------------------------

    pixels_per_mm = detect_credit_card_reference(
        image_paths[0]
    )

    if pixels_per_mm:

        for item in all_raw_data:

            bbox = item.get("bbox", [])

            if not bbox or len(bbox) < 4:
                continue

            y_coords = [
                float(p[1])
                for p in bbox
            ]

            pixel_height = (
                max(y_coords)
                - min(y_coords)
            )

            item["physical_height_mm"] = float(
                pixel_height / pixels_per_mm
            )

    # --------------------------------------------------------
    # 6. Full OCR text
    # --------------------------------------------------------

    full_text = build_full_text(
        all_raw_data
    )

    # If OCR text is empty, use Gemini raw text.
    if (
        not full_text.strip()
        and gemini_data
    ):
        full_text = gemini_data.get(
            "raw_text_detected",
            ""
        )

    # --------------------------------------------------------
    # 7. Structured extraction from OCR
    # --------------------------------------------------------

    ocr_llm_data = gemini_data if isinstance(gemini_data, dict) else {}

    # API-independent fallback: deterministic local extraction.
    if not isinstance(ocr_llm_data, dict) or not any(
        ocr_llm_data.get(key)
        for key in (
            "mrp",
            "net_quantity",
            "manufacturer",
            "consumer_care",
            "manufacturing_date",
            "batch_number",
            "country_of_origin",
        )
    ):
        ocr_llm_data = extract_structured_data_local(full_text)

    # 8. Merge Gemini Vision + OCR LLM
    # --------------------------------------------------------

    merged_data = {}

    if isinstance(gemini_data, dict):
        merged_data.update(gemini_data)

    if isinstance(ocr_llm_data, dict):

        for key, value in ocr_llm_data.items():

            # OCR LLM only fills missing values.
            if (
                value is not None
                and value != ""
            ):
                if (
                    key not in merged_data
                    or merged_data.get(key) in (
                        None,
                        "",
                        "null"
                    )
                ):
                    merged_data[key] = value

    if not merged_data:
        merged_data = {
            "confidence_score": 0
        }

    # Keep raw text authoritative from actual OCR
    # whenever OCR successfully produced text.
    if full_text.strip():
        merged_data["raw_text_detected"] = full_text

    # --------------------------------------------------------
    # 9. Normalize confidence
    # --------------------------------------------------------

    confidence = merged_data.get(
        "confidence_score",
        0
    )

    try:
        confidence = int(
            max(
                0,
                min(
                    100,
                    float(confidence)
                )
            )
        )
    except (TypeError, ValueError):
        confidence = 0

    merged_data["confidence_score"] = confidence

    # --------------------------------------------------------
    # 10. Return pipeline
    # --------------------------------------------------------

    return {
        "calibrated_pixels_per_mm": (
            float(pixels_per_mm)
            if pixels_per_mm
            else None
        ),
        "extracted_data": all_raw_data,
        "full_text": full_text,
        "llm_extracted_data": merged_data
    }










