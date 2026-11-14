import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useMyKyc, useAddKycDocument } from '@/hooks/use-customer-data';
import { KYC_DOCUMENT_TYPES, ALLOWED_KYC_MIME, MAX_KYC_FILE_BYTES, isKycEditable } from '@/lib/kyc';
import { errorMessage } from '@/lib/error-message';
import {
  ScreenWrapper,
  Button,
  LoadingScreen,
  DocumentUploadCard,
  StepIndicator,
  ErrorState,
} from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';

const DOC_LABELS: Record<string, string> = {
  AADHAAR_CARD: 'Aadhaar Card',
  PAN_CARD: 'PAN Card',
};

export default function KycDocumentsScreen() {
  const router = useRouter();
  const { data: kycList, isLoading, error, refetch } = useMyKyc();
  const addDoc = useAddKycDocument();
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const application = kycList?.[0];
  const editable = isKycEditable(application?.status);
  const existingDocs = application?.documents ?? [];

  const pickAndUpload = async (docType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_KYC_MIME as unknown as string[],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      if (file.size && file.size > MAX_KYC_FILE_BYTES) {
        Alert.alert('File too large', 'Maximum file size is 5 MB');
        return;
      }
      setUploading(docType);
      setProgress(0);
      await addDoc.mutateAsync({
        localUri: file.uri,
        documentType: docType,
        mimeType: file.mimeType || 'application/octet-stream',
        fileSizeBytes: typeof file.size === 'number' ? file.size : undefined,
        onProgress: setProgress,
      });
      setUploading(null);
    } catch (e) {
      setUploading(null);
      Alert.alert('Upload failed', errorMessage(e, 'Could not upload document'));
    }
  };

  if (isLoading) return <LoadingScreen />;

  if (error)
    return (
      <ScreenWrapper>
        <ErrorState message="We couldn't load your documents." onRetry={() => void refetch()} />
      </ScreenWrapper>
    );

  return (
    <ScreenWrapper>
      <StepIndicator
        steps={['Personal', 'Address', 'Identity', 'Bank', 'Documents', 'Review']}
        current={5}
      />
      <Text style={s.title}>Upload Documents</Text>
      <Text style={s.subtitle}>Upload at least one identity document to proceed.</Text>

      {KYC_DOCUMENT_TYPES.map((docType) => {
        const existing = existingDocs.find((d) => d.documentType === docType);
        const isUploading = uploading === docType;
        return (
          <DocumentUploadCard
            key={docType}
            title={DOC_LABELS[docType] || docType}
            uploaded={!!existing}
            uploading={isUploading}
            progress={progress}
            disabled={!!uploading}
            editable={editable}
            onUpload={() => void pickAndUpload(docType)}
          />
        );
      })}

      {editable && existingDocs.length > 0 && (
        <View style={s.footer}>
          <Button
            title="Review & Submit KYC"
            onPress={() => router.push('/(app)/kyc/review')}
            disabled={!!uploading}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, color: colors.textPrimary, ...font.bold, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docLabel: { fontSize: 14, color: colors.textPrimary, ...font.medium, marginBottom: 4 },
  footer: { marginTop: spacing.xl },
});
