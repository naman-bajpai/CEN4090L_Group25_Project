import { TouchableOpacity, Text } from 'react-native';

export default function Button({
  title, onPress, disabled
}: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#ccc' : '#782F40',
        paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10
      }}>
      <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{title}</Text>
    </TouchableOpacity>
  );
}
