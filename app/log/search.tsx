import { useRouter } from 'expo-router';
import { ChevronLeft, Search as SearchIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFoodSearch } from '@/hooks/useFoods';
import type { Food } from '@/lib/types';

export default function FoodSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data, isFetching, error } = useFoodSearch(query);

  const showHint = query.trim().length < 2;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="bg-bg-elevated flex-1 flex-row items-center gap-2 rounded-pill px-4 h-11">
          <SearchIcon size={16} color="#7C7C7C" />
          <TextInput
            autoFocus
            placeholder="Search 2,000+ foods"
            placeholderTextColor="#7C7C7C"
            value={query}
            onChangeText={setQuery}
            className="text-fg flex-1 text-base"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={12}>
              <X size={16} color="#7C7C7C" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showHint ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-fg-muted text-center text-sm">
            Type at least 2 characters. Try "dal", "paneer", "apple", or a
            brand name.
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-danger text-center text-sm">
            Search failed. {(error as Error).message.slice(0, 100)}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(it) => it.id}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-4 pb-8"
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            isFetching ? (
              <View className="items-center pt-12">
                <ActivityIndicator size="small" color="#1DB954" />
              </View>
            ) : (
              <View className="items-center pt-12 px-4">
                <Text className="text-fg-muted text-center text-sm">
                  No matches. Try a shorter or different term.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <FoodRow
              food={item}
              onPress={() =>
                router.push({
                  pathname: '/log/confirm',
                  params: { foodId: item.id },
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const subtitle = [
    food.brand,
    food.cuisine === 'indian' ? 'Indian' : null,
    `${Math.round(food.calories_kcal)} kcal/100${food.serving_size_g === 100 ? 'g' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      className="bg-bg-elevated flex-row items-center gap-3 rounded-card p-3 active:opacity-80"
    >
      <View className="bg-bg-chip h-12 w-12 items-center justify-center rounded-card">
        <Text className="text-base">
          {food.cuisine === 'indian' ? '🍛' : '🥗'}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-fg text-sm font-semibold" numberOfLines={1}>
          {food.name}
        </Text>
        {food.name_hindi ? (
          <Text className="text-fg-dim mt-0.5 text-xs" numberOfLines={1}>
            {food.name_hindi}
          </Text>
        ) : null}
        <Text className="text-fg-muted mt-0.5 text-xs" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
