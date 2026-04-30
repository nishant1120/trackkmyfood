import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  elevated?: boolean;
};

export function Card({ children, onPress, className = '', elevated = false }: CardProps) {
  const base = `rounded-card p-4 ${elevated ? 'bg-bg-elevated' : 'bg-bg-card'} ${className}`;

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${base} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}
