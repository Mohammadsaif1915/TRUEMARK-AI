import os
import json
from groq import Groq

def check_translation_consistency(text):
    """
    Evaluates if the Hindi (Devanagari) and English text on the packaging say the same thing.
    Returns a dictionary with status and mismatches.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        print("WARNING: GROQ_API_KEY not found or not set. Skipping translation check.")
        return {"status": "skipped", "mismatches": []}

    try:
        client = Groq(api_key=api_key)
        
        system_prompt = """
You are an expert bilingual auditor proficient in English and Hindi (Devanagari script).
Your task is to analyze product packaging text to verify Rule 8 compliance (Bilingual/Script Compliance & Mistranslation Detector).

1. Determine if the text contains BOTH English and Hindi declarations for key fields (Product Name, MRP, Net Quantity, Manufacturer Name).
2. If both languages are NOT present, respond with status "not_bilingual".
3. If both are present, CROSS-CHECK that the Hindi text is an accurate translation/representation of the English text. Look out for garbled transliterations or mismatched facts (e.g., MRP figure is 50 in English but 60 in Hindi, or the net quantity differs).
4. If they match, respond with status "match".
5. If there are discrepancies, respond with status "mismatch" and list the specific mismatches.

Return ONLY valid JSON matching this schema exactly, with no markdown formatting or extra text:
{
  "status": "match" | "mismatch" | "not_bilingual",
  "mismatches": ["description of mismatch 1", "description of mismatch 2"]
}
"""

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"Packaging Text:\n{text}"
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=300,
            response_format={"type": "json_object"}
        )

        response_text = chat_completion.choices[0].message.content.strip()
        result = json.loads(response_text)
        
        # Ensure fallback defaults if LLM hallucinated keys
        return {
            "status": result.get("status", "not_bilingual"),
            "mismatches": result.get("mismatches", [])
        }

    except Exception as e:
        print(f"Groq Translation Check Error: {e}")
        return {"status": "error", "mismatches": []}
