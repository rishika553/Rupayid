import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useMyKyc, useAddKycDocument, useSubmitKyc } from '@/hooks/use-customer-data';
import { KYC_DOCUMENT_TYPES, ALLOWED_KYC_MIME, MAX_KYC_FILE_BYTES, isKycEditable } from '@/lib/kyc';
import { ScreenWrapper, Card, Button, Badge, LoadingScreen } from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';

const DOC_LABELS: Record<string, string> = {
  AADHAAR_CARD: 'Aadhaar Card',
  PAN_CARD: 'PAN Card',
};

export default function KycDocumentsScreen() {
  const router = useRouter();
  const { data: kycList, isLoading } = useMyKyc();
  const addDoc = useAddKycDocument();
  const submitKyc = useSubmitKyc();
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
    } catch (e: any) {
      setUploading(null);
      Alert.alert('Upload failed', e.message || 'Could not upload document');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitKyc.mutateAsync();
      Alert.alert('Submitted', 'Your KYC has been submitted for review.');
      router.replace('/(app)/kyc');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit KYC');
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper>
      <Text style={s.title}>Upload Documents</Text>
      <Text style={s.subtitle}>Upload at least one identity document to proceed.</Text>

      {KYC_DOCUMENT_TYPES.map((docType) => {
        const existing = existingDocs.find((d) => d.documentType === docType);
        const isUploading = uploading === docType;
        return (
          <Card key={docType}>
            <View style={s.docRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.docLabel}>{DOC_LABELS[docType] || docType}</Text>
                {existing ? (
                  <Badge text="Uploaded" variant="success" />
                ) : null}
              </View>
              {editable && (
                <Button
                  title={isUploading ? `${progress}%` : existing ? 'Replace' : 'Upload'}
                  variant={existing ? 'outline' : 'primary'}
                  onPress={() => pickAndUpload(docType)}
                  loading={isUploading}
                  disabled={!!uploading}
                  style={{ minHeight: 36, paddingHorizontal: 16, paddingVertical: 8 }}
                />
              )}
            </View>
          </Card>
        );
      })}

      {editable && existingDocs.length > 0 && (
        <View style={s.footer}>
          <Button title="Review & Submit KYC" onPress={handleSubmit} loading={submitKyc.isPending} />
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
