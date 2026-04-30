import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Camera as CameraIcon,
  ChevronLeft,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useAiParseStore } from '@/stores/aiParseStore';

type CapturedImage = {
  uri: string;
  base64: string; // includes data: prefix or just raw — parseFoodPhoto handles both
};

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [captured, setCaptured] = useState<CapturedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const setPhoto = useAiParseStore((s) => s.setPhoto);

  // Permission denied UI
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#1DB954" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-fg text-base font-semibold">Camera</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8 gap-5">
          <CameraIcon size={48} color="#7C7C7C" />
          <Text className="text-fg text-lg font-semibold text-center">
            Camera access needed
          </Text>
          <Text className="text-fg-muted text-center text-sm">
            We use the camera only when you choose to log a meal photo. Photos
            stay on your device — we send them to our AI parser and don't store
            them by default.
          </Text>
          <View className="w-full">
            <Button onPress={requestPermission}>Grant camera access</Button>
          </View>
          <PickFromGallery onPicked={setCaptured} setBusy={setBusy} />
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo) return;
      const compressed = await compressForLLM(photo.uri);
      setCaptured(compressed);
    } catch (err) {
      Alert.alert(
        'Could not capture',
        err instanceof Error ? err.message : 'Unknown error'
      );
    } finally {
      setBusy(false);
    }
  };

  const onUse = () => {
    if (!captured) return;
    setPhoto({ base64: captured.base64, uri: captured.uri });
    router.replace('/log/photo-confirm');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-fg text-base font-semibold">Photograph plate</Text>
      </View>

      {/* Body */}
      {captured ? (
        <View className="flex-1">
          <View className="flex-1 items-center justify-center bg-black">
            <Image
              source={{ uri: captured.uri }}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <View className="border-border-dim flex-row gap-3 border-t px-6 py-4 pb-8">
            <View className="flex-1">
              <Button variant="ghost" onPress={() => setCaptured(null)}>
                Retake
              </Button>
            </View>
            <View className="flex-1">
              <Button onPress={onUse}>Use this photo</Button>
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <View className="flex-1 overflow-hidden">
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
            />
          </View>
          <View className="border-border-dim border-t px-6 py-4 pb-8">
            <View className="flex-row items-center justify-center gap-6">
              <PickFromGallery onPicked={setCaptured} setBusy={setBusy} />
              <Pressable
                onPress={handleCapture}
                disabled={busy}
                className={`h-20 w-20 items-center justify-center rounded-full ${busy ? 'opacity-50' : ''}`}
                style={{ backgroundColor: '#1DB954' }}
              >
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View className="h-16 w-16 rounded-full bg-black" />
                )}
              </Pressable>
              <View className="h-11 w-11" />
            </View>
            <Text className="text-fg-dim mt-3 text-center text-xs">
              {Platform.OS === 'web'
                ? 'Tip: web cameras vary; use Upload if capture looks off.'
                : 'Frame the plate with good lighting for the best estimate.'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function PickFromGallery({
  onPicked,
  setBusy,
}: {
  onPicked: (img: CapturedImage) => void;
  setBusy: (b: boolean) => void;
}) {
  const handlePick = async () => {
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const compressed = await compressForLLM(result.assets[0].uri);
      onPicked(compressed);
    } catch (err) {
      Alert.alert(
        'Could not load image',
        err instanceof Error ? err.message : 'Unknown error'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={handlePick}
      hitSlop={8}
      className="bg-bg-elevated h-11 w-11 items-center justify-center rounded-full active:bg-bg-chip"
    >
      <ImageIcon size={20} color="#FFFFFF" />
    </Pressable>
  );
}

async function compressForLLM(uri: string): Promise<CapturedImage> {
  // Resize to 800px wide, JPEG, base64 inline. Gemini accepts any reasonable
  // size; we cap to keep the payload small and the request fast.
  const result = await manipulateAsync(uri, [{ resize: { width: 800 } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('No base64 returned from manipulator');
  return { uri: result.uri, base64: result.base64 };
}
