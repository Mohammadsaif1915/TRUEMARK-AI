import re

def parse_ecommerce_url(url):
    """
    Dummy/Mock scraper for MVP. In reality, this would use BeautifulSoup or similar
    to extract listing details (e.g. from Amazon/Flipkart).
    For the hackathon, we simulate fetching data based on predefined test URLs.
    """
    if "example.com/product/123" in url:
        return {
            "mrp": "Rs. 299",
            "net_quantity": "500g",
            "country_of_origin": "China",
            "manufacturer": "Acme Corp"
        }
    elif "example.com/product/compliant" in url:
        return {
            "mrp": "Rs. 50.00",
            "net_quantity": "100g",
            "country_of_origin": "India",
            "manufacturer": "Desi Naturals"
        }
    return None

def cross_check(listing_url, extracted_fields):
    """
    Compares scraped listing data against physical OCR facts.
    """
    if not listing_url:
        return {"status": "skipped", "message": "No listing URL provided."}
        
    listing_data = parse_ecommerce_url(listing_url)
    if not listing_data:
        return {"status": "error", "message": "Failed to scrape listing URL."}
        
    mismatches = []
    
    # Check MRP
    physical_mrp = extracted_fields.get("mrp")
    if physical_mrp and listing_data.get("mrp"):
        # Simple number extraction for comparison
        phys_val = re.sub(r'[^\d.]', '', physical_mrp)
        list_val = re.sub(r'[^\d.]', '', listing_data["mrp"])
        if phys_val and list_val and float(phys_val) != float(list_val):
            mismatches.append(f"MRP Mismatch: Physical is {physical_mrp}, Listing says {listing_data['mrp']}")
            
    # Check Country of Origin
    physical_origin = extracted_fields.get("country_of_origin")
    if physical_origin and listing_data.get("country_of_origin"):
        if physical_origin.lower().strip() != listing_data["country_of_origin"].lower().strip():
            mismatches.append(f"Origin Mismatch: Physical is {physical_origin}, Listing says {listing_data['country_of_origin']}")

    if mismatches:
        return {
            "status": "mismatch_found",
            "mismatches": mismatches,
            "listing_data": listing_data
        }
        
    return {
        "status": "match",
        "mismatches": [],
        "listing_data": listing_data
    }
