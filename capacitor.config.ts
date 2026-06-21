import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for native iOS / Android builds.
 *
 * Strategy: we load the LIVE published Lovable web app inside the native
 * shell (hot-reload model). This means every web update you publish is
 * instantly available inside the installed mobile app — no native rebuild
 * needed for content/UI changes.
 *
 * For an offline-capable / store-shippable production build, switch
 * `server.url` to a bundled static build (see CAPACITOR.md).
 */
const config: CapacitorConfig = {
  appId: "app.lovable.clinicalwebapp",
  appName: "Santé",
  webDir: "dist",
  server: {
    url: "https://clinical-webapp.lovable.app?capacitor=1",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0b3d2e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b3d2e",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
};

export default config;
