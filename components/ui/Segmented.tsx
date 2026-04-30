import { Pressable, Text, View } from 'react-native';

type Option<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

type SegmentedProps<T extends string> = {
  options: ReadonlyArray<Option<T>>;
  value: T | undefined;
  onChange: (value: T) => void;
  layout?: 'row' | 'column';
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layout = 'row',
}: SegmentedProps<T>) {
  if (layout === 'column') {
    return (
      <View className="gap-2">
        {options.map((opt) => (
          <Row
            key={opt.value}
            label={opt.label}
            hint={opt.hint}
            selected={opt.value === value}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    );
  }

  return (
    <View className="bg-bg-elevated flex-row rounded-pill p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center justify-center rounded-pill py-2 ${
              active ? 'bg-brand' : ''
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-black' : 'text-fg-muted'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-card border p-4 ${
        selected
          ? 'border-brand bg-bg-elevated'
          : 'border-border-dim bg-bg-card active:bg-bg-elevated'
      }`}
    >
      <Text className={`font-semibold ${selected ? 'text-brand' : 'text-fg'}`}>
        {label}
      </Text>
      {hint ? <Text className="text-fg-muted mt-1 text-xs">{hint}</Text> : null}
    </Pressable>
  );
}
