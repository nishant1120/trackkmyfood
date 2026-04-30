import { forwardRef } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, className, ...rest },
  ref
) {
  return (
    <View className="w-full">
      {label ? (
        <Text className="text-fg-muted mb-2 text-sm font-medium">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#7C7C7C"
        className={`bg-bg-elevated text-fg border rounded-card px-4 py-4 text-base ${error ? 'border-danger' : 'border-border-dim'} ${className ?? ''}`}
        {...rest}
      />
      {error ? (
        <Text className="text-danger mt-1 text-xs">{error}</Text>
      ) : hint ? (
        <Text className="text-fg-dim mt-1 text-xs">{hint}</Text>
      ) : null}
    </View>
  );
});
