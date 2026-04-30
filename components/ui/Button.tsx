import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'h-10 px-4', text: 'text-sm' },
  md: { container: 'h-12 px-6', text: 'text-base' },
  lg: { container: 'h-14 px-8', text: 'text-lg' },
};

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-brand active:bg-brand-dark', text: 'text-black' },
  secondary: {
    container: 'bg-bg-elevated border border-border active:bg-bg-chip',
    text: 'text-fg',
  },
  ghost: { container: 'bg-transparent active:bg-bg-elevated', text: 'text-fg' },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sz = sizeClasses[size];
  const va = variantClasses[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-pill ${sz.container} ${va.container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#000' : '#fff'} />
      ) : (
        <Text className={`font-bold ${sz.text} ${va.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
