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
import Page from '@/components/Page';
import Field from '@/components/TextField';
import { createProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Refs for smooth keyboard navigation
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
        if (error.message.includes('already registered') || error.message.includes('unique constraint')) {
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
    <Page pad={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <LinearGradient
                  colors={["#782F40", "#9A3D52"]}
                  style={styles.logoInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person-add" size={24} color="#fff" style={{ marginLeft: 2 }} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join FSU Lost & Found</Text>
            </View>

            {/* Form */}
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

              <Field
                ref={passRef}
                label="Password"
                icon="lock-closed-outline"
                placeholder="Create a password (min. 6 chars)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                rightAccessory={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                }
              />

              {/* Password Hint */}
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

              {/* Toggle to Login */}
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 0,
    justifyContent: 'flex-start',
  },
  content: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
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
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 15,
    color: '#782F40',
    fontWeight: '700',
  },
});
