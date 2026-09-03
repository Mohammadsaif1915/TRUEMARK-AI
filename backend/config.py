import os

class Settings:
    ocr_languages = os.getenv("OCR_LANGUAGES", "en")
    ocr_min_confidence = float(os.getenv("OCR_MIN_CONFIDENCE", "0.20"))
    ocr_provider = os.getenv("OCR_PROVIDER", "paddleocr")

settings = Settings()
