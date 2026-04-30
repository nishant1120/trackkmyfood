// Web-only barcode scanner. Uses getUserMedia for the video stream and
// ZXing's BrowserMultiFormatReader.decodeFromVideoElement for decoding.
// We split those two responsibilities (instead of calling ZXing's all-in-one
// decodeFromVideoDevice) because the all-in-one path was eating errors and
// not surfacing why the camera wasn't starting.

import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useEffect, useRef, useState } from 'react';

type Props = {
  onScan: (raw: string) => void;
};

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

const LOG = (...args: unknown[]) => console.log('[barcode-scan]', ...args);

export function WebBarcodeScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'starting' | 'streaming' | 'scanning' | 'error'>(
    'starting'
  );
  // Hold the latest onScan in a ref so the effect doesn't restart when the
  // parent passes a new closure each render.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    LOG('mount: starting camera + scanner');
    let cancelled = false;
    let stream: MediaStream | null = null;
    let controls: IScannerControls | null = null;

    async function start() {
      const video = videoRef.current;
      if (!video) {
        LOG('no video element ref yet');
        return;
      }
      if (!navigator?.mediaDevices?.getUserMedia) {
        LOG('getUserMedia not available');
        if (!cancelled) {
          setError('This browser does not support camera access.');
          setStatus('error');
        }
        return;
      }

      // 1) Request camera. Prefer the back camera on phones.
      try {
        LOG('requesting getUserMedia');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        LOG('got stream', stream?.getVideoTracks().map((t) => t.label));
      } catch (err) {
        LOG('getUserMedia failed', err);
        if (cancelled) return;
        const e = err as DOMException;
        if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
          setError('Camera permission was denied. Allow it in your browser, then retry.');
        } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
          setError('No camera detected on this device.');
        } else if (e?.name === 'NotReadableError') {
          setError('Camera is already in use by another app or tab.');
        } else {
          setError(e?.message ?? 'Could not start the camera.');
        }
        setStatus('error');
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // 2) Wire stream to video and play.
      video.srcObject = stream;
      try {
        await video.play();
        LOG('video playing', video.videoWidth, 'x', video.videoHeight);
      } catch (err) {
        LOG('video.play() failed', err);
        // Autoplay can fail on some browsers; the video should still render
        // and most browsers will start once muted+playsInline are set.
      }
      if (!cancelled) setStatus('streaming');

      // 3) Start ZXing decode loop on the video element.
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);

      try {
        LOG('starting decodeFromVideoElement');
        controls = await reader.decodeFromVideoElement(video, (result, err) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText();
            LOG('scan hit:', text, 'format:', result.getBarcodeFormat());
            onScanRef.current(text);
          }
          // ZXing fires NotFoundException continuously while scanning. Only
          // surface other error names.
          if (err && err.name && err.name !== 'NotFoundException') {
            LOG('zxing error:', err.name, err.message);
          }
        });
        LOG('decode loop running');
        if (!cancelled) setStatus('scanning');
      } catch (err) {
        LOG('decodeFromVideoElement failed', err);
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Decoder failed to start.');
        setStatus('error');
      }
    }

    start();

    return () => {
      LOG('cleanup');
      cancelled = true;
      try {
        controls?.stop();
      } catch {}
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render raw DOM elements directly. react-native-web is fine with this on
  // the web platform — the parent <View> is just a div.
  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#000000',
        overflow: 'hidden',
        minHeight: 320,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000',
          display: 'block',
        }}
      />

      {/* Reticle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '70%',
            aspectRatio: '1.6 / 1',
            border: '2px solid #1DB954',
            borderRadius: 16,
          }}
        />
      </div>

      {/* Status / error overlays */}
      {status === 'starting' ? (
        <Overlay>
          <div style={overlayText}>Starting camera…</div>
        </Overlay>
      ) : null}

      {status === 'scanning' ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(29, 185, 84, 0.15)',
              borderRadius: 9999,
              paddingInline: 12,
              paddingBlock: 6,
            }}
          >
            <span
              style={{
                color: '#1DB954',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              Scanning…
            </span>
          </div>
        </div>
      ) : null}

      {status === 'error' && error ? (
        <Overlay backdrop="rgba(0,0,0,0.78)">
          <div
            style={{
              ...overlayText,
              maxWidth: 320,
              padding: 16,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}

const overlayText = {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 600,
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

function Overlay({
  children,
  backdrop = 'transparent',
}: {
  children: React.ReactNode;
  backdrop?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backdrop,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
}
