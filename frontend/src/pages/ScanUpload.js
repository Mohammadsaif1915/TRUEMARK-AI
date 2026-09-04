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
              html5QrCode.stop().catch(() => { });
            }
          },
          () => { }
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
        scannerRef.current.stop().catch(() => { });
        scannerRef.current.clear().catch(() => { });
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="tm-anim-backdrop fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="tm-anim-modal bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <FiCamera className="h-5 w-5 text-indigo-600" />
            <span>Scan Barcode / QR Code</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Close scanner"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative w-full rounded-xl overflow-hidden bg-slate-900">
            <div id="barcode-reader" className="w-full" />
            <div
              className="tm-scan-line pointer-events-none absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
              style={{ boxShadow: '0 0 8px 2px rgba(99,102,241,0.6)' }}
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-slate-500 text-center mt-3">Point your camera at a barcode or QR code on the product label.</p>
        </div>
      </div>
    </div>
  );
};

const PhotoCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser. Use Upload Files instead.');
      return () => { active = false; };
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (!active) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Camera access was denied or is unavailable. Use Upload Files instead.'));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="tm-anim-backdrop fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
      <div className="tm-anim-modal bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><FiCamera className="h-5 w-5 text-indigo-600" />Take product photo</h3>
          <button onClick={onClose} aria-label="Close camera" className="p-2 text-slate-400 hover:text-slate-700"><FiX /></button>
        </div>
        <div className="p-4">
          {error ? <p className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg">{error}</p> : <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover rounded-xl bg-slate-900" />}
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg">Cancel</button>
            {!error && <button onClick={capture} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg"><FiCamera className="inline mr-2" />Capture photo</button>}
          </div>
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
  const [city, setCity] = useState('');
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Requesting device location...');
  const [showCamera, setShowCamera] = useState(false);
  const [urlData, setUrlData] = useState(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const galleryInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Device location is not supported by this browser.');
      return undefined;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus('Device location captured. City will be resolved during upload.');
      },
      () => setLocationStatus('Location permission was not granted. The inspection can still be uploaded.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
    return undefined;
  }, []);

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

  const handleCameraCapture = (file) => {
    handleFiles([file]);
    setShowCamera(false);
  };

  const fetchProductUrl = async () => {
    if (!listingUrl) return;
    setFetchingUrl(true);
    try {
      const response = await api.post('/scan/fetch-url', { url: listingUrl });
      setUrlData(response.data.product || null);
      toast.success('Product details fetched');
    } catch (err) {
      setUrlData(null);
      toast.error(err.response?.data?.error || 'Could not fetch product details');
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
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
      if (city) formData.append('city', city);
      if (deviceLocation) {
        formData.append('latitude', deviceLocation.latitude);
        formData.append('longitude', deviceLocation.longitude);
      }

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
    <div className="min-h-screen bg-[#FAF9FF]">
      <style>{`
        @keyframes tmFadeScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tmScanSweep {
          0% { top: 8%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 92%; opacity: 1; }
          90% { opacity: 1; }
          100% { top: 8%; opacity: 0; }
        }
        @keyframes tmShimmerSweep {
          0% { left: -150%; }
          100% { left: 150%; }
        }
        .tm-anim-pop { animation: tmFadeScaleIn 300ms cubic-bezier(0.16,1,0.3,1) both; }
        .tm-anim-backdrop { animation: tmFadeIn 200ms ease-out both; }
        .tm-anim-modal { animation: tmFadeScaleIn 280ms cubic-bezier(0.16,1,0.3,1) both; }
        .tm-scan-line { animation: tmScanSweep 2.2s ease-in-out infinite; }
        .tm-shimmer { position: relative; overflow: hidden; }
        .tm-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -150%;
          height: 100%; width: 150%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: tmShimmerSweep 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tm-anim-pop, .tm-anim-backdrop, .tm-anim-modal, .tm-scan-line, .tm-shimmer::after {
            animation: none !important;
          }
        }
      `}</style>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
      {showCamera && <PhotoCamera onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-start gap-3">
          <span className="mt-1.5 h-8 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" aria-hidden="true"></span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Product Scan</h1>
            <p className="text-slate-500 mt-1">Upload a product label image for AI compliance verification.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Upload Label Image</h2>
          <p className="text-slate-500 mb-6">Capture the product label clearly, including MRP, manufacturer details, and quantity.</p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setShowCamera(true)}
                className="group border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all duration-200"
              >
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <FiCamera className="h-6 w-6" />
                </div>
                <p className="text-md font-medium text-slate-900">Take Photo</p>
              </div>
              <div
                onClick={() => galleryInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragging
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40'
                  }`}
              >
                <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}>
                  <FiUpload className="h-6 w-6" />
                </div>
                <p className="text-md font-medium text-slate-900">
                  {isDragging ? 'Drop to upload' : 'Upload Files'}
                </p>
                <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
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
                <h3 className="text-sm font-medium text-slate-700 mb-3">Selected Images ({previews.length})</h3>
                <div className="flex space-x-4 overflow-x-auto pb-4 snap-x">
                  {previews.map((preview, index) => (
                    <div key={index} className="tm-anim-pop relative flex-none snap-start">
                      <img src={preview} alt={`Preview ${index}`} className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
                      <button
                        onClick={() => removeFile(index)}
                        aria-label="Remove image"
                        className="absolute top-1 right-1 bg-white hover:bg-rose-50 rounded-full p-1.5 shadow-md text-rose-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">E-Commerce Listing URL (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLink className="text-slate-400" />
                </div>
                <input
                  type="url"
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                  placeholder="https://amazon.in/dp/..."
                  className="pl-10 w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-shadow"
                />
                <button type="button" onClick={fetchProductUrl} disabled={!listingUrl || fetchingUrl} className="mt-2 px-3 py-2 text-sm font-semibold text-indigo-700 border border-indigo-200 rounded-lg disabled:opacity-50">{fetchingUrl ? 'Fetching...' : 'Fetch product details'}</button>
              </div>
              {urlData && <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm text-slate-700">{Object.entries(urlData).map(([key, value]) => <div key={key} className="flex justify-between gap-3"><span className="capitalize text-slate-500">{key.replace(/_/g, ' ')}</span><span className="font-medium">{value || 'Not found'}</span></div>)}</div>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">GTIN / Barcode</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={gtin}
                    onChange={(e) => setGtin(e.target.value)}
                    placeholder="e.g. 8901234567890"
                    className="flex-1 rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-1.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    title="Scan barcode with camera"
                  >
                    <FiCamera className="h-4 w-4" />
                    <span className="text-sm font-medium hidden sm:inline">Scan</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City (Optional)</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-shadow" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiMapPin className="inline h-3.5 w-3.5 mr-1" />
                  State / UT (Optional)
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-shadow bg-white"
                >
                  <option value="">Select state...</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              <FiMapPin className="h-5 w-5 mt-0.5 shrink-0" />
              <div><p className="font-semibold">Inspector device location</p><p className="mt-0.5">{locationStatus}</p>{deviceLocation && <p className="font-data text-xs mt-1">{deviceLocation.latitude.toFixed(6)}, {deviceLocation.longitude.toFixed(6)}</p>}</div>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className={`w-full flex justify-center items-center py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${uploading ? 'tm-shimmer' : ''}`}
            >
              {uploading ? 'Analyzing and Verifying...' : 'Submit for AI Verification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanUpload;