import re
import cv2
import numpy as np
import os
import json
import google.generativeai as genai

def _get_reader():
    pass

def preprocess_image_for_ocr(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return image_path
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    denoised = cv2.fastNlMeansDenoising(enhanced, None, h=10, searchWindowSize=21, templateWindowSize=7)
    
    import tempfile
    fd, temp_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    cv2.imwrite(temp_path, denoised)
    return temp_path

def extract_structured_data_gemini_vision(image_paths):
    """
    Primary Multimodal extraction. Feeds all images directly to Gemini Flash.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY not found. Skipping Gemini Vision.")
        return None
        
    genai.configure(api_key=api_key)
    
    prompt = """
You are a compliance extraction AI. Given this product packaging image, extract the required compliance fields.
If a field is not found, leave it as null.
Also, accurately transcribe ALL text you see on the packaging into the 'raw_text_detected' field so we can run compliance regex checks on it.
Provide a 'confidence_score' from 0 to 100 representing how confident you are in the extracted values.

Return ONLY valid JSON matching this schema, without any markdown formatting:
{
  "raw_text_detected": "string containing all visible text",
  "product_name": "string or null",
  "mrp": "string or null",
  "unit_sale_price": "string or null",
  "manufacturer": "string or null",
  "address": "string or null",
  "net_quantity": "string or null",
  "manufacturing_date": "string or null",
  "batch_number": "string or null",
  "confidence_score": integer
}
"""
    try:
        import PIL.Image
        imgs = [PIL.Image.open(p) for p in image_paths]
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content([prompt] + imgs)
        except Exception as e:
            raise e
                
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini Vision Error: {e}")
        return None

def extract_text(image_path):
    temp_path = None
    try:
        temp_path = preprocess_image_for_ocr(image_path)
        
        if not hasattr(np, 'long'):
            np.long = np.int64
        if not hasattr(np, 'ulong'):
            np.ulong = np.uint64
            
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_textline_orientation=True, lang='devanagari')
        result = ocr.ocr(temp_path)
        extracted = []
        
        if result and result[0]:
            for line in result[0]:
                bbox = line[0]
                text_info = line[1]
                word_text = text_info[0]
                prob = text_info[1]
                
                extracted.append({
                    "text": word_text,
                    "bbox": bbox,
                    "confidence": float(prob),
                    "zone": "unknown"
                })
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

def extract_structured_data_llm(ocr_text):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"confidence_score": 0}
        
    genai.configure(api_key=api_key)
    
    prompt = f"""
You are a compliance extraction AI. Given the following raw OCR text from a product packaging, extract the required compliance fields.
If a field is not found, leave it as null.
Provide a 'confidence_score' from 0 to 100.

Raw OCR Text:
{ocr_text}

Return ONLY valid JSON matching this schema, without any markdown formatting:
{{
  "product_name": "string or null",
  "mrp": "string or null",
  "unit_sale_price": "string or null",
  "manufacturer": "string or null",
  "address": "string or null",
  "net_quantity": "string or null",
  "manufacturing_date": "string or null",
  "batch_number": "string or null",
  "confidence_score": integer
}}
"""
    try:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
        except Exception as e:
            raise e
                
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini LLM Error: {e}")
        return {"confidence_score": 0}

def assign_heuristic_zones(extracted_data, image_height):
    # Pass 1: Text-based heuristics
    for item in extracted_data:
        text = item["text"].lower()
        y_coords = [p[1] for p in item["bbox"]]
        center_y = sum(y_coords) / len(y_coords)

        if "mrp" in text or "₹" in text or "rs" in text or "price" in text:
            item["zone"] = "mrp_zone"
        elif "care" in text or "helpline" in text or "email" in text or "contact" in text:
            item["zone"] = "consumer_care_zone"
        elif "mfg" in text or "manufactured" in text or "marketed" in text:
            item["zone"] = "manufacturer_zone"
        elif "net" in text or "qty" in text or "weight" in text:
            item["zone"] = "net_qty_zone"
        elif center_y > image_height * 0.7:
             if item.get("zone", "unknown") == "unknown":
                 item["zone"] = "bottom_panel"

    # Pass 2: Spatial proximity assignment
    for unknown_item in [item for item in extracted_data if item.get("zone", "unknown") == "unknown"]:
        unk_y_coords = [p[1] for p in unknown_item["bbox"]]
        unk_x_coords = [p[0] for p in unknown_item["bbox"]]
        unk_center_y = sum(unk_y_coords) / len(unk_y_coords)
        unk_center_x = sum(unk_x_coords) / len(unk_x_coords)
        
        best_dist = float('inf')
        best_zone = "unknown"
        
        # Find the closest known zone
        for known_item in [item for item in extracted_data if item.get("zone", "unknown") not in ("unknown", "bottom_panel")]:
            k_y_coords = [p[1] for p in known_item["bbox"]]
            k_x_coords = [p[0] for p in known_item["bbox"]]
            k_center_y = sum(k_y_coords) / len(k_y_coords)
            k_center_x = sum(k_x_coords) / len(k_x_coords)
            
            # Simple Euclidean distance
            dist = ((unk_center_x - k_center_x) ** 2 + (unk_center_y - k_center_y) ** 2) ** 0.5
            
            # If distance is small enough (e.g., less than 15% of image height), merge it
            if dist < best_dist and dist < (image_height * 0.15):
                best_dist = dist
                best_zone = known_item["zone"]
                
        if best_zone != "unknown":
            unknown_item["zone"] = best_zone

    return extracted_data

def detect_credit_card_reference(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return None
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    target_ratio = 1.586
    tolerance = 0.20
    
    for cnt in contours:
        if cv2.contourArea(cnt) < 2000:
            continue
            
        x, y, w, h = cv2.boundingRect(cnt)
        ratio = max(w, h) / min(w, h)
        
        if abs(ratio - target_ratio) <= tolerance:
            if w > h:
                pixels_per_mm = w / 85.6
            else:
                pixels_per_mm = h / 85.6
            return pixels_per_mm
            
    return None

def process_image_pipeline(image_paths):
    # Try Gemini Vision First
    llm_data = extract_structured_data_gemini_vision(image_paths)
    
    if llm_data and "raw_text_detected" in llm_data:
        print("Successfully extracted using Gemini Vision!")
        zoned_data = [{
            "text": llm_data["raw_text_detected"],
            "bbox": [[0,0],[100,0],[100,100],[0,100]],
            "confidence": 1.0,
            "zone": "any"
        }]
        return {
            "calibrated_pixels_per_mm": None,
            "extracted_data": zoned_data,
            "full_text": llm_data["raw_text_detected"],
            "llm_extracted_data": llm_data
        }
        
    print("Falling back to PaddleOCR pipeline...")
    img = cv2.imread(image_paths[0])
    height, width = (0, 0)
    if img is not None:
        height, width, _ = img.shape
        
    all_raw_data = []
    for path in image_paths:
        all_raw_data.extend(extract_text(path))
        
    zoned_data = assign_heuristic_zones(all_raw_data, height)
    pixels_per_mm = detect_credit_card_reference(image_paths[0])
    
    if pixels_per_mm:
        for item in zoned_data:
            y_coords = [p[1] for p in item["bbox"]]
            pixel_height = max(y_coords) - min(y_coords)
            item["physical_height_mm"] = float(pixel_height / pixels_per_mm)
            
    sorted_data = sorted(zoned_data, key=lambda item: sum(p[1] for p in item["bbox"])/4.0)
    lines = []
    current_line = []
    last_y = -1
    
    for item in sorted_data:
        y_center = sum(p[1] for p in item["bbox"])/4.0
        if last_y != -1 and abs(y_center - last_y) < 15:
            current_line.append(item)
        else:
            if current_line:
                current_line.sort(key=lambda i: sum(p[0] for p in i["bbox"])/4.0)
                lines.append(" ".join(i["text"] for i in current_line))
            current_line = [item]
            last_y = y_center
            
    if current_line:
        current_line.sort(key=lambda i: sum(p[0] for p in i["bbox"])/4.0)
        lines.append(" ".join(i["text"] for i in current_line))
        
    full_text = "\n".join(lines)
    llm_extracted_data = extract_structured_data_llm(full_text)
    
    return {
        "calibrated_pixels_per_mm": float(pixels_per_mm) if pixels_per_mm else None,
        "extracted_data": zoned_data,
        "full_text": full_text,
        "llm_extracted_data": llm_extracted_data
    }
