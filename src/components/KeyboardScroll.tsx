import { useEffect, useRef, type PropsWithChildren } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";
import { ui } from "@/theme";

const MARGIN = 24; // espacio libre entre el campo y el teclado

// Pantalla con scroll para formularios bajo una cabecera. Al abrir el teclado:
// 1. KeyboardAvoidingView encoge el formulario hasta el borde del teclado. No sabe que hay una
//    cabecera encima, así que sin `keyboardVerticalOffset` le faltaría justo esa altura.
// 2. Si el campo enfocado quedó debajo de la zona visible, desplaza el formulario hasta mostrarlo
//    (en Android el ScrollView no lo hace solo).
export function KeyboardScroll({
  children,
  contentContainerStyle,
}: PropsWithChildren<{ contentContainerStyle?: StyleProp<ViewStyle> }>) {
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardOpen = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => {
      keyboardOpen.current = true;
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpen.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Se llama cuando el formulario cambia de tamaño, es decir, justo después de encogerse por el teclado.
  // Se compara con el borde de la zona visible y no con la posición que informa el teclado: esa
  // cuenta la barra de estado y los campos no, así que en Android quedaba corta por esa altura.
  function revealFocusedInput() {
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current?.getNativeScrollRef();
    if (!keyboardOpen.current || !input || !scroll) return;
    scroll.measureInWindow((_sx, scrollTop, _sw, scrollHeight) => {
      input.measureInWindow((_x, y, _width, height) => {
        const hidden = y + height + MARGIN - (scrollTop + scrollHeight);
        if (hidden > 0) scrollRef.current?.scrollTo({ y: scrollY.current + hidden, animated: true });
      });
    });
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => (scrollY.current = e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onLayout={revealFocusedInput}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
