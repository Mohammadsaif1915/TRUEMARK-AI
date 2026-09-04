import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUpload, FiX, FiCamera, FiMapPin, FiCheckCircle, FiArrowLeft,
  FiShield, FiImage, FiLoader, FiHash, FiHome, FiPackage, FiEdit3,
  FiAlertTriangle,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../utils/api';

const MAX_IMAGES = 5;

const Field = ({ label, required, icon: Icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-[#8A6A00]" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-300 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#F4C10F] focus:border-[#F4C10F] hover:border-slate-400';

const CitizenReport = () => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [gtin, setGtin] = useState('');
  const [shopName, setShopName] = useState('');
  const [purchaseAddress, setPurchaseAddress] = useState('');
  const [productName, setProductName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported by this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error('Unable to capture location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocating(false);
        },
        (error) => {
          console.log('Geolocation error:', error);
          toast.warning('Could not automatically determine location. This helps inspectors find the product.');
          setLocating(false);
        },
      );
    }
  }, []);

  /* ----------------------------- Live camera capture ----------------------------- */
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  // Always release the camera when the component unmounts.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const openCamera = async () => {
    setCameraError(null);
    if (previews.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per report`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      // Very old browser: fall back to the plain file input.
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      console.log('Camera error:', err);
      setCameraError('Could not access the camera. Check your browser permissions, or use Gallery instead.');
      toast.error('Camera access was blocked or unavailable.');
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `label-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFiles([file]);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles = Array.from(selectedFiles).filter((f) => f.type.startsWith('image/'));

    if (newFiles.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per report`);
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Please add at least one image of the product label');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    if (gtin) formData.append('gtin', gtin);
    formData.append('shop_name', shopName);
    formData.append('purchase_address', purchaseAddress);
    formData.append('product_name', productName);
    formData.append('report_description', reportDescription);

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

  /* -------------------------------- Success state -------------------------------- */
  if (success) {
    return (
      <div className="min-h-screen bg-[#F1F4F9] flex items-center justify-center px-4 py-12">
        <style>{`
          @keyframes pop-in { 0% { opacity: 0; transform: scale(0.6); } 60% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
          @keyframes rise-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes blob-float { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(10px,-14px); } }
          .pop-in { animation: pop-in .5s cubic-bezier(.34,1.56,.64,1) both; }
          .rise-in { animation: rise-in .5s ease-out both; }
          .blob { animation: blob-float 9s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .pop-in, .rise-in, .blob { animation: none; } }
        `}</style>
        <div className="relative max-w-lg w-full overflow-hidden bg-white rounded-3xl shadow-xl border border-slate-200 p-10 text-center">
          <div className="blob pointer-events-none absolute -top-16 -right-14 h-48 w-48 rounded-full bg-[#F4C10F]/15 blur-3xl" />
          <div className="blob pointer-events-none absolute -bottom-16 -left-14 h-48 w-48 rounded-full bg-[#0F9D8B]/15 blur-3xl" style={{ animationDelay: '3s' }} />

          <div className="relative pop-in mx-auto h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <FiCheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="relative rise-in font-heading text-3xl font-bold text-slate-900 mt-6" style={{ animationDelay: '100ms' }}>
            Thank you for your report
          </h1>
          <p className="relative rise-in text-slate-500 mt-3 leading-relaxed" style={{ animationDelay: '160ms' }}>
            Your submission has been securely sent to our Legal Metrology inspectors. Crowdsourced leads like yours help ensure market compliance and consumer protection.
          </p>
          <button
            onClick={() => { setSuccess(false); setFiles([]); setPreviews([]); setGtin(''); }}
            className="relative rise-in mt-8 inline-flex items-center gap-2 bg-[#0B1425] text-[#F4C10F] px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C10F] focus-visible:ring-offset-2"
            style={{ animationDelay: '220ms' }}
          >
            Submit another report
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------- Form state ---------------------------------- */
  return (
    <div className="min-h-screen bg-[#F1F4F9] px-4 py-10">
      <style>{`
        @keyframes rise-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blob-float { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(10px,-14px); } }
        .rise-in { animation: rise-in .5s ease-out both; }
        .blob { animation: blob-float 9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rise-in, .blob { animation: none; } }
      `}</style>

      <div className="max-w-2xl mx-auto">

        {/* ------------------------------- Hero header ------------------------------- */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1425] via-[#16233B] to-[#0B1425] p-7 sm:p-9 mb-6 rise-in shadow-lg text-center">
          <div className="blob pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-[#F4C10F]/20 blur-3xl" />
          <div className="blob pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-[#5B5FEF]/20 blur-3xl" style={{ animationDelay: '3s' }} />

          <div className="relative flex justify-center gap-3 mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/5 text-slate-200 border border-white/10 transition-all duration-200 hover:bg-[#F4C10F] hover:text-[#0B1425] hover:border-[#F4C10F]"
            >
              <FiArrowLeft className="h-3.5 w-3.5" /> Back to login
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/5 text-slate-300 border border-white/10 transition-all duration-200 hover:bg-white/10"
            >
              Landing page
            </Link>
          </div>

          <div className="relative mx-auto h-12 w-12 rounded-2xl bg-[#F4C10F]/15 flex items-center justify-center mb-4">
            <FiShield className="h-6 w-6 text-[#F4C10F]" />
          </div>
          <h1 className="relative font-heading text-2xl sm:text-3xl font-bold text-white">Report a product violation</h1>
          <p className="relative text-slate-400 mt-3 max-w-md mx-auto">
            Upload clear photos of the product label — showing MRP, net quantity, and manufacturer details — to report suspected non-compliance.
          </p>
        </div>

        {/* ---------------------------------- Form ---------------------------------- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 rise-in" style={{ animationDelay: '80ms' }}>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <FiImage className="h-3.5 w-3.5 text-[#8A6A00]" /> Product images <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-semibold text-slate-400">{files.length}/{MAX_IMAGES}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group shadow-sm">
                    <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:bg-rose-600 hover:scale-110"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}

                {previews.length < MAX_IMAGES && (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-amber-50/40 hover:border-[#F4C10F] transition-colors duration-200 gap-2">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="text-[#8A6A00] hover:text-[#B4880A] flex flex-col items-center p-2 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <FiCamera size={22} className="mb-1" />
                      <span className="text-xs font-semibold">Camera</span>
                    </button>
                    <div className="w-8 border-t border-slate-300" />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-slate-500 hover:text-slate-800 flex flex-col items-center p-2 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <FiUpload size={18} className="mb-1" />
                      <span className="text-xs font-semibold">Gallery</span>
                    </button>
                  </div>
                )}
              </div>
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
              <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
              <p className="text-xs text-slate-500">Capture the full label, clearly showing text. Max {MAX_IMAGES} images.</p>
            </div>

            <Field label="Shop / seller name" required icon={FiHome}>
              <input required type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className={inputClass} placeholder="Shop where you purchased the product" />
            </Field>

            <Field label="Shop address" required icon={FiMapPin}>
              <textarea required rows="3" value={purchaseAddress} onChange={(e) => setPurchaseAddress(e.target.value)} className={inputClass} placeholder="Complete shop address" />
            </Field>

            <Field label="Product name (optional)" icon={FiPackage}>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} placeholder="Name of the product" />
            </Field>

            <Field label="What would you like to report?" icon={FiEdit3}>
              <textarea rows="3" value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} className={inputClass} placeholder="Describe the suspected issue (optional)" />
            </Field>

            <Field label="Barcode / GTIN (optional)" icon={FiHash}>
              <input type="text" value={gtin} onChange={(e) => setGtin(e.target.value)} className={inputClass} placeholder="e.g., 8901234567890" />
            </Field>

            {/* Location card */}
            <div className="relative overflow-hidden bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 transition-colors duration-200 hover:bg-indigo-50/80">
              <span className={`mt-0.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${location ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-100 text-indigo-500'}`}>
                {locating ? <FiLoader className="animate-spin" size={16} /> : <FiMapPin size={16} />}
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-indigo-900 text-sm">Location data</h4>
                <p className="text-indigo-700/80 text-xs mt-1">
                  {location
                    ? 'Your current location will be attached to help inspectors locate the product.'
                    : "We couldn't get your location automatically. It helps if you enable location services."}
                </p>
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={locating}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:opacity-60"
                >
                  {locating && <FiLoader className="animate-spin h-3.5 w-3.5" />}
                  {location ? 'Refresh GPS location' : 'Use my GPS location'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-sm flex justify-center items-center gap-2 transition-all duration-200 ${
                uploading || files.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-[#0B1425] hover:bg-[#16233B] hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing report...
                </>
              ) : (
                <>
                  <FiUpload className={files.length === 0 ? '' : 'text-[#F4C10F]'} />
                  Submit report
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ------------------------------ Live camera modal ------------------------------ */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            type="button"
            onClick={closeCamera}
            className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center transition-colors duration-200 hover:bg-white/20"
          >
            <FiX size={20} />
          </button>

          <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-2xl">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            {/* viewfinder guide — kept clear of the caption strip below */}
            <div className="pointer-events-none absolute top-6 left-6 right-6 bottom-16 border-2 border-[#F4C10F]/70 rounded-xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-3 px-6">
              <p className="text-center text-xs text-white/90">
                Frame the full label — MRP, net quantity and manufacturer details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={capturePhoto}
            aria-label="Capture photo"
            className="mt-6 h-16 w-16 rounded-full bg-[#F4C10F] flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 shadow-lg ring-4 ring-white/20"
          >
            <span className="h-12 w-12 rounded-full border-2 border-[#0B1425]" />
          </button>
        </div>
      )}

      {/* Camera errors surface as a small toast-like banner instead of blocking the form */}
      {cameraError && !cameraOpen && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-sm bg-white border border-rose-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-2">
          <FiAlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-700">{cameraError}</p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CitizenReport;