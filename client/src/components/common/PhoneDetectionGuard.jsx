'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './PhoneDetectionGuard.css';
import { Shield, ShieldAlert, ShieldCheck, Camera, Smartphone, AlertTriangle, EyeOff, Lock, RefreshCw } from 'lucide-react';

export default function PhoneDetectionGuard({ pageName = 'All Customers' }) {
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isGuardEnabled, setIsGuardEnabled] = useState(true);

  const videoRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const streamRef = useRef(null);
  const isComponentMounted = useRef(true);

  // 1. Initialize TensorFlow & COCO-SSD Model Dynamically on Client
  useEffect(() => {
    isComponentMounted.current = true;
    let isCancelled = false;

    async function loadModel() {
      try {
        setIsModelLoading(true);
        // Load TensorFlow.js core and COCO-SSD asynchronously
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        
        const loadedModel = await cocoSsd.load({
          base: 'lite_mobilenet_v2' // Fast lightweight MobileNet for 60fps browser inference
        });

        if (!isCancelled && isComponentMounted.current) {
          setModel(loadedModel);
          setIsModelLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load TensorFlow COCO-SSD model:', err.message);
        if (!isCancelled && isComponentMounted.current) {
          setIsModelLoading(false);
          setCameraError('AI Engine Initialization Failed');
        }
      }
    }

    loadModel();

    return () => {
      isCancelled = true;
      isComponentMounted.current = false;
    };
  }, []);

  // 2. Start / Stop Webcam Stream
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access not supported on this browser.');
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
          setCameraActive(true);
        };
      }
    } catch (err) {
      console.warn('Webcam Permission / Device Error:', err.name, err.message);
      setCameraError('Webcam access required for Anti-Spy Security.');
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
  }, []);

  // Start Camera when Guard is Enabled & Model is Loaded
  useEffect(() => {
    if (isGuardEnabled && model && !cameraActive) {
      startCamera();
    } else if (!isGuardEnabled && cameraActive) {
      stopCamera();
    }

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isGuardEnabled, model, cameraActive, startCamera, stopCamera]);

  // 3. Real-Time Object Detection Loop
  const detectFrame = useCallback(async () => {
    if (!isGuardEnabled || !model || !videoRef.current || videoRef.current.readyState !== 4) {
      if (isGuardEnabled && cameraActive) {
        animFrameIdRef.current = requestAnimationFrame(detectFrame);
      }
      return;
    }

    try {
      const predictions = await model.detect(videoRef.current);

      // Check if any prediction matches 'cell phone' or 'mobile phone'
      const phoneObj = predictions.find(
        p => (p.class === 'cell phone' || p.class === 'mobile phone' || p.class === 'remote' || p.class === 'book') && p.score >= 0.35
      );

      if (phoneObj) {
        setIsPhoneDetected(true);
        setConfidence(Math.round(phoneObj.score * 100));
      } else {
        setIsPhoneDetected(false);
        setConfidence(0);
      }
    } catch (err) {
      // Ignore frame read errors during state transitions
    }

    if (isComponentMounted.current && isGuardEnabled) {
      // Run detection loop ultra-fast (~10 frames per second)
      setTimeout(() => {
        if (isComponentMounted.current && isGuardEnabled) {
          animFrameIdRef.current = requestAnimationFrame(detectFrame);
        }
      }, 100);
    }
  }, [model, isGuardEnabled, cameraActive]);

  useEffect(() => {
    if (cameraActive && model && isGuardEnabled) {
      detectFrame();
    }
  }, [cameraActive, model, isGuardEnabled, detectFrame]);

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <>
      {/* Invisible Video Element for AI Processing */}
      <video
        ref={videoRef}
        className="pd-hidden-video"
        playsInline
        muted
      />

      {/* Floating Security Guard Status Bar */}
      <div className="pd-guard-bar">
        <div className="pd-guard-left">
          {isModelLoading ? (
            <span className="pd-guard-badge pd-badge-loading">
              <RefreshCw className="spin-icon" size={14} /> Loading AI Anti-Spy Guard...
            </span>
          ) : isPhoneDetected ? (
            <span className="pd-guard-badge pd-badge-alert">
              <span className="pd-pulse-dot" /> 🚨 Phone Camera Detected ({confidence}%)
            </span>
          ) : cameraError ? (
            <span className="pd-guard-badge pd-badge-loading" style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
              <ShieldAlert size={14} /> {cameraError}
            </span>
          ) : isGuardEnabled ? (
            <span className="pd-guard-badge pd-badge-active">
              <span className="pd-pulse-dot" /> <ShieldCheck size={14} /> AI Anti-Spy Guard Active
            </span>
          ) : (
            <span className="pd-guard-badge pd-badge-loading" style={{ color: '#64748B', borderColor: 'rgba(100, 116, 139, 0.3)' }}>
              <ShieldAlert size={14} /> Anti-Spy Guard Paused
            </span>
          )}

          <span className="pd-guard-info">
            Protected Page: <strong>{pageName}</strong> • Confidential Data Shield
          </span>
        </div>

        <div className="pd-guard-right">
          {cameraError && (
            <button type="button" className="pd-toggle-btn" onClick={startCamera}>
              Enable Camera
            </button>
          )}

          <button
            type="button"
            className="pd-toggle-btn"
            onClick={() => setIsGuardEnabled(prev => !prev)}
            title={isGuardEnabled ? 'Pause AI Camera Monitoring' : 'Resume AI Camera Monitoring'}
          >
            {isGuardEnabled ? 'Pause Security Guard' : 'Enable Security Guard'}
          </button>
        </div>
      </div>

      {/* 🛑 FULLSCREEN SECURITY LOCKDOWN OVERLAY (WHEN MOBILE PHONE IS DETECTED) */}
      {isPhoneDetected && (
        <div className="pd-overlay-backdrop">
          <div className="pd-alert-card">
            <div className="pd-alert-icon-ring">
              <Smartphone size={44} />
            </div>

            <h2 className="pd-alert-title">
              ⚠️ SECURITY ALERT: MOBILE PHONE DETECTED!
            </h2>

            <p className="pd-alert-desc">
              Camera AI detected a <strong>Mobile Device / Smartphone</strong> facing the screen.  
              Screen content on <strong>{pageName}</strong> has been blurred to protect confidential customer data.
            </p>

            <div className="pd-alert-meta">
              <EyeOff size={16} /> Detection Confidence: <strong>{confidence}%</strong>
              <span style={{ opacity: 0.4 }}>•</span>
              <Lock size={16} /> Anti-Spy Lockdown Active
            </div>

            <div className="pd-alert-footer">
              Remove the mobile phone from your laptop camera view to unblur the screen automatically.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
