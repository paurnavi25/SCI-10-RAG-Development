import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Upload } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const [stream, setStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError('');
    setLoading(true);
    setCapturedBlob(null);
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this device/browser.');
      }
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        // Fallback to any available video device
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in your browser settings or choose a photo from your computer.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device was detected on your computer. You can upload a photo from your computer instead.');
      } else {
        setError(err.message || 'Unable to access camera.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(url);
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }
    setCapturedBlob(null);
  };

  const handleUsePhoto = () => {
    if (!capturedBlob) return;
    const fileName = `science_photo_${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: 'image/jpeg' });
    onCapture(file, capturedUrl);
    stopCamera();
    onClose();
  };

  const handleFallbackFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onCapture(file, url);
      stopCamera();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cream-400 dark:border-[#3B473E]">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-forest dark:text-[#9BB99A]" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-forest dark:text-[#F1F3EE]">
              Take a Photo
            </h3>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1 rounded-lg text-warm-grey dark:text-[#8E9B90] hover:text-forest dark:hover:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#303B33] transition-colors"
            title="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[420px] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <AlertCircle size={32} className="mx-auto text-amber-500" />
              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">{error}</p>
              <div className="pt-2">
                <button
                  onClick={() => fallbackInputRef.current?.click()}
                  className="btn-primary inline-flex items-center gap-2 text-xs"
                >
                  <Upload size={14} />
                  <span>Choose Photo from Device</span>
                </button>
                <input
                  ref={fallbackInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFallbackFile}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Live Video */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-contain ${capturedUrl ? 'hidden' : 'block'}`}
              />

              {/* Still Snapshot Preview */}
              {capturedUrl && (
                <img
                  src={capturedUrl}
                  alt="Captured photo preview"
                  className="w-full h-full object-contain"
                />
              )}

              {/* Hidden Canvas for capture rendering */}
              <canvas ref={canvasRef} className="hidden" />

              {loading && !capturedUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs">
                  Connecting to camera...
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-cream-200 dark:bg-[#202823] border-t border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-3">
          {error ? (
            <div className="w-full flex justify-end">
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          ) : !capturedUrl ? (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="text-xs text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE] flex items-center gap-1.5 font-medium"
              >
                <Upload size={14} />
                <span>Upload file instead</span>
              </button>
              <input
                ref={fallbackInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFallbackFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleCapture}
                disabled={loading || !stream}
                className="btn-primary !py-2 !px-5 flex items-center gap-2 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Camera size={16} />
                <span>Capture Photo</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={handleRetake}
                className="btn-secondary !py-2 !px-4 flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw size={14} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                className="btn-primary !py-2 !px-5 flex items-center gap-2 text-xs font-bold shadow-md"
              >
                <Check size={16} />
                <span>Use Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
