import { useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { pickPhoto } from "@/services/photo";
import {
  AGE_RANGES,
  AVATARS,
  OCCUPATIONS,
  PROTECTIONS,
  SKIN_TYPES,
  SUN_PERIODS,
  SUN_TIMES,
  type AvatarKey,
  type Profile,
} from "@/services/profile";
import { colors } from "@/theme";

// Colores aproximados de los tipos de piel I a VI (escala de Fitzpatrick).
const SKIN_COLORS = ["#F6E0D2", "#EBC6A7", "#D3A07A", "#B07A50", "#7F4F30", "#4A2E1E"];

// Formulario del perfil: casi todo se responde tocando opciones. Sirve para el primer llenado
// y para editarlo (pasando `initial`). La foto nueva se sube al guardar, junto con lo demás.
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Profile;
  submitLabel: string;
  onSubmit: (profile: Profile, newPhotoUri?: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const savedPhoto = useProfile().photo;
  const [draft, setDraft] = useState<Partial<Profile>>(initial ?? {});
  const [newPhotoUri, setNewPhotoUri] = useState<string>(); // foto elegida y aún no guardada
  const [picking, setPicking] = useState(false);
  const lastNameRef = useRef<TextInput>(null); // "Siguiente" en el teclado salta de Nombre a Apellido
  const [showAvatars, setShowAvatars] = useState(false); // la cuadrícula se abre con un botón
  const [showMissing, setShowMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Vista previa: la foto recién elegida, la guardada (si no se quitó) o ninguna.
  const photo = newPhotoUri
    ? { uri: newPhotoUri, key: newPhotoUri }
    : draft.photo_path && savedPhoto?.key === draft.photo_path
      ? savedPhoto
      : null;
  const hasPhoto = !!newPhotoUri || !!draft.photo_path;

  async function choosePhoto(source: "camera" | "library") {
    setPicking(true);
    try {
      const uri = await pickPhoto(source);
      if (uri) setNewPhotoUri(uri);
    } catch (e) {
      const message = (e as Error).message;
      Alert.alert(t.errorTitle, message === "camera_denied" ? t.cameraDenied : message);
    } finally {
      setPicking(false);
    }
  }

  function removePhoto() {
    setNewPhotoUri(undefined);
    set("photo_path", null);
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K] | undefined) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const missing = {
    first_name: !draft.first_name?.trim(),
    last_name: !draft.last_name?.trim(),
    age_range: !draft.age_range,
    occupation: !draft.occupation,
    sun_time: !draft.sun_time,
    sun_period: !draft.sun_period,
    protection: !draft.protection, // [] cuenta como respondida: es "Nada"
    skin_type: !draft.skin_type,
  };
  const show = (key: keyof typeof missing) => showMissing && missing[key];

  function toggleProtection(item: (typeof PROTECTIONS)[number]) {
    const current = draft.protection ?? [];
    const next = current.includes(item) ? current.filter((p) => p !== item) : [...current, item];
    // Al desmarcar la última, la pregunta vuelve a quedar sin responder (no pasa a "Nada").
    set("protection", next.length ? next : undefined);
  }

  async function handleSubmit() {
    if (Object.values(missing).some(Boolean)) {
      setShowMissing(true);
      Alert.alert(t.incompleteTitle, t.incompleteBody);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ ...draft, avatar: draft.avatar ?? null, photo_path: draft.photo_path ?? null } as Profile, newPhotoUri);
    } catch (e) {
      const message = (e as Error).message;
      // Así llega el error de fetch cuando no hay conexión (tanto de la base de datos como de Storage).
      Alert.alert(t.errorTitle, /network request failed/i.test(message) ? t.needInternet : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Question title={t.qAvatar} optional>
        <View style={styles.photoRow}>
          <Avatar
            photo={photo}
            avatar={draft.avatar}
            size={88}
            style={styles.preview}
            fallback={
              picking ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <SymbolView name={{ ios: "person.fill", android: "person" }} tintColor={colors.muted} size={44} />
              )
            }
          />
          <View style={styles.photoButtons}>
            <PhotoButton
              icon={{ ios: "camera", android: "photo_camera" }}
              label={t.takePhoto}
              onPress={() => choosePhoto("camera")}
              disabled={picking}
            />
            <PhotoButton
              icon={{ ios: "photo.on.rectangle", android: "photo_library" }}
              label={t.choosePhoto}
              onPress={() => choosePhoto("library")}
              disabled={picking}
            />
            <PhotoButton
              icon={{ ios: "face.smiling", android: "mood" }}
              label={showAvatars ? t.hideAvatars : t.chooseAvatar}
              onPress={() => setShowAvatars(!showAvatars)}
              expanded={showAvatars}
            />
            {hasPhoto && (
              <Pressable onPress={removePhoto} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.removePhoto}>{t.removePhoto}</Text>
              </Pressable>
            )}
          </View>
        </View>
        {showAvatars && hasPhoto && <Text style={styles.hint}>{t.photoOverAvatar}</Text>}
        {showAvatars && (
          <View style={styles.avatars} accessibilityRole="radiogroup">
            {(Object.keys(AVATARS) as AvatarKey[]).map((a) => {
              const selected = draft.avatar === a;
              return (
                <Pressable
                  key={a}
                  // Elegir uno cierra la cuadrícula; tocar el elegido otra vez lo quita (vuelve a la inicial).
                  onPress={() => {
                    set("avatar", selected ? null : a);
                    if (!selected) setShowAvatars(false);
                  }}
                  style={[styles.avatar, selected && styles.avatarSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.avatarEmoji}>{AVATARS[a]}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Question>

      {/* En la misma fila: al tocar cualquiera de los dos, el teclado no tapa el otro. */}
      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <Question title={t.firstName} missing={show("first_name")}>
            <TextInput
              style={styles.input}
              value={draft.first_name ?? ""}
              onChangeText={(v) => set("first_name", v)}
              autoComplete="given-name"
              autoCapitalize="words"
              maxLength={50}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
          </Question>
        </View>
        <View style={styles.nameField}>
          <Question title={t.lastName} missing={show("last_name")}>
            <TextInput
              ref={lastNameRef}
              style={styles.input}
              value={draft.last_name ?? ""}
              onChangeText={(v) => set("last_name", v)}
              autoComplete="family-name"
              autoCapitalize="words"
              maxLength={50}
              returnKeyType="done"
            />
          </Question>
        </View>
      </View>

      <Question title={t.qAge} missing={show("age_range")}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {AGE_RANGES.map((a) => (
            <Option key={a} label={t.ageRanges[a]} selected={draft.age_range === a} onPress={() => set("age_range", a)} />
          ))}
        </View>
      </Question>

      <Question title={t.qOccupation} missing={show("occupation")}>
        <View style={styles.list} accessibilityRole="radiogroup">
          {OCCUPATIONS.map((o) => (
            <Option
              key={o}
              block
              label={t.occupations[o]}
              selected={draft.occupation === o}
              onPress={() => set("occupation", o)}
            />
          ))}
        </View>
      </Question>

      <Question title={t.qSunTime} hint={t.qSunTimeHint} missing={show("sun_time")}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {SUN_TIMES.map((s) => (
            <Option key={s} label={t.sunTimes[s]} selected={draft.sun_time === s} onPress={() => set("sun_time", s)} />
          ))}
        </View>
      </Question>

      <Question title={t.qSunPeriod} missing={show("sun_period")}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {SUN_PERIODS.map((s) => (
            <Option
              key={s}
              label={t.sunPeriods[s]}
              selected={draft.sun_period === s}
              onPress={() => set("sun_period", s)}
            />
          ))}
        </View>
      </Question>

      <Question title={t.qProtection} hint={t.qProtectionHint} missing={show("protection")}>
        <View style={styles.chips}>
          {PROTECTIONS.map((p) => (
            <Option
              key={p}
              multi
              label={t.protections[p]}
              selected={!!draft.protection?.includes(p)}
              onPress={() => toggleProtection(p)}
            />
          ))}
          <Option
            multi
            label={t.nothing}
            selected={draft.protection?.length === 0}
            onPress={() => set("protection", [])}
          />
        </View>
      </Question>

      <Question title={t.qSkin} missing={show("skin_type")}>
        <View style={styles.list} accessibilityRole="radiogroup">
          {SKIN_TYPES.map((s) => (
            <Option
              key={s}
              block
              swatch={SKIN_COLORS[s - 1]}
              label={t.skinTypes[s - 1]}
              selected={draft.skin_type === s}
              onPress={() => set("skin_type", s)}
            />
          ))}
        </View>
      </Question>

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={busy}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
      </Pressable>
    </View>
  );
}

function PhotoButton({
  icon,
  label,
  onPress,
  disabled,
  expanded,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean; // para el botón que abre/cierra la cuadrícula de avatares
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      style={({ pressed }) => [styles.photoButton, (pressed || disabled) && styles.buttonDisabled]}
    >
      <SymbolView name={icon} tintColor={colors.accent} size={20} />
      <Text style={styles.photoButtonText}>{label}</Text>
    </Pressable>
  );
}

function Question({
  title,
  hint,
  missing,
  children,
  optional,
}: PropsWithChildren<{ title: string; hint?: string; missing?: boolean; optional?: boolean }>) {
  const { t } = useLanguage();
  return (
    <View style={styles.question}>
      <Text style={[styles.title, missing && styles.titleMissing]}>
        {title} {optional ? t.optional : "*"}
      </Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {missing && <Text style={styles.missing}>{t.required}</Text>}
      {children}
    </View>
  );
}

// Una opción tocable. `block`: ocupa todo el ancho (textos largos); si no, es una "pastilla".
function Option({
  label,
  selected,
  onPress,
  multi,
  block,
  swatch,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  block?: boolean;
  swatch?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, block && styles.optionBlock, selected && styles.optionSelected]}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
    >
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <Text style={[styles.optionText, block && styles.optionTextBlock, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 24,
  },
  question: {
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  titleMissing: {
    color: colors.danger,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
  },
  missing: {
    fontSize: 13,
    color: colors.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  preview: {
    backgroundColor: "#E1F0F8",
  },
  photoButtons: {
    flex: 1,
    gap: 8,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  photoButtonText: {
    color: colors.accent,
    fontWeight: "bold",
  },
  removePhoto: {
    color: colors.danger,
    paddingHorizontal: 16,
  },
  avatars: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  avatarSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: "#E1F0F8",
  },
  avatarEmoji: {
    fontSize: 30,
    includeFontPadding: false,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  list: {
    gap: 8,
  },
  option: {
    minHeight: 44, // tamaño mínimo cómodo para tocar
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  optionBlock: {
    borderRadius: 12,
  },
  optionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fff",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
