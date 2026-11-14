import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  type ViewStyle,
  type TextStyle,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, font, gradients, shadow } from './theme';

type ButtonVariant = 'primary' | 'cta' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  compact,
}: ButtonProps) {
  const spinnerColor =
    variant === 'cta'
      ? colors.textOnCta
      : variant === 'primary'
        ? colors.textOnPrimary
        : variant === 'danger'
          ? colors.danger
          : colors.primary;
  const textColor = spinnerColor;
  const bgStyle =
    variant === 'primary'
      ? btnStyles.primary
      : variant === 'cta'
        ? btnStyles.cta
        : variant === 'danger'
          ? btnStyles.danger
          : variant === 'outline'
            ? btnStyles.outline
            : btnStyles.ghost;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        btnStyles.base,
        bgStyle,
        compact && { minHeight: 40, paddingVertical: 8, paddingHorizontal: 12 },
        (disabled || loading) && btnStyles.disabled,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text style={[btnStyles.text, { color: textColor }, compact && { fontSize: 12 }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: colors.primary, backgroundImage: gradients.primary },
  cta: { backgroundColor: colors.cta, backgroundImage: gradients.primary },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, letterSpacing: 0.1, ...font.semibold },
});

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function InputField({ label, error, containerStyle, style, ...props }: InputFieldProps) {
  return (
    <View style={[inputStyles.container, containerStyle]}>
      <Text style={inputStyles.label}>{label}</Text>
      <TextInput
        style={[inputStyles.input, error ? inputStyles.inputError : null, style as TextStyle]}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? <Text style={inputStyles.error}>{error}</Text> : null}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, ...font.medium },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 50,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
});

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  const content = <View style={[cardStyles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
});

interface BadgeProps {
  text: string;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

export function Badge({ text, variant = 'neutral' }: BadgeProps) {
  const colorMap = {
    info: { bg: '#DBEAFE', fg: '#1D4ED8' },
    success: { bg: '#DCFCE7', fg: '#15803D' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    danger: { bg: '#FEE2E2', fg: '#991B1B' },
    neutral: { bg: '#F1F5F9', fg: '#475569' },
  };
  const c = colorMap[variant];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.text, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, ...font.semibold },
});

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}

