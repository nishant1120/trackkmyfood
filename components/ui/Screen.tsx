import { ReactNode } from 'react';
import { View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  className?: string;
  edges?: readonly Edge[];
  padded?: boolean;
};

export function Screen({
  children,
  className = '',
  edges = ['top', 'bottom'],
  padded = true,
}: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={edges}>
      <View className={`flex-1 ${padded ? 'px-6' : ''} ${className}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
