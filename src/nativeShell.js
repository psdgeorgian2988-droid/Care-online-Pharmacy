import { isNativeRuntime } from "./appRuntime.js";

export async function bootstrapNativeShell() {
  if (!isNativeRuntime()) return;

  document.documentElement.classList.add("is-native-app");

  try {
    const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
    ]);

    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#1a6b7a" });
    } catch {
      /* status bar not available on every device */
    }

    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
        return;
      }
      App.exitApp();
    });

    await SplashScreen.hide();
  } catch {
    /* Capacitor plugins are optional during web-only dev */
  }
}
