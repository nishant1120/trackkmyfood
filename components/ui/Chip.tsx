import { Pressable, Text } from 'react-native';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
};

export function Chip({ label, selected = false, onPress, size = 'md' }: ChipProps) {
  const heightCls = size === 'sm' ? 'h-9 px-3' : 'h-11 px-4';
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-pill border ${heightCls} ${
        selected
          ? 'bg-brand border-brand'
          : 'bg-bg-elevated border-border-dim active:bg-bg-chip'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${selected ? 'text-black' : 'text-fg'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
