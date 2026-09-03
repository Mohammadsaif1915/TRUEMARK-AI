import React, { useState, useRef, useEffect } from 'react';
import { FiUpload, FiX, FiCamera, FiMapPin, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../utils/api';

const CitizenReport = () => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [gtin, setGtin] = useState('');
  const [location, setLocation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
          toast.warning("Could not automatically determine location. This helps inspectors find the product.");
        }
      );
    }
  }, []);

  const handleFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    const newFiles = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
    
    if (newFiles.length + files.length > 5) {
      toast.error('Maximum 5 images allowed per report');
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Please add at least one image of the product label');
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    
    if (gtin) formData.append('gtin', gtin);
    
    if (location) {
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
    }

    setUploading(true);
    try {
      const response = await api.post('/scan/public-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess(true);
      toast.success(response.data.message || 'Report submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <FiCheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You for Your Report</h1>
        <p className="text-gray-600 text-lg mb-8">
          Your submission has been securely sent to our Legal Metrology inspectors. 
          Crowdsourced leads like yours help ensure market compliance and consumer protection.
        </p>
        <button
          onClick={() => { setSuccess(false); setFiles([]); setPreviews([]); setGtin(''); }}
          className="bg-primary-800 text-white px-8 py-3 rounded-full font-medium hover:bg-primary-900 transition-colors"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Report a Product Violation</h1>
        <p className="text-gray-600">
          Upload clear photos of the product label (showing MRP, net quantity, manufacturer details) to report suspected non-compliance.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-soft p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Product Images <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              
              {previews.length < 5 && (
                <div className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors gap-2">
                  <button 
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-primary-800 hover:text-primary-900 flex flex-col items-center p-2"
                  >
                    <FiCamera size={24} className="mb-1" />
                    <span className="text-xs font-medium">Camera</span>
                  </button>
                  <div className="w-8 border-t border-gray-300"></div>
                  <button 
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-gray-600 hover:text-gray-800 flex flex-col items-center p-2"
                  >
                    <FiUpload size={20} className="mb-1" />
                    <span className="text-xs font-medium">Gallery</span>
                  </button>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              className="hidden"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p className="text-xs text-gray-500">Capture the full label, clearly showing text. Max 5 images.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Barcode / GTIN (Optional)
            </label>
            <input
              type="text"
              value={gtin}
              onChange={(e) => setGtin(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-800 focus:border-transparent outline-none transition-all"
              placeholder="e.g., 8901234567890"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <FiMapPin className="text-blue-600 mt-1 flex-shrink-0" size={20} />
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Location Data</h4>
              <p className="text-blue-700 text-xs mt-1">
                {location 
                  ? "Your current location will be attached to help inspectors locate the product." 
                  : "We couldn't get your location automatically. It helps if you enable location services."}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-soft flex justify-center items-center gap-2 transition-all ${
              uploading || files.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-800 hover:bg-primary-900 hover:shadow-lg'
            }`}
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing Report...
              </>
            ) : (
              <>
                <FiUpload />
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CitizenReport;
