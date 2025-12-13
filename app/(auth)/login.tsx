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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Assuming these components exist based on your provided code
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import Field from '@/components/TextField';
import { checkIsAdmin } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passRef = useRef<TextInput>(null);
  const router = useRouter();

  async function onSubmit() {
    if (!email.trim() || !password) {
      return Alert.alert('Missing Info', 'Please enter both email and password.');
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Sign In Failed', error.message);
      } else {
        // Check if user is admin and redirect accordingly
        try {
          const isAdmin = await checkIsAdmin();
          if (isAdmin) {
            router.replace('/(tabs)/admin/overview');
          } else {
            router.replace('/(tabs)/home');
          }
        } catch (adminError) {
          // If admin check fails, default to home
          router.replace('/(tabs)/home');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen noPadding unsafe>
      <LinearGradient colors={['#F8FAFC', '#EEF2FF']} style={styles.gradient}>
        {/* Background Accents */}
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
              <View style={styles.content}>
                {/* Header Section */}
                <View style={styles.header}>
                  <View style={styles.logoBadge}>
                    <LinearGradient
                      colors={["#782F40", "#9A3D52"]}
                      style={styles.logoInner}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="log-in" size={24} color="#fff" style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.title}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                {/* Form Section */}
                <View style={styles.form}>
                  <Field
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
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    rightAccessory={
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
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

                  {/* Forgot Password Link */}
                  <View style={styles.forgotContainer}>
                    <Link href="/(auth)/reset" asChild>
                        <TouchableOpacity>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </Link>
                  </View>

                  <Button
                    title={submitting ? 'Signing In...' : 'Sign In'}
                    onPress={onSubmit}
                    disabled={submitting}
                  />

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Toggle to Signup */}
                  <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <Link href="/(auth)/signup" asChild>
                      <TouchableOpacity>
                        <Text style={styles.footerLink}>Sign Up</Text>
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
    justifyContent: 'center', // Centered vertically for login looks better
    minHeight: '100%',
  },
  content: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
    color: '#782F40', // Garnet
    fontWeight: '600',
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
