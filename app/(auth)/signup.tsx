import { useState } from 'react';
import { Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import Field from '@/components/TextField';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function onSubmit() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) return Alert.alert('Sign up failed', error.message);
    if (data.user) Alert.alert('Verify Email', 'Check your inbox to confirm your address.');
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <Field placeholder="Full name" value={name} onChangeText={setName} />
      <Field placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Create Account" onPress={onSubmit} />
      <Link href="/(auth)/login">Back to sign in</Link>
    </Screen>
  );
}
