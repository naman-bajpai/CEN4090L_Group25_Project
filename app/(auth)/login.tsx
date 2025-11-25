import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passRef = useRef<TextInput>(null);
  const router = useRouter();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  async function onSubmit() {
    if (!email.trim()) {
      return Alert.alert('Missing Info', 'Please enter your email address.');
    }
    if (!validateEmail(email.trim())) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    if (!password) {
      return Alert.alert('Missing Info', 'Please enter your password.');
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.';
        }
        return Alert.alert('Sign In Failed', errorMessage);
      }

      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen noPadding unsafe>
      <LinearGradient colors={["#F8FAFC", "#EEF2FF"]} style={styles.gradient}>
        {/* Soft background accents */}
        <LinearGradient
          colors={["#FEE2E2", "transparent"]}
          style={styles.accentBlobTop}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["#E0E7FF", "transparent"]}
          style={styles.accentBlobBottom}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.logoBadge}>
                  <LinearGradient
                    colors={["#782F40", "#9A3D52"]}
                    style={styles.logoInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="lock-closed" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to FSU Lost & Found</Text>
              </View>

              <View style={styles.form}>
                <Field
                  label="Email"
                  icon="mail-outline"
                  placeholder="you@fsu.edu"
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
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                  rightAccessory={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  }
                />

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => router.push('/(auth)/reset')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                <Button
                  title={submitting ? 'Signing in...' : 'Sign In'}
                  onPress={onSubmit}
                  disabled={submitting}
                />

                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don’t have an account?</Text>
                  <Link href="/(auth)/signup" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signupLink}>Create one</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        </View>
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
  safeContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 0,
    justifyContent: 'flex-start',
  },
  card: {
    // Full-bleed background, with inner gutter to avoid edge hugging
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#782F40',
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 6,
  },
  signupLink: {
    fontSize: 14,
    color: '#782F40',
    fontWeight: '700',
  },
  accentBlobTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.4,
  },
  accentBlobBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.4,
  },
});