export function ScreenWrapper({
  children,
  scroll = true,
  style,
  refreshing = false,
  onRefresh,
}: ScreenWrapperProps) {
  if (scroll) {
    return (
      <SafeAreaView style={screenStyles.safe} edges={['left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={screenStyles.scroll}
            contentContainerStyle={[screenStyles.content, style]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      style={[screenStyles.safe, screenStyles.content, style]}
      edges={['left', 'right']}
    >
      {children}
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 24 },
});

export function LoadingScreen() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={loadingStyles.container}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});

interface PickerFieldProps {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  error?: string;
}

export function PickerField({ label, value, options, onChange, error }: PickerFieldProps) {
  return (
    <View style={inputStyles.container}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[inputStyles.input, { padding: 0 }, error ? inputStyles.inputError : null]}>
        <View style={{ padding: 8, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === opt.value }}
              onPress={() => onChange(opt.value)}
              style={[pickerStyles.chip, value === opt.value && pickerStyles.chipActive]}
            >
              <Text
                style={[pickerStyles.chipText, value === opt.value && pickerStyles.chipTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {error ? <Text style={inputStyles.error}>{error}</Text> : null}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, ...font.medium },
  chipTextActive: { color: colors.textOnPrimary },
});

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function DateField({
  label,
  value,
  onChange,
  error,
  placeholder,
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const [show, setShow] = useState(false);
  const parsed = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return undefined;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  })();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (date) onChange(toIsoDate(date));
  };

  const display = value ? formatDisplay(value) : '';
  return (
    <View style={inputStyles.container}>
      <Text style={inputStyles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.7}
        style={[
          inputStyles.input,
          error ? inputStyles.inputError : null,
          { justifyContent: 'center' },
        ]}
      >
        <Text style={{ fontSize: 15, color: display ? colors.textPrimary : colors.textMuted }}>
          {display || placeholder || 'Select date'}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={inputStyles.error}>{error}</Text> : null}
      {show && (
        <DateTimePicker
          value={parsed ?? maximumDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={sectionStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={sectionStyles.title}>{title}</Text>
        {subtitle ? <Text style={sectionStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={sectionStyles.action}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  title: { fontSize: 17, color: colors.textPrimary, ...font.semibold },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  action: { fontSize: 13, color: colors.primary, ...font.semibold },
});

interface EmptyStateProps {
  title: string;
  description?: string;
  /** @deprecated use description */
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  message,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  const text = description ?? message;
  return (
    <View style={emptyStyles.wrap}>
      <View
        style={{
          backgroundColor: colors.primarySoft,
          padding: 20,
          borderRadius: 40,
          marginBottom: 16,
        }}
      >
        <Ionicons name="file-tray-outline" size={36} color={colors.primary} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      {text ? <Text style={emptyStyles.desc}>{text}</Text> : null}
      {actionTitle && onAction ? (
        <View style={{ marginTop: spacing.md, alignSelf: 'stretch' }}>
          <Button title={actionTitle} onPress={onAction} variant="outline" />
        </View>
      ) : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { padding: spacing.xl, alignItems: 'center' },
  title: { fontSize: 15, color: colors.textPrimary, ...font.semibold, textAlign: 'center' },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" style={errStyles.wrap}>
      <Text style={errStyles.title}>Something went wrong</Text>
      <Text style={errStyles.desc}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md, alignSelf: 'stretch' }}>
          <Button title="Try again" onPress={onRetry} variant="outline" />
        </View>
      ) : null}
    </View>
  );
}

const errStyles = StyleSheet.create({
  wrap: {
    padding: spacing.lg,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  title: { fontSize: 14, color: colors.danger, ...font.semibold },
  desc: { fontSize: 13, color: colors.textPrimary, marginTop: 4, lineHeight: 18 },
});

interface StepIndicatorProps {
  steps: Array<string>;
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  const total = steps.length;
  return (
    <View style={stepStyles.wrap}>
      <View style={stepStyles.labelRow}>
        <Text style={stepStyles.step}>
          Step {Math.min(current, total)} of {total}
        </Text>
        <Text style={stepStyles.name}>{steps[Math.min(current, total) - 1]}</Text>
      </View>
      <View style={stepStyles.track}>
        {steps.map((_, idx) => (
          <View
            key={idx}
            style={[
              stepStyles.segment,
              idx < current ? stepStyles.segmentActive : stepStyles.segmentIdle,
              idx === 0 ? { marginLeft: 0 } : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  step: {
    fontSize: 12,
    color: colors.textSecondary,
    ...font.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontSize: 13, color: colors.textPrimary, ...font.semibold },
  track: { flexDirection: 'row' },
  segment: { flex: 1, height: 4, borderRadius: 2, marginLeft: 4 },
  segmentActive: { backgroundColor: colors.primary },
  segmentIdle: { backgroundColor: colors.border },
});

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <View style={statStyles.tile}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
      {hint ? <Text style={statStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  tile: { flex: 1 },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    ...font.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { fontSize: 16, color: colors.textPrimary, ...font.semibold, marginTop: 4 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

export const PrimaryButton = Button;
export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="outline" />;
}
export const FormInput = InputField;
export const StatusBadge = Badge;
export const LoadingState = LoadingScreen;
export const ProgressIndicator = StepIndicator;

export function DocumentUploadCard({
  title,
  uploaded,
  uploading,
  progress,
  disabled,
  editable,
  onUpload,
}: {
  title: string;
  uploaded: boolean;
  uploading: boolean;
  progress: number;
  disabled: boolean;
  editable: boolean;
  onUpload: () => void;
}) {
  return (
    <Card
      style={{
        borderStyle: uploaded ? 'solid' : 'dashed',
        borderColor: uploaded ? colors.border : colors.borderStrong,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Ionicons
          name={uploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
          size={30}
          color={uploaded ? colors.success : colors.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, ...font.semibold }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>
            {uploaded ? 'Document uploaded' : 'PDF, JPG, PNG or WebP · Up to 5 MB'}
          </Text>
        </View>
      </View>
      {uploading && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12, marginBottom: 6 }}>
            {progress}% uploaded
          </Text>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}>
            <View
              style={{
                width: `${progress}%`,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.primary,
              }}
            />
          </View>
        </View>
      )}
      {editable && (
        <SecondaryButton
          title={uploading ? 'Uploading…' : uploaded ? 'Replace document' : 'Choose document'}
          onPress={onUpload}
          loading={uploading}
          disabled={disabled}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
}
