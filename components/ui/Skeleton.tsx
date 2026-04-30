import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  className?: string;
  rounded?: 'sm' | 'md' | 'pill';
};

const RADIUS: Record<NonNullable<SkeletonProps['rounded']>, number> = {
  sm: 6,
  md: 12,
  pill: 9999,
};

export function Skeleton({
  width = '100%',
  height = 16,
  className = '',
  rounded = 'md',
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View
      className={className}
      style={{
        width,
        height,
        borderRadius: RADIUS[rounded],
        backgroundColor: '#1F1F1F',
        opacity,
      }}
    />
  );
}

// Convenience composite for a card-shaped block while loading.
export function CardSkeleton({ height = 120 }: { height?: number }) {
  return (
    <View
      style={{
        backgroundColor: '#181818',
        borderRadius: 16,
        padding: 16,
        gap: 12,
      }}
    >
      <Skeleton width="40%" height={10} />
      <Skeleton width="60%" height={20} />
      <View style={{ height: Math.max(0, height - 80) }} />
    </View>
  );
}
