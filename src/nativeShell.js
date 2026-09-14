import { isNativeRuntime } from "./appRuntime.js";

export async function bootstrapNativeShell() {
  if (!isNativeRuntime()) return;

  document.documentElement.classList.add("is-native-app");
  document.body.classList.add("is-native-app");

  try {
    const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
    ]);

    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: "#eaf6f3" });
      await StatusBar.setStyle({ style: Style.Dark });
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
