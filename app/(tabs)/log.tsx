import { useRouter } from 'expo-router';
import {
  Barcode,
  Camera,
  ChevronRight,
  Search,
  Sparkles,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';

type Method =
  | {
      key: string;
      title: string;
      body: string;
      icon: React.ReactNode;
      available: true;
      href: '/log/search' | '/log/ai-text' | '/log/camera';
    }
  | {
      key: string;
      title: string;
      body: string;
      icon: React.ReactNode;
      available: false;
    };

const METHODS: Method[] = [
  {
    key: 'search',
    title: 'Search foods',
    body: '2,000+ Indian and global foods, full nutrition.',
    icon: <Search size={22} color="#1DB954" />,
    href: '/log/search',
    available: true,
  },
  {
    key: 'ai-text',
    title: 'Type with AI',
    body: '"2 rotis, 1 katori dal" — we parse the rest.',
    icon: <Sparkles size={22} color="#F59E0B" />,
    href: '/log/ai-text',
    available: true,
  },
  {
    key: 'camera',
    title: 'Photograph plate',
    body: 'Snap your meal and get an estimate.',
    icon: <Camera size={22} color="#8B5CF6" />,
    href: '/log/camera',
    available: true,
  },
  {
    key: 'barcode',
    title: 'Scan barcode',
    body: 'For packaged items with a label.',
    icon: <Barcode size={22} color="#539DF5" />,
    available: false,
  },
];

export default function LogTab() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 gap-4 pt-6">
        <View>
          <Text className="text-fg text-3xl font-bold tracking-tight">
            Log food
          </Text>
          <Text className="text-fg-muted mt-2 text-sm">
            Pick a method. We'll preview the nutrition before you save.
          </Text>
        </View>

        <View className="gap-2">
          {METHODS.map((m) => (
            <Pressable
              key={m.key}
              disabled={!m.available}
              onPress={() => {
                if (m.available) router.push(m.href);
              }}
              className="active:opacity-80"
            >
              <Card>
                <View className="flex-row items-center gap-4">
                  <View className="bg-bg-chip h-11 w-11 items-center justify-center rounded-full">
                    {m.icon}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-fg text-base font-semibold">
                        {m.title}
                      </Text>
                      {!m.available ? (
                        <View className="bg-bg-chip rounded-pill px-2 py-0.5">
                          <Text className="text-fg-dim text-[10px] uppercase tracking-button">
                            soon
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-fg-muted mt-1 text-xs">{m.body}</Text>
                  </View>
                  {m.available ? (
                    <ChevronRight size={18} color="#7C7C7C" />
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
