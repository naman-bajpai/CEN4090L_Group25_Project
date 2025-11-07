import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Button from '@/components/Button';
import Screen from '@/components/Screen';
import Field from '@/components/TextField';
import { createProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const router = useRouter();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  async function onSubmit() {
    if (!name.trim()) {
      return Alert.alert('Missing Info', 'Please enter your full name.');
    }
    if (!email.trim()) {
      return Alert.alert('Missing Info', 'Please enter your email address.');
    }
    if (!validateEmail(email.trim())) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    if (!password) {
      return Alert.alert('Missing Info', 'Please enter a password.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Please enter a valid email address.';
        }
        return Alert.alert('Sign Up Failed', errorMessage);
      }

      if (data.user) {
        // Refresh session to ensure it's fully established for RLS policies
        await supabase.auth.refreshSession();
        
        // Create profile in profiles table
        try {
          await createProfile(data.user.id, name.trim());
        } catch (profileError: any) {
          console.error('Failed to create profile:', profileError);
          // If profile creation fails due to RLS, try once more after refreshing session again
          if (profileError?.code === '42501') {
            try {
              await supabase.auth.refreshSession();
              await new Promise(resolve => setTimeout(resolve, 500));
              await createProfile(data.user.id, name.trim());
            } catch (retryError) {
              console.error('Failed to create profile on retry:', retryError);
              // Continue even if profile creation fails - user can create it later in profile screen
            }
          }
        }

        Alert.alert(
          'Account Created',
          'Your account has been created successfully! You can now sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-add" size={32} color="#782F40" />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join the FSU Lost & Found community</Text>
            </View>

            <View style={styles.form}>
              <Field
                label="Full Name"
                icon="person-outline"
                placeholder="Enter your full name"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <Field
                ref={emailRef}
                label="Email Address"
                icon="mail-outline"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
              />

              <View style={styles.passwordContainer}>
                <Field
                  ref={passRef}
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Create a password (min. 6 characters)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordHint}>
                <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                <Text style={styles.passwordHintText}>
                  Password must be at least 6 characters long
                </Text>
              </View>

              <Button
                title={submitting ? 'Creating Account...' : 'Create Account'}
                onPress={onSubmit}
                disabled={submitting}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginLink}>Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 42,
    padding: 8,
    zIndex: 1,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  passwordHintText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 15,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 15,
    color: '#782F40',
    fontWeight: '700',
  },
});
