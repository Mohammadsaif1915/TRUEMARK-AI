import os
import cloudinary
import cloudinary.uploader

# Configure Cloudinary globally (using env variables automatically if CLOUDINARY_URL is present, 
# or explicitly passing them below)
def init_cloudinary():
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    if not cloud_name or cloud_name == "your-cloud-name":
        return False

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
        secure=True
    )
    return True

def upload_to_cloudinary(file_path):
    """
    Uploads a local file to Cloudinary and returns the secure URL.
    """
    if not init_cloudinary():
        print("WARNING: Cloudinary is not configured. Skipping upload.")
        return None

    try:
        # Upload the image and let Cloudinary assign a random public ID
        upload_result = cloudinary.uploader.upload(file_path, folder="meterolens_evidence")
        
        # Return the secure HTTPS URL provided by Cloudinary
        secure_url = upload_result.get("secure_url")
        return secure_url

    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        return None
