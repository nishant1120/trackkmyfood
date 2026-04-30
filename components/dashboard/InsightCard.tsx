import { ActivityIndicator, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import type { DailyInsightResponse } from '@/lib/prompts';

type InsightCardProps = {
  state:
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ok'; data: DailyInsightResponse; cached?: boolean };
};

export function InsightCard({ state }: InsightCardProps) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-fg-dim text-xs uppercase tracking-button">
          AI Coach
        </Text>
        {state.kind === 'ok' && state.cached ? (
          <Text className="text-fg-dim text-[10px]">cached</Text>
        ) : null}
      </View>

      {state.kind === 'loading' ? (
        <View className="my-6 items-center">
          <ActivityIndicator size="small" color="#1DB954" />
          <Text className="text-fg-muted mt-3 text-xs">Reading your day…</Text>
        </View>
      ) : state.kind === 'error' ? (
        <Text className="text-fg-muted mt-3 text-sm">
          Couldn't generate insights right now. {state.message.slice(0, 120)}
        </Text>
      ) : (
        <View className="mt-3 gap-4">
          <Text className="text-fg text-base font-semibold leading-snug">
            {state.data.summary}
          </Text>

          <View className="gap-3">
            {state.data.recommendations?.slice(0, 3).map((r, i) => (
              <View key={i} className="flex-row items-start gap-3">
                <Text className="text-base">{r.icon}</Text>
                <View className="flex-1">
                  <Text className="text-fg text-sm font-semibold">{r.title}</Text>
                  <Text className="text-fg-muted mt-0.5 text-xs leading-relaxed">
                    {r.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {state.data.health_action ? (
            <View className="border-border-dim mt-1 border-t pt-3">
              <Text className="text-fg-dim text-xs uppercase tracking-button">
                Next 4 hours
              </Text>
              <Text className="text-fg mt-1 text-sm font-medium">
                {state.data.health_action}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}
