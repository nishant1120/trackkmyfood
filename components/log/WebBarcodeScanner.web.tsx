// Web-only barcode scanner using ZXing on a <video> element. Native devices
// use expo-camera's built-in onBarcodeScanned. Importing this component
// from native code is harmless because the web file is selected by Metro's
// platform extension resolution (we keep this file generic but only render
// it inside Platform.OS === 'web' branches).

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

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

export function WebBarcodeScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!videoRef.current) return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    let cancelled = false;
    let activeControls: { stop: () => void } | null = null;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (cancelled) return;
        if (result) {
          onScan(result.getText());
        }
        // err is fired constantly while scanning fails — we ignore unless it's
        // a real device-level error.
        if (err && err.name === 'NotAllowedError') {
          setError('Camera permission was denied.');
        }
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        activeControls = controls;
        setReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Could not start camera';
        if (msg.includes('NotAllowed')) setError('Camera permission was denied.');
        else if (msg.includes('NotFound')) setError('No camera detected.');
        else setError(msg);
      });

    return () => {
      cancelled = true;
      activeControls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // onScan captured at mount; the callback shouldn't change

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* React Native Web ignores raw <video>; we render via createElement so
          web treats it as a real <video> tag. */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000',
        }}
        autoPlay
        muted
        playsInline
      />
      {/* Reticle */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: '70%',
            aspectRatio: 1.6,
            borderColor: '#1DB954',
            borderWidth: 2,
            borderRadius: 16,
          }}
        />
      </View>

      {!ready && !error ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={{ color: '#FFFFFF', fontSize: 12 }}>
            Starting camera…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
