import { buildDemoDriftScan } from "@/lib/mobile-scan";
import { Text, View } from "react-native";

export default function MobileScanScreen() {
  const scan = buildDemoDriftScan();

  return (
    <View
      style={{
        flex: 1,
        gap: 16,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0f172a"
      }}
    >
      <Text style={{ color: "#f8fafc", fontSize: 32, fontWeight: "700" }}>Drift</Text>
      <Text style={{ color: "#cbd5e1", fontSize: 16 }}>
        Offline-first lifestyle drift scan
      </Text>
      <View
        style={{
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#334155",
          padding: 16,
          backgroundColor: "#111827"
        }}
      >
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>Drift Score</Text>
        <Text style={{ color: "#f8fafc", fontSize: 44, fontWeight: "700" }}>
          {scan.scoreLabel}
        </Text>
        <Text style={{ color: "#cbd5e1", marginTop: 8 }}>
          {scan.monthlyOverspendLabel} monthly overspend detected locally.
        </Text>
      </View>
    </View>
  );
}
