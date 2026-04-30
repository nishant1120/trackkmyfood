import { Flame } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  HeatmapLegend,
  StreakHeatmap,
} from '@/components/charts/StreakHeatmap';
import { MacroTrendChart } from '@/components/charts/MacroTrendChart';
import { WeeklyCaloriesChart } from '@/components/charts/WeeklyCaloriesChart';
import { WeightChart } from '@/components/charts/WeightChart';
import { Button, Card, Screen, Skeleton } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useStreak } from '@/hooks/useStreak';
import { useTrends } from '@/hooks/useTrends';
import { useAddWeight } from '@/hooks/useWeightLogs';

export default function HistoryTab() {
  const { width: screenWidth } = useWindowDimensions();
  const profileQuery = useProfile();
  const trendsQuery = useTrends(56);
  const streakQuery = useStreak();
  const addWeight = useAddWeight();

  const [weightInput, setWeightInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      profileQuery.refetch(),
      trendsQuery.refetch(),
      streakQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const onLogWeight = async () => {
    const v = parseFloat(weightInput);
    if (!Number.isFinite(v) || v <= 0) {
      Alert.alert('Invalid weight', 'Enter a number in kg, e.g. 68.5');
      return;
    }
    try {
      await addWeight.mutateAsync(v);
      setWeightInput('');
    } catch (err) {
      Alert.alert(
        'Could not save weight',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const profile = profileQuery.data;
  const trends = trendsQuery.data;
  const streak = streakQuery.data;
  const goalKcal = profile?.daily_calorie_goal ?? 2000;

  // Card content fits in (screenWidth - 24*2 padding - 16*2 card padding) ≈ screenWidth - 80
  const chartWidth = Math.max(240, screenWidth - 80);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerClassName="px-6 pt-6 pb-10 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DB954"
          />
        }
      >
        <View>
          <Text className="text-fg text-3xl font-bold tracking-tight">
            History
          </Text>
          <Text className="text-fg-muted mt-2 text-sm">
            Your last 8 weeks at a glance.
          </Text>
        </View>

        {/* All-time stats row */}
        <View className="flex-row gap-3">
          <StatTile
            icon={<Flame size={16} color="#F59E0B" />}
            label="Current"
            value={`${streak?.currentStreak ?? 0}`}
            unit="day streak"
          />
          <StatTile
            label="Longest"
            value={`${trends?.longestStreak ?? 0}`}
            unit="days"
          />
          <StatTile
            label="Avg / day"
            value={`${trends?.avgDailyKcal ?? 0}`}
            unit="kcal"
          />
        </View>

        {/* Streak heatmap */}
        <Card>
          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="text-fg text-sm font-semibold">
              Logging streak
            </Text>
            <Text className="text-fg-dim text-[11px]">
              {trends?.totalDaysLogged ?? 0} of {trends?.days.length ?? 0} days
            </Text>
          </View>
          {trendsQuery.isLoading ? (
            <Skeleton width="100%" height={104} rounded="md" />
          ) : trends ? (
            <View>
              <StreakHeatmap days={trends.days} goalKcal={goalKcal} />
              <View className="mt-3">
                <HeatmapLegend />
              </View>
            </View>
          ) : null}
        </Card>

        {/* Weekly calories */}
        <Card>
          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="text-fg text-sm font-semibold">
              Last 7 days · calories
            </Text>
          </View>
          {trends ? (
            <WeeklyCaloriesChart
              days={trends.days}
              goalKcal={goalKcal}
              width={chartWidth}
            />
          ) : (
            <Skeleton width="100%" height={160} rounded="md" />
          )}
        </Card>

        {/* Macro trends */}
        <Card>
          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="text-fg text-sm font-semibold">Macro trend</Text>
          </View>
          {trends ? (
            <MacroTrendChart days={trends.days} width={chartWidth} />
          ) : (
            <Skeleton width="100%" height={140} rounded="md" />
          )}
        </Card>

        {/* Weight tracker */}
        <Card>
          <Text className="text-fg text-sm font-semibold">Weight</Text>
          <Text className="text-fg-muted mt-1 text-xs">
            Log every few days to see a meaningful trend.
          </Text>
          <View className="mt-3">
            {trends ? (
              <WeightChart weights={trends.weights} width={chartWidth} />
            ) : null}
          </View>
          <View className="mt-4 flex-row items-end gap-3">
            <View className="flex-1">
              <Text className="text-fg-dim mb-1 text-xs">New weight (kg)</Text>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder={profile?.weight_kg ? `${profile.weight_kg}` : '68.5'}
                placeholderTextColor="#7C7C7C"
                className="bg-bg-elevated text-fg rounded-card px-3 py-3 text-base"
                returnKeyType="done"
                onSubmitEditing={onLogWeight}
              />
            </View>
            <View>
              <Button
                onPress={onLogWeight}
                loading={addWeight.isPending}
                fullWidth={false}
              >
                Log
              </Button>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function StatTile({
  icon,
  label,
  value,
  unit,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View className="bg-bg-elevated flex-1 rounded-card p-3">
      <View className="flex-row items-center gap-1.5">
        {icon ?? null}
        <Text className="text-fg-dim text-[10px] uppercase tracking-button">
          {label}
        </Text>
      </View>
      <Text className="text-fg mt-1 text-2xl font-bold">{value}</Text>
      <Text className="text-fg-dim text-[11px]">{unit}</Text>
    </View>
  );
}
