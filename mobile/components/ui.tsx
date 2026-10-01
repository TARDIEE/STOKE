// Shared UI ported from web components/study/shared.tsx + globals.css (.card, .btn-primary).
import React from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { fmtDur } from "../lib/study-logic";
import { useStore } from "../lib/store";
import { urgency, type Palette } from "../lib/theme";

export function Card({ p, children, style }: { p: Palette; children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: p.card,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 1px 2px rgba(24,24,27,.04), 0 8px 24px -16px rgba(124,58,237,.18)",
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PBtn({ p, title, onPress }: { p: Palette; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

export function LinkBtn({ title, onPress, color = "#7C3AED" }: { title: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={{ color, fontWeight: "700", fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

export function StatCard({ p, label, value, sub, actionLabel, onAction }: {
  p: Palette; label: string; value: string; sub: string; actionLabel: string; onAction: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: p.card, borderColor: p.border, borderWidth: 1, borderRadius: 16, padding: 12 }}>
      <Text style={{ fontSize: 11, color: p.ink2 }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: p.ink, marginTop: 2, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontSize: 11, color: p.ink2 }}>{sub}</Text>
      <Pressable onPress={onAction} style={{ marginTop: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#7C3AED" }}>{actionLabel} →</Text>
      </Pressable>
    </View>
  );
}

export function MiniStat({ p, n, label }: { p: Palette; n: number | string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: p.card, borderColor: p.border, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: p.ink, fontVariant: ["tabular-nums"] }}>{n}</Text>
      <Text style={{ fontSize: 11, color: p.ink2, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

export function Empty({ p, title, body, actionLabel, onAction }: {
  p: Palette; title: string; body: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={{ paddingVertical: 28, alignItems: "center", gap: 4 }}>
      <Text style={{ fontWeight: "700", color: p.ink }}>{title}</Text>
      <Text style={{ fontSize: 13, color: p.ink2, textAlign: "center" }}>{body}</Text>
      {actionLabel && onAction && (
        <View style={{ marginTop: 8 }}>
          <PBtn p={p} title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />;
}

export function UrgencyBadge({ n }: { n: number }) {
  const u = urgency(n);
  return (
    <View style={{ backgroundColor: u.color + "1a", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: u.color }}>{u.label}</Text>
    </View>
  );
}

export function SessionRow({ p, sid, cid, text, date, label }: {
  p: Palette; sid: string | null; cid: string | null; text: string; date: number; label?: "learn" | "reread";
}) {
  const { subjects, chapters } = useStore();
  const s = subjects.find((x) => x.id === sid);
  const c = chapters.find((x) => x.id === cid);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {s && <Dot color={s.color} />}
      <Text style={{ fontWeight: "500", color: p.ink, flex: 1 }} numberOfLines={1}>
        {s?.name ?? "General"}
        {c ? <Text style={{ color: p.ink2 }}> · {c.name}</Text> : null}
      </Text>
      {label === "reread" && (
        <View style={{ backgroundColor: "#F59E0B1a", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#F59E0B" }}>Re-read</Text>
        </View>
      )}
      <Text style={{ fontSize: 12, color: p.ink2 }}>
        {text} · {new Date(date).toLocaleDateString()}
      </Text>
    </View>
  );
}

export function Bar({ p, pct, color = "linear-gradient(90deg,#7C3AED,#A78BFA)", height = 8 }: {
  p: Palette; pct: number; color?: string; height?: number;
}) {
  // RN has no CSS gradients — use solid primary; web parity for shape/percent.
  const solid = color.startsWith("#") ? color : p.primary;
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: p.border, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: solid, borderRadius: 999 }} />
    </View>
  );
}

export function Field({ p, label, value, onChange, placeholder, multiline }: {
  p: Palette; label?: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: "600", color: p.ink }}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.ink2}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: p.border,
          backgroundColor: p.bg,
          color: p.ink,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
        }}
      />
    </View>
  );
}

export function Sheet({ p, visible, onClose, title, children }: {
  p: Palette; visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,10,31,.45)", justifyContent: "center", padding: 20 }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: p.card, borderRadius: 16, padding: 20, gap: 12 }}>
          <Text style={{ fontWeight: "800", fontSize: 16, color: p.ink }}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function StatGrid({ p, items }: { p: Palette; items: { label: string; value: string; sub: string }[] }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: p.ink2, fontSize: 13, flex: 1 }}>{it.label}</Text>
          <Text style={{ color: p.ink, fontWeight: "700", fontSize: 13 }}>
            {it.value} <Text style={{ color: p.ink2, fontWeight: "400" }}>{it.sub}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

export { fmtDur };
