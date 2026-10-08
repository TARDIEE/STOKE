// Stoke mobile shell — renders the REAL Stoke web app (same UI, same flows,
// same logo) inside a native WebView. No re-implementation, so nothing can drift.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";

const FALLBACK_URL = "http://192.168.18.111:3000";

function webAppUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return typeof extra["webAppUrl"] === "string" && extra["webAppUrl"] ? (extra["webAppUrl"] as string) : FALLBACK_URL;
}

export default function Home() {
  const uri = webAppUrl();
  const webview = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  // Splash shows only for the initial launch — never flashes between pages.
  const booted = useRef(false);
  const isDevUrl = uri.includes("192.168.") || uri.includes("localhost");

  // Android back: walk the app's section history instead of exiting.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webview.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const reload = useCallback(() => {
    setFailed(false);
    setLoading(true);
    webview.current?.reload();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f7f5f1" }}>
        <Image source={require("../assets/logo.jpeg")} style={{ width: 96, height: 96, borderRadius: 24 }} />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "800" }}>Stoke</Text>
        <Text style={{ marginTop: 8, color: "#71717a", textAlign: "center" }}>
          This shell wraps the Stoke web app for Android/iOS. Open it in Expo Go, or visit the site directly:
        </Text>
        <Text style={{ marginTop: 8, color: "#7c3aed", fontWeight: "700" }}>{uri}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#7c3aed" }} edges={["top", "left", "right"]}>
      <WebView
        ref={webview}
        source={{ uri }}
        style={{ flex: 1 }}
        startInLoadingState={false}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
        onNavigationStateChange={(ns) => setCanGoBack(ns.canGoBack)}
        onLoadStart={() => {
          setLoading(true);
          setFailed(false);
        }}
        onLoadEnd={() => {
          setLoading(false);
          setRefreshing(false);
          booted.current = true;
        }}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        onHttpError={() => {
          setLoading(false);
          setFailed(true);
        }}
        renderLoading={() => <View />}
      />

      {loading && !failed && !booted.current && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Image source={require("../assets/logo.jpeg")} style={{ width: 112, height: 112, borderRadius: 28 }} />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>Stoke</Text>
          <Text style={{ color: "rgba(255,255,255,.8)", fontSize: 13 }}>Study, Remember, Focus</Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 8 }} />
        </View>
      )}

      {failed && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#f7f5f1", alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Image source={require("../assets/logo.jpeg")} style={{ width: 80, height: 80, borderRadius: 20 }} />
          <Text style={{ fontSize: 18, fontWeight: "800", marginTop: 8 }}>Couldn't reach Stoke</Text>
          <Text style={{ color: "#71717a", textAlign: "center", fontSize: 13 }}>
            {isDevUrl
              ? `Start the web app first:\n\`npm run dev\` in the Stoke folder,\nthen make sure this phone is on the same Wi-Fi.\nTrying: ${uri}`
              : `Check your connection and try again.\nThe server may be waking up — give it a minute.\nTrying: ${uri}`}
          </Text>
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} />}>
            <Pressable onPress={reload} style={{ marginTop: 12, backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Try again</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
