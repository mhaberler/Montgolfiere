import { ref } from "vue";
import {
  ZeroConf,
  type ZeroConfAction,
  type ZeroConfService,
} from "@mhaberler/capacitor-zeroconf-nsd";
import { Capacitor } from "@capacitor/core";
import { preferredBroker } from "./useAppState";
import type { ServiceEntry } from "./useAppState";

const SERVICE_TYPES = ["_mqtt-ws._tcp.", "_mqtt-wss._tcp."];
const isWeb = Capacitor.getPlatform() === "web";

export type ServiceMap = Record<string, ServiceEntry>;

// Singleton state — survives navigation
const services = ref<ServiceMap>({});
const isScanning = ref(false);

function serviceKey(name: string, type: string): string {
  return `${name}.${type}`;
}

function onServiceEvent(
  arg: { action: ZeroConfAction; service: ZeroConfService } | null,
) {
  if (!arg) return;
  const { action, service } = arg;
  if (!service.name || !service.type) return;

  const key = serviceKey(service.name, service.type);

  if (action === "removed") {
    const updated = { ...services.value };
    delete updated[key];
    services.value = updated;
    return;
  }

  if (action === "resolved" && service.port) {
    const ip = service.ipv4Addresses?.[0] || service.hostname || "";
    const entry: ServiceEntry = {
      name: service.name,
      type: service.type,
      host: ip,
      port: service.port,
      domain: service.domain ?? "local.",
      discovered: true,
      resolved: true,
      source: "discovered",
      txtRecord: service.txtRecord as Record<string, string> | undefined,
      ipv4Addresses: service.ipv4Addresses,
      ipv6Addresses: service.ipv6Addresses,
    };
    services.value = { ...services.value, [key]: entry };

    // Keep preferredBroker host/port fresh when this service re-resolves
    const pb = preferredBroker.value;
    if (pb?.discovered && pb.name === service.name) {
      preferredBroker.value = { ...pb, host: ip, port: service.port, resolved: true };
    }
  } else if (action === "added") {
    if (!services.value[key]) {
      services.value = {
        ...services.value,
        [key]: {
          name: service.name,
          type: service.type ?? "",
          host: "",
          port: 0,
          discovered: true,
          resolved: false,
          source: "discovered",
        } as ServiceEntry,
      };
    }
  }
}

async function startScan(): Promise<void> {
  if (isWeb || isScanning.value) return;
  try {
    isScanning.value = true;
    for (const type of SERVICE_TYPES) {
      await ZeroConf.watch({ type, domain: "local." }, onServiceEvent);
    }
  } catch (e) {
    console.error("useMdnsScan: startScan failed", e);
    isScanning.value = false;
  }
}

async function stopScan(): Promise<void> {
  if (isWeb || !isScanning.value) return;
  try {
    for (const type of SERVICE_TYPES) {
      await ZeroConf.unwatch({ type, domain: "local." });
    }
  } catch (e) {
    console.error("useMdnsScan: stopScan failed", e);
  } finally {
    isScanning.value = false;
  }
}

async function restartScan(): Promise<void> {
  await stopScan();
  await startScan();
}

export function useMdnsScan() {
  return { services, isScanning, startScan, stopScan, restartScan };
}
