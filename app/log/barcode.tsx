import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  Barcode as BarcodeIcon,
  ChevronLeft,
  Keyboard as KeyboardIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WebBarcodeScanner } from '@/components/log/WebBarcodeScanner';
import { Button, Card } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { lookupBarcode } from '@/lib/openfoodfacts';
import { supabase } from '@/lib/supabase';
import type { Food } from '@/lib/types';
import { useAiParseStore } from '@/stores/aiParseStore';

type Status =
  | { kind: 'scanning' }
  | { kind: 'looking-up'; barcode: string }
  | { kind: 'error'; barcode: string; message: string };

export default function BarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const handledRef = useRef<Set<string>>(new Set()); // dedupe rapid-fire scans
  const setFood = useAiParseStore((s) => s.setFood);

  // On native, web cameras may behave oddly; offer manual entry up front.
  useEffect(() => {
    if (Platform.OS === 'web') setManualEntry(true);
  }, []);

  const handleBarcode = async (raw: string) => {
    const barcode = raw.trim();
    if (!barcode) return;
    if (handledRef.current.has(barcode)) return;
    handledRef.current.add(barcode);
    haptic.success();
    setStatus({ kind: 'looking-up', barcode });

    try {
      // 1) Look in our seeded foods first (we already have ~553 OFF rows).
      const { data: dbHit } = await supabase
        .from('foods')
        .select('*')
        .eq('source', 'openfoodfacts')
        .eq('external_id', barcode)
        .maybeSingle();

      if (dbHit) {
        // Use the existing search/confirm path with a real foodId.
        router.replace({
          pathname: '/log/confirm',
          params: { foodId: (dbHit as Food).id },
        });
        return;
      }

      // 2) Live OFF lookup.
      const result = await lookupBarcode(barcode);
      if (result.kind === 'ok') {
        setFood({ food: result.food, loggedVia: 'barcode' });
        router.replace('/log/confirm');
        return;
      }
      if (result.kind === 'not_found') {
        setStatus({
          kind: 'error',
          barcode,
          message:
            "Not in our database or Open Food Facts. You can log it manually with AI text instead.",
        });
        return;
      }
      setStatus({ kind: 'error', barcode, message: result.message });
    } catch (err) {
      setStatus({
        kind: 'error',
        barcode,
        message: err instanceof Error ? err.message : 'Unknown error.',
      });
    }
  };

  const onSubmitManual = () => {
    const v = manualValue.trim();
    if (!/^\d{6,14}$/.test(v)) {
      Alert.alert('Invalid barcode', 'Barcodes are 6–14 digits.');
      return;
    }
    handleBarcode(v);
  };

  const reset = () => {
    setStatus({ kind: 'scanning' });
    handledRef.current.clear();
  };

  // Permission gate
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#1DB954" />
      </SafeAreaView>
    );
  }

  // Lookup / error overlay (covers the whole screen during the request).
  if (status.kind !== 'scanning') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <BarcodeIcon size={36} color="#7C7C7C" />
          <Text className="text-fg-dim text-center text-xs uppercase tracking-button">
            Barcode {status.barcode}
          </Text>
          {status.kind === 'looking-up' ? (
            <>
              <ActivityIndicator size="large" color="#1DB954" />
              <Text className="text-fg text-base font-semibold">
                Looking it up…
              </Text>
            </>
          ) : (
            <>
              <Text className="text-fg text-lg font-semibold text-center">
                Couldn't find this product
              </Text>
              <Text className="text-fg-muted text-center text-sm">
                {status.message}
              </Text>
              <View className="mt-4 w-full gap-2">
                <Button onPress={reset}>Scan another</Button>
                <Button
                  variant="ghost"
                  onPress={() => router.replace('/log/ai-text')}
                >
                  Log with AI text instead
                </Button>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Manual entry (used on web + when permission denied)
  // On web, permission.granted is unreliable; ZXing prompts directly when
  // the camera path is rendered, so we skip the gate there.
  if (manualEntry || (Platform.OS !== 'web' && !permission.granted)) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <Header onBack={() => router.back()} />
          <View className="flex-1 px-6 pt-4 gap-5">
            <View>
              <Text className="text-fg text-3xl font-bold tracking-tight">
                Enter barcode
              </Text>
              <Text className="text-fg-muted mt-2 text-sm">
                Type the barcode digits from the package. We'll look up
                nutrition automatically.
              </Text>
            </View>

            <Card>
              <Text className="text-fg-dim text-xs uppercase tracking-button">
                Barcode (6–14 digits)
              </Text>
              <TextInput
                autoFocus
                value={manualValue}
                onChangeText={setManualValue}
                keyboardType="number-pad"
                placeholder="e.g. 8901491100199"
                placeholderTextColor="#7C7C7C"
                className="text-fg mt-2 text-2xl font-bold tracking-wider"
                returnKeyType="search"
                onSubmitEditing={onSubmitManual}
              />
            </Card>

            <Button onPress={onSubmitManual}>Look up</Button>

            <View className="mt-2 items-center gap-1">
              <Text className="text-fg-dim text-xs">or</Text>
              <Button
                variant="ghost"
                onPress={async () => {
                  // On web ZXing prompts for camera access itself; skip the
                  // expo-camera permission gate which doesn't reflect browser
                  // state accurately.
                  if (Platform.OS !== 'web' && !permission.granted) {
                    const r = await requestPermission();
                    if (!r.granted) {
                      Alert.alert(
                        'Camera blocked',
                        'Allow camera access in Settings to scan with the camera.'
                      );
                      return;
                    }
                  }
                  setManualEntry(false);
                }}
              >
                Scan with camera
              </Button>
              {Platform.OS === 'web' ? (
                <Text className="text-fg-dim mt-1 text-center text-[11px]">
                  Your browser will ask for camera access. If detection
                  misses, use manual entry.
                </Text>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Camera scanning (native primarily)
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Header onBack={() => router.back()} />
      <View className="flex-1">
        <View className="flex-1 overflow-hidden">
          {Platform.OS === 'web' ? (
            <WebBarcodeScanner onScan={handleBarcode} />
          ) : (
            <>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_e', 'upc_a', 'code128'],
                }}
                onBarcodeScanned={({ data }) => handleBarcode(data)}
              />
              {/* Reticle */}
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center"
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
            </>
          )}
        </View>
        <View className="border-border-dim border-t px-6 py-4 pb-8">
          <View className="flex-row items-center justify-center gap-3">
            <Pressable
              onPress={() => setManualEntry(true)}
              className="bg-bg-elevated h-11 flex-row items-center gap-2 rounded-pill px-4 active:bg-bg-chip"
            >
              <KeyboardIcon size={16} color="#FFFFFF" />
              <Text className="text-fg text-sm font-semibold">Type barcode</Text>
            </Pressable>
          </View>
          <Text className="text-fg-dim mt-3 text-center text-xs">
            Point the camera at the barcode. Scan happens automatically.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
      >
        <ChevronLeft size={24} color="#FFFFFF" />
      </Pressable>
      <Text className="text-fg text-base font-semibold">Scan barcode</Text>
    </View>
  );
}
