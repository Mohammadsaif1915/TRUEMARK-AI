import os
from groq import Groq

def evaluate_rule(prompt, text):
    """
    Evaluates a semantic compliance rule against the extracted text using Groq.
    Returns "PASS", "FAIL", or "REVIEW".
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        print("WARNING: GROQ_API_KEY not found or not set. Falling back to REVIEW.")
        return "human_review_required"

    try:
        client = Groq(api_key=api_key)
        
        system_prompt = f"""
        You are a strict Legal Metrology compliance auditor. 
        Your job is to evaluate if the provided packaging text complies with the following rule.
        
        RULE TO EVALUATE:
        {prompt}
        
        You must respond with EXACTLY one word: PASS or FAIL.
        Do not explain your reasoning. Just PASS or FAIL.
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
            model="llama3-8b-8192",
            temperature=0,
            max_tokens=10,
        )

        result = chat_completion.choices[0].message.content.strip().upper()
        if "PASS" in result:
            return "pass"
        elif "FAIL" in result:
            return "fail"
        else:
            return "human_review_required"

    except Exception as e:
        print(f"Groq Evaluation Error: {e}")
        return "human_review_required"
