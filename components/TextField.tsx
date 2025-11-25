import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightAccessory?: ReactNode;
}

const TextField = forwardRef<TextInput, TextFieldProps>(({ label, icon, rightAccessory, style, ...props }, ref) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color="#666"
            style={styles.icon}
          />
        )}
        <TextInput
          ref={ref}
          {...props}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          placeholderTextColor="#999"
          style={[styles.input, icon && styles.inputWithIcon, style]}
        />
        {rightAccessory ? (
          <View style={styles.rightAccessory}>
            {rightAccessory}
          </View>
        ) : null}
      </View>
    </View>
  );
});

TextField.displayName = 'TextField';

export default TextField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  rightAccessory: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
  },
});
