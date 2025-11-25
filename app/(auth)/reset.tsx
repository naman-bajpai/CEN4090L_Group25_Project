import Button from '@/components/Button';
import Screen from '@/components/Screen';
import Field from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

export default function ResetPassword() {
  const [email, setEmail] = useState('');

  async function onSubmit() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'fsulf://reset'
    });
    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Sent', 'Check your email for the reset link.');
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Button title="Send reset link" onPress={onSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
