/**
 * Identidade visual e componentes reutilizados por todas as telas do app:
 * paleta de cores (C), estilos comuns (styles) e os componentes Loading,
 * Field (rótulo + campo de texto) e Button.
 */
import { StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';

export const C = {
  green: '#1F7A4F',
  dark: '#16352A',
  light: '#EAF7EF',
  bg: '#F6F8F7',
  white: '#FFFFFF',
  muted: '#6B7B73',
  border: '#DCE5E0',
  danger: '#B33A3A',
  orange: '#B86B1D',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: C.dark, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, marginBottom: 18 },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 7 },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.dark,
    marginBottom: 13,
  },
  button: {
    backgroundColor: C.green,
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { color: C.white, fontWeight: '800', fontSize: 15 },
  secondary: {
    backgroundColor: C.light,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryText: { color: C.green, fontWeight: '800' },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.light,
    alignSelf: 'flex-start',
  },
  pillText: { color: C.green, fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  small: { fontSize: 12, color: C.muted },
  error: { color: C.danger, fontSize: 13, marginBottom: 10 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
});

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.green} />
    </View>
  );
}

// As demais props (value, onChangeText, secureTextEntry...) são repassadas
// diretamente ao TextInput.
export function Field({ label, ...props }: any) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#98A59F" style={styles.input} {...props} />
    </View>
  );
}

// disabled bloqueia o toque e deixa o botão semitransparente. As telas usam
// isso com o estado "busy" para impedir envios duplicados enquanto a
// requisição está em andamento.
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[secondary ? styles.secondary : styles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={secondary ? styles.secondaryText : styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
