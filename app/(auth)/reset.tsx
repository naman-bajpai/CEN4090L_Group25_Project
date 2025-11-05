import { useState } from 'react';
import { Alert } from 'react-native';
import Screen from '@/components/Screen';
import Field from '@/components/TextField';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

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
      <Field placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Button title="Send reset link" onPress={onSubmit} />
    </Screen>
  );
}
