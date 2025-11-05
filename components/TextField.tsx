import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';

const TextField = forwardRef<TextInput, TextInputProps>((props, ref) => {
  return (
    <View style={styles.container}>
      <TextInput
        ref={ref}
        {...props}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        style={[styles.input, props.style]}
      />
    </View>
  );
});

TextField.displayName = 'TextField';

export default TextField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
