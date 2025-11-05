import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, TextInput, View, Text, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Screen from '@/components/Screen';
import Field from '@/components/TextField';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const passRef = useRef<TextInput>(null);
  const router = useRouter();

  async function onSubmit() {
    if (!email.trim() || !password) {
      return Alert.alert('Missing info', 'Please enter your email and password.');
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);

    if (error) {
      return Alert.alert('Sign in failed', error.message);
    }
      router.replace('/(tabs)');
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="lock-closed" size={40} color="#782F40" />
          <Text style={{ marginTop: 8, fontSize: 22, fontWeight: '700' }}>Sign In</Text>
        </View>

        <Field
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={() => passRef.current?.focus()}
        />

        <Field
          ref={passRef}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
        />

        <Button title={submitting ? 'Signing in…' : 'Sign In'} onPress={onSubmit} disabled={submitting} />

        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Link href="/(auth)/reset" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
