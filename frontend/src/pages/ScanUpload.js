import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiLink, FiCamera, FiMapPin } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../utils/api';

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh',
  'Puducherry', 'Andaman & Nicobar', 'Dadra & Nagar Haveli', 'Lakshadweep',
];

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;
    let mounted = true;

    const startScanning = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        html5QrCode = new Html5Qrcode('barcode-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.5 },
          (decodedText) => {
            if (mounted) {
              onScan(decodedText);
              html5QrCode.stop().catch(() => {});
            }
          },
          () => {}
        );
      } catch (err) {
        if (mounted) {
          toast.error('Camera access denied or not available');
          onClose();
        }
      }
    };

    startScanning();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 flex items-center space-x-2">
            <FiCamera className="h-5 w-5 text-primary-800" />
            <span>Scan Barcode / QR Code</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close scanner">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <div id="barcode-reader" className="w-full rounded-xl overflow-hidden" />
          <p className="text-xs text-gray-500 text-center mt-3">Point your camera at a barcode or QR code on the product label.</p>
        </div>
      </div>
    </div>
  );
};

const ScanUpload = () => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [listingUrl, setListingUrl] = useState('');
  const [gtin, setGtin] = useState('');
  const [state, setState] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    const newFiles = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
    if (newFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleBarcodeScan = (decodedText) => {
    setGtin(decodedText);
    setShowScanner(false);
    toast.success(`Barcode detected: ${decodedText}`);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one label image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => {
        formData.append('images', f);
      });
      if (listingUrl) formData.append('listing_url', listingUrl);
      if (gtin) formData.append('gtin', gtin);
      if (state) formData.append('state', state);

      const response = await api.post('/scan/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Scan completed successfully!');
      const scanId = response.data.scan?.id || response.data.scan_id;
      if (scanId) {
        navigate(`/scan/${scanId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Product Scan</h1>
        <p className="text-gray-600 mt-1">Upload a product label image for AI compliance verification.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold mb-2">Upload Label Image</h2>
        <p className="text-gray-600 mb-6">Capture the product label clearly, including MRP, manufacturer details, and quantity.</p>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
            >
              <FiCamera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-md font-medium text-gray-900">Take Photo</p>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
            >
              <FiUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-md font-medium text-gray-900">Upload Files</p>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {previews.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Images ({previews.length})</h3>
              <div className="flex space-x-4 overflow-x-auto pb-4 snap-x">
                {previews.map((preview, index) => (
                  <div key={index} className="relative flex-none snap-start">
                    <img src={preview} alt={`Preview ${index}`} className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
                    <button
                      onClick={() => removeFile(index)}
                      aria-label="Remove image"
                      className="absolute top-1 right-1 bg-white hover:bg-red-50 rounded-full p-1.5 shadow-md text-red-500"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-Commerce Listing URL (Optional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLink className="text-gray-400" />
              </div>
              <input
                type="url"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="https://amazon.in/dp/..."
                className="pl-10 w-full rounded-lg border-gray-300 border p-3 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GTIN / Barcode</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={gtin}
                  onChange={(e) => setGtin(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="flex-1 rounded-lg border-gray-300 border p-3 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-3 bg-primary-100 text-primary-800 rounded-lg hover:bg-primary-200 transition-colors flex items-center space-x-1.5 flex-shrink-0"
                  title="Scan barcode with camera"
                >
                  <FiCamera className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">Scan</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline h-3.5 w-3.5 mr-1" />
                State / UT (Optional)
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border-gray-300 border p-3 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">Select state...</option>
                {INDIA_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full flex justify-center items-center py-4 bg-primary-800 hover:bg-primary-900 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {uploading ? 'Analyzing and Verifying...' : 'Submit for AI Verification'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanUpload;
