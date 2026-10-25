import {
  BufferbloatGrade,
  CrossLayerSyncStatus,
  FailoverBenchmarkResult,
  LinkStatus,
  LinksysDevice,
  LinksysTopologyMode,
  LoadBalancingConfig,
  LoadBalancingMode,
  NetwatchTarget,
  NetworkEvent,
  PccConnection,
  QoSEvaluation,
  RtcRegisterMap,
  RtcSubsystem,
  RouteEntry,
  RouterApiConfig,
  RouterApiLog,
  RouterResource,
  TelegramAlertConfig,
  TelemetryPoint,
  TiphonCategory,
  TopologyArchitectureConfig,
  TrafficCategoryStat,
  UbusCallResult,
  WanId,
  WanInterface,
  WanTargetProbe,
  WifiRadio,
  WifiScanResult
} from '../types/network';
import { evaluateQoS } from '../utils/tiphonCalculator';

// Helper: Calculate ITU-T G.107 E-Model MOS (1.0 to 4.5)
function computeMOS(latencyMs: number, jitterMs: number, lossPct: number, isDown: boolean): number {
  if (isDown) return 1.0;
  const effectiveLatency = latencyMs + (2 * jitterMs);
  let delayImpairment = 0;
  if (effectiveLatency < 150) {
    delayImpairment = effectiveLatency / 40;
  } else {
    delayImpairment = (effectiveLatency - 110) / 10;
  }
  const lossImpairment = lossPct * 2.8;
  const R = Math.max(0, Math.min(100, 94.2 - delayImpairment - lossImpairment));
  if (R < 0) return 1.0;
  if (R > 100) return 4.5;
  const mos = 1 + (0.035 * R) + (R * (R - 60) * (100 - R) * 0.000007);
  return Number(Math.max(1.0, Math.min(4.5, mos)).toFixed(2));
}

// Helper: Determine Bufferbloat grade
function computeBufferbloatGrade(latencyMs: number, jitterMs: number, baseLatency: number, isDown: boolean): BufferbloatGrade {
  if (isDown) return 'F';
  const delta = latencyMs - baseLatency + (jitterMs * 1.2);
  if (delta < 5) return 'A+';
  if (delta < 15) return 'A';
  if (delta < 30) return 'B';
  if (delta < 60) return 'C';
  if (delta < 100) return 'D';
  return 'F';
}

// Helper: Compute composite Health Score (0 - 100%)
function computeHealthScore(wan: { status: LinkStatus; latencyMs: number; jitterMs: number; packetLossPct: number; currentRxMbps: number; maxBandwidthMbps: number }): number {
  if (wan.status === 'down') return 0;
  let score = 100;
  if (wan.latencyMs > 200) score -= 45;
  else if (wan.latencyMs > 100) score -= 25;
  else if (wan.latencyMs > 50) score -= 10;

  if (wan.jitterMs > 20) score -= 20;
  else if (wan.jitterMs > 10) score -= 10;
  else if (wan.jitterMs > 5) score -= 4;

  score -= Math.min(40, wan.packetLossPct * 5);

  const utilization = (wan.currentRxMbps / wan.maxBandwidthMbps) * 100;
  if (utilization > 90) score -= 10;

  return Math.max(10, Math.min(100, Math.round(score)));
}

const INITIAL_WANS: WanInterface[] = [
  {
    id: 'ether1-wan1',
    name: 'WAN 1 - IndiHome Fiber',
    isp: 'PT Telkom Indonesia (Fiber 100M)',
    interfaceName: 'ether1',
    role: 'primary',
    status: 'active',
    ipAddress: '192.168.1.102',
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    distance: 1,
    pccWeight: 2,
    maxBandwidthMbps: 100,
    currentRxMbps: 48.5,
    currentTxMbps: 12.3,
    peakRxMbps: 72.1,
    peakTxMbps: 24.6,
    latencyMs: 14,
    jitterMs: 3.2,
    packetLossPct: 0.0,
    totalRxBytes: 14200000000,
    totalTxBytes: 3100000000,
    uptimeSeconds: 864200,
    failoverCount: 0,
    healthScore: 98,
    mosScore: 4.41,
    bufferbloatGrade: 'A+',
    mtu: 1500,
    droppedPackets: { rx: 14, tx: 3 },
    switchoverLatencyMs: 410,
    targetProbes: [
      { target: '1.1.1.1', name: 'Cloudflare Edge', latencyMs: 12, jitterMs: 2.8, lossPct: 0.0, status: 'ok' },
      { target: '8.8.8.8', name: 'Google DNS Core', latencyMs: 14, jitterMs: 3.2, lossPct: 0.0, status: 'ok' },
      { target: '208.67.222.222', name: 'OpenDNS Anycast', latencyMs: 18, jitterMs: 4.1, lossPct: 0.0, status: 'ok' }
    ],
    history: []
  },
  {
    id: 'ether2-wan2',
    name: 'WAN 2 - Biznet Dedicated',
    isp: 'Biznet Networks (Metro 50M)',
    interfaceName: 'ether2',
    role: 'secondary',
    status: 'active',
    ipAddress: '192.168.2.55',
    subnetMask: '255.255.255.0',
    gateway: '192.168.2.1',
    dnsServers: ['1.1.1.1', '1.0.0.1'],
    distance: 2,
    pccWeight: 1,
    maxBandwidthMbps: 50,
    currentRxMbps: 22.8,
    currentTxMbps: 6.7,
    peakRxMbps: 38.4,
    peakTxMbps: 14.1,
    latencyMs: 19,
    jitterMs: 4.8,
    packetLossPct: 0.0,
    totalRxBytes: 7400000000,
    totalTxBytes: 1800000000,
    uptimeSeconds: 864200,
    failoverCount: 0,
    healthScore: 95,
    mosScore: 4.34,
    bufferbloatGrade: 'A',
    mtu: 1500,
    droppedPackets: { rx: 8, tx: 2 },
    switchoverLatencyMs: 620,
    targetProbes: [
      { target: '1.1.1.1', name: 'Cloudflare Edge', latencyMs: 16, jitterMs: 3.9, lossPct: 0.0, status: 'ok' },
      { target: '8.8.8.8', name: 'Google DNS Core', latencyMs: 19, jitterMs: 4.8, lossPct: 0.0, status: 'ok' },
      { target: '208.67.222.222', name: 'OpenDNS Anycast', latencyMs: 24, jitterMs: 5.6, lossPct: 0.0, status: 'ok' }
    ],
    history: []
  },
  {
    id: 'ether3-wan3',
    name: 'WAN 3 - Telkomsel Orbit 4G',
    isp: 'Telkomsel Seluler (LTE / Backup 30M)',
    interfaceName: 'ether3',
    role: 'failover',
    status: 'standby',
    ipAddress: '192.168.8.20',
    subnetMask: '255.255.255.0',
    gateway: '192.168.8.1',
    dnsServers: ['208.67.222.222', '208.67.220.220'],
    distance: 3,
    pccWeight: 1,
    maxBandwidthMbps: 30,
    currentRxMbps: 3.2,
    currentTxMbps: 0.9,
    peakRxMbps: 18.2,
    peakTxMbps: 5.6,
    latencyMs: 38,
    jitterMs: 9.4,
    packetLossPct: 0.2,
    totalRxBytes: 1100000000,
    totalTxBytes: 320000000,
    uptimeSeconds: 864200,
    failoverCount: 0,
    healthScore: 84,
    mosScore: 3.98,
    bufferbloatGrade: 'B',
    mtu: 1420,
    droppedPackets: { rx: 42, tx: 18 },
    switchoverLatencyMs: 840,
    targetProbes: [
      { target: '1.1.1.1', name: 'Cloudflare Edge', latencyMs: 36, jitterMs: 8.5, lossPct: 0.0, status: 'ok' },
      { target: '8.8.8.8', name: 'Google DNS Core', latencyMs: 38, jitterMs: 9.4, lossPct: 0.2, status: 'ok' },
      { target: '208.67.222.222', name: 'OpenDNS Anycast', latencyMs: 44, jitterMs: 11.2, lossPct: 0.4, status: 'ok' }
    ],
    history: []
  }
];

const INITIAL_ROUTER: RouterResource = {
  model: 'MikroTik CCR2004-1G-12S+2XS',
  platform: 'MikroTik RouterOS',
  version: 'v7.14.3 (stable)',
  cpuLoadPct: 18,
  cpuFrequencyMhz: 1700,
  cpuCount: 4,
  totalMemoryMb: 4096,
  freeMemoryMb: 3412,
  totalHddMb: 128,
  freeHddMb: 94,
  boardTempC: 41,
  voltageV: 24.2,
  uptimeString: '10d 02h 45m 18s',
  architecture: 'ARM64'
};

const INITIAL_ROUTES: RouteEntry[] = [
  {
    id: '*0',
    dstAddress: '0.0.0.0/0',
    gateway: '192.168.1.1',
    interfaceId: 'ether1-wan1',
    distance: 1,
    routingMark: 'to_WAN1_PCC',
    active: true,
    dynamic: false,
    comment: 'PCC Group 1 - Primary Fiber'
  },
  {
    id: '*1',
    dstAddress: '0.0.0.0/0',
    gateway: '192.168.2.1',
    interfaceId: 'ether2-wan2',
    distance: 2,
    routingMark: 'to_WAN2_PCC',
    active: true,
    dynamic: false,
    comment: 'PCC Group 2 - Secondary Fiber'
  },
  {
    id: '*2',
    dstAddress: '0.0.0.0/0',
    gateway: '192.168.8.1',
    interfaceId: 'ether3-wan3',
    distance: 3,
    routingMark: 'to_WAN3_Backup',
    active: false,
    dynamic: false,
    comment: 'Recursive Route Failover - LTE Orbit'
  }
];

const INITIAL_LINKSYS_DEVICES: LinksysDevice[] = [
  {
    id: 'linksys-wrt1900acs-gw',
    name: 'Linksys WRT1900ACS - Node Gateway Utama',
    model: 'Linksys WRT1900ACS v2 (Dual-Band Gigabit)',
    hostname: 'OpenWrt-Linksys-Gateway',
    openwrtVersion: 'OpenWrt 23.05.3 r23809-234f1a2efa',
    kernelVersion: 'Linux 5.15.150 (armv7l)',
    target: 'mvebu/cortexa9 (Linksys Shelby)',
    soc: 'Marvell Armada 385 (88F6820) Dual-Core @ 1.6 GHz',
    memoryTotalMb: 512,
    memoryFreeMb: 378,
    flashSizeMb: 128,
    cpuTempC: 52,
    i2cBus: 'i2c-0 (SoC I2C-1 Controller @ 0xf1011000)',
    lanIp: '192.168.1.1',
    macAddress: '60:38:E0:A1:4B:01',
    location: 'Server Rack Utama (Gedung Komputer Lt. 1)',
    status: 'online',
    powerState: 'on',
    remoteSshPort: 22,
    remoteHttpPort: 80,
    uptime: '4d 18h 32m 14s',
    rtc: {
      installed: true,
      chipModel: 'Maxim DS3231 (Extremely Accurate I2C RTC with TCXO)',
      devicePath: '/dev/rtc0',
      i2cAddress: '0x68',
      driverModule: 'rtc-ds1307 (Linux RTC subsystem driver)',
      batteryVoltage: 3.06,
      batteryStatus: 'Good',
      hardwareTimeEpoch: Date.now(),
      hardwareTimeString: new Date().toISOString().replace('T', ' ').substring(0, 19),
      systemTimeEpoch: Date.now(),
      systemTimeString: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ntpSyncStatus: 'synced',
      ntpServer: '0.id.pool.ntp.org',
      timeDriftPpm: 0.8,
      rtcTempC: 28.5,
      powerLossFlag: false,
      lastHwclockSync: new Date().toLocaleTimeString('id-ID'),
      isSimulated1970Bug: false
    },
    wireless: {
      wifiMasterEnabled: true,
      radios: [
        {
          id: 'radio0',
          band: '2.4GHz',
          interfaceName: 'wlan0',
          enabled: true,
          ssid: 'OpenWrt-Linksys-2.4G',
          channel: 6,
          frequencyMhz: 2437,
          widthMhz: 20,
          txPowerDbm: 20,
          encryption: 'WPA2-PSK (AES)',
          bssid: '60:38:E0:A1:4B:02',
          connectedClients: [
            {
              hostname: 'Laptop-Lab-01',
              ip: '192.168.1.115',
              mac: 'A4:C3:F0:88:1A:42',
              signalDbm: -54,
              rxRateMbps: 144.4,
              txRateMbps: 144.4,
              connectedTime: '03:42:18'
            },
            {
              hostname: 'ESP32-RTC-SensorNode',
              ip: '192.168.1.189',
              mac: 'DC:54:75:A8:92:E1',
              signalDbm: -68,
              rxRateMbps: 72.2,
              txRateMbps: 72.2,
              connectedTime: '08:14:02'
            }
          ]
        },
        {
          id: 'radio1',
          band: '5GHz',
          interfaceName: 'wlan1',
          enabled: true,
          ssid: 'OpenWrt-Linksys-5G-HighSpeed',
          channel: 36,
          frequencyMhz: 5180,
          widthMhz: 80,
          txPowerDbm: 23,
          encryption: 'WPA3-SAE / WPA2-PSK Mixed',
          bssid: '60:38:E0:A1:4B:03',
          connectedClients: [
            {
              hostname: 'MacBook-Pro-Admin',
              ip: '192.168.1.104',
              mac: 'F0:18:98:C2:5E:8B',
              signalDbm: -48,
              rxRateMbps: 866.7,
              txRateMbps: 866.7,
              connectedTime: '01:19:45'
            },
            {
              hostname: 'Galaxy-Tab-S8',
              ip: '192.168.1.140',
              mac: '3C:01:EF:92:14:73',
              signalDbm: -59,
              rxRateMbps: 433.3,
              txRateMbps: 585.0,
              connectedTime: '00:45:20'
            }
          ]
        }
      ]
    }
  },
  {
    id: 'linksys-wrt3200acm-lab',
    name: 'Linksys WRT3200ACM - Lab Jaringan Komputer',
    model: 'Linksys WRT3200ACM (MU-MIMO Gigabit)',
    hostname: 'OpenWrt-WRT3200-Lab',
    openwrtVersion: 'OpenWrt 23.05.3 r23809-234f1a2efa',
    kernelVersion: 'Linux 5.15.150 (armv7l)',
    target: 'mvebu/cortexa9 (Linksys Rango)',
    soc: 'Marvell Armada 388 (88F6828) Dual-Core @ 1.8 GHz',
    memoryTotalMb: 512,
    memoryFreeMb: 395,
    flashSizeMb: 256,
    cpuTempC: 49,
    i2cBus: 'i2c-0 (Armada 388 I2C bus)',
    lanIp: '192.168.1.2',
    macAddress: '60:38:E0:B2:7C:12',
    location: 'Lab Jaringan Komputer & IoT Lt. 2',
    status: 'online',
    powerState: 'on',
    remoteSshPort: 22,
    remoteHttpPort: 80,
    uptime: '2d 06h 15m 02s',
    rtc: {
      installed: true,
      chipModel: 'NXP PCF8563 (Low-Power CMOS Real-Time Clock)',
      devicePath: '/dev/rtc0',
      i2cAddress: '0x51',
      driverModule: 'rtc-pcf8563 (Linux RTC driver)',
      batteryVoltage: 2.98,
      batteryStatus: 'Good',
      hardwareTimeEpoch: Date.now(),
      hardwareTimeString: new Date().toISOString().replace('T', ' ').substring(0, 19),
      systemTimeEpoch: Date.now(),
      systemTimeString: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ntpSyncStatus: 'synced',
      ntpServer: '1.id.pool.ntp.org',
      timeDriftPpm: 2.5,
      rtcTempC: 27.2,
      powerLossFlag: false,
      lastHwclockSync: new Date().toLocaleTimeString('id-ID'),
      isSimulated1970Bug: false
    },
    wireless: {
      wifiMasterEnabled: true,
      radios: [
        {
          id: 'radio0',
          band: '2.4GHz',
          interfaceName: 'wlan0',
          enabled: true,
          ssid: 'OpenWrt-Lab-IoT-2.4G',
          channel: 1,
          frequencyMhz: 2412,
          widthMhz: 20,
          txPowerDbm: 20,
          encryption: 'WPA2-PSK (AES)',
          bssid: '60:38:E0:B2:7C:13',
          connectedClients: [
            {
              hostname: 'RaspberryPi4-Node',
              ip: '192.168.1.150',
              mac: 'B8:27:EB:44:91:2B',
              signalDbm: -51,
              rxRateMbps: 72.2,
              txRateMbps: 72.2,
              connectedTime: '05:12:00'
            }
          ]
        },
        {
          id: 'radio1',
          band: '5GHz',
          interfaceName: 'wlan1',
          enabled: true,
          ssid: 'OpenWrt-Lab-MIMO-5G',
          channel: 149,
          frequencyMhz: 5745,
          widthMhz: 160,
          txPowerDbm: 25,
          encryption: 'WPA3-SAE',
          bssid: '60:38:E0:B2:7C:14',
          connectedClients: [
            {
              hostname: 'ThinkPad-T14-Admin',
              ip: '192.168.1.102',
              mac: '48:2A:E3:77:88:C1',
              signalDbm: -42,
              rxRateMbps: 1201.0,
              txRateMbps: 1201.0,
              connectedTime: '02:04:15'
            }
          ]
        }
      ]
    }
  },
  {
    id: 'linksys-wrt1200ac-edge',
    name: 'Linksys WRT1200AC - Edge Node Cadangan',
    model: 'Linksys WRT1200AC v1 (Dual-Band Gigabit)',
    hostname: 'OpenWrt-WRT1200-Edge',
    openwrtVersion: 'OpenWrt 22.03.5 r20134-5f15225c1e',
    kernelVersion: 'Linux 5.10.176 (armv7l)',
    target: 'mvebu/cortexa9 (Linksys Caiman)',
    soc: 'Marvell Armada 385 Dual-Core @ 1.33 GHz',
    memoryTotalMb: 512,
    memoryFreeMb: 410,
    flashSizeMb: 128,
    cpuTempC: 46,
    i2cBus: 'i2c-0 (Armada 385 I2C bus)',
    lanIp: '192.168.1.3',
    macAddress: '60:38:E0:C3:9D:33',
    location: 'Ruang NOC & Riset Jaringan',
    status: 'online',
    powerState: 'on',
    remoteSshPort: 22,
    remoteHttpPort: 80,
    uptime: '1d 12h 44m 30s',
    rtc: {
      installed: true,
      chipModel: 'Dallas DS1307 (Standard Serial I2C RTC)',
      devicePath: '/dev/rtc0',
      i2cAddress: '0x68',
      driverModule: 'rtc-ds1307 (Linux RTC driver)',
      batteryVoltage: 2.75,
      batteryStatus: 'Low',
      hardwareTimeEpoch: Date.now(),
      hardwareTimeString: new Date().toISOString().replace('T', ' ').substring(0, 19),
      systemTimeEpoch: Date.now(),
      systemTimeString: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ntpSyncStatus: 'synced',
      ntpServer: '2.id.pool.ntp.org',
      timeDriftPpm: 12.0,
      rtcTempC: 26.0,
      powerLossFlag: false,
      lastHwclockSync: new Date().toLocaleTimeString('id-ID'),
      isSimulated1970Bug: false
    },
    wireless: {
      wifiMasterEnabled: true,
      radios: [
        {
          id: 'radio0',
          band: '2.4GHz',
          interfaceName: 'wlan0',
          enabled: true,
          ssid: 'OpenWrt-Edge-2.4G',
          channel: 11,
          frequencyMhz: 2462,
          widthMhz: 20,
          txPowerDbm: 18,
          encryption: 'WPA2-PSK (AES)',
          bssid: '60:38:E0:C3:9D:34',
          connectedClients: [
            {
              hostname: 'Printer-Network-Lab',
              ip: '192.168.1.180',
              mac: '00:1E:C2:99:A1:B2',
              signalDbm: -63,
              rxRateMbps: 54.0,
              txRateMbps: 54.0,
              connectedTime: '12:30:10'
            }
          ]
        },
        {
          id: 'radio1',
          band: '5GHz',
          interfaceName: 'wlan1',
          enabled: false,
          ssid: 'OpenWrt-Edge-5G',
          channel: 44,
          frequencyMhz: 5220,
          widthMhz: 80,
          txPowerDbm: 20,
          encryption: 'WPA2-PSK (AES)',
          bssid: '60:38:E0:C3:9D:35',
          connectedClients: []
        }
      ]
    }
  }
];

const INITIAL_PCC_CONNECTIONS: PccConnection[] = [
  {
    id: 'conn-101',
    protocol: 'TCP',
    srcIp: '192.168.1.115',
    srcPort: 49182,
    dstIp: '142.250.190.46',
    dstPort: 443,
    serviceName: 'YouTube 1080p Video Stream',
    pccHashSlot: '3/0',
    connectionMark: 'conn_wan1',
    routingMark: 'to_WAN1',
    outInterface: 'ether1-wan1',
    rxRateKbps: 8420,
    txRateKbps: 340,
    bytesTransferred: 42198000,
    tcpState: 'ESTABLISHED',
    timeoutSec: 180,
    durationSec: 420
  },
  {
    id: 'conn-102',
    protocol: 'UDP',
    srcIp: '192.168.1.115',
    srcPort: 52110,
    dstIp: '170.114.52.12',
    dstPort: 8801,
    serviceName: 'Zoom HD Video Conference',
    pccHashSlot: '3/1',
    connectionMark: 'conn_wan2',
    routingMark: 'to_WAN2',
    outInterface: 'ether2-wan2',
    rxRateKbps: 2850,
    txRateKbps: 1950,
    bytesTransferred: 28940000,
    tcpState: 'UDP_STREAM',
    timeoutSec: 60,
    durationSec: 1250
  },
  {
    id: 'conn-103',
    protocol: 'TCP',
    srcIp: '192.168.1.142',
    srcPort: 38921,
    dstIp: '104.244.42.1',
    dstPort: 443,
    serviceName: 'Twitter/X Live Telemetry',
    pccHashSlot: '3/0',
    connectionMark: 'conn_wan1',
    routingMark: 'to_WAN1',
    outInterface: 'ether1-wan1',
    rxRateKbps: 620,
    txRateKbps: 85,
    bytesTransferred: 5120000,
    tcpState: 'ESTABLISHED',
    timeoutSec: 300,
    durationSec: 310
  },
  {
    id: 'conn-104',
    protocol: 'TCP',
    srcIp: '192.168.1.189',
    srcPort: 4102,
    dstIp: '139.59.220.10',
    dstPort: 1883,
    serviceName: 'MQTT IoT Sensor Node (DS3231)',
    pccHashSlot: '3/1',
    connectionMark: 'conn_wan2',
    routingMark: 'to_WAN2',
    outInterface: 'ether2-wan2',
    rxRateKbps: 45,
    txRateKbps: 120,
    bytesTransferred: 1840000,
    tcpState: 'ESTABLISHED',
    timeoutSec: 86400,
    durationSec: 15400
  },
  {
    id: 'conn-105',
    protocol: 'TCP',
    srcIp: '192.168.1.104',
    srcPort: 55120,
    dstIp: '149.154.167.99',
    dstPort: 443,
    serviceName: 'Telegram MTProto Cloud Bot',
    pccHashSlot: '3/0',
    connectionMark: 'conn_wan1',
    routingMark: 'to_WAN1',
    outInterface: 'ether1-wan1',
    rxRateKbps: 310,
    txRateKbps: 92,
    bytesTransferred: 3450000,
    tcpState: 'ESTABLISHED',
    timeoutSec: 3600,
    durationSec: 820
  },
  {
    id: 'conn-106',
    protocol: 'UDP',
    srcIp: '192.168.1.120',
    srcPort: 53211,
    dstIp: '1.1.1.1',
    dstPort: 53,
    serviceName: 'Cloudflare DNS Resolver',
    pccHashSlot: '3/1',
    connectionMark: 'conn_wan2',
    routingMark: 'to_WAN2',
    outInterface: 'ether2-wan2',
    rxRateKbps: 18,
    txRateKbps: 12,
    bytesTransferred: 420000,
    tcpState: 'UDP_STREAM',
    timeoutSec: 10,
    durationSec: 65
  },
  {
    id: 'conn-107',
    protocol: 'TCP',
    srcIp: '192.168.1.160',
    srcPort: 44120,
    dstIp: '20.198.118.2',
    dstPort: 443,
    serviceName: 'GitHub Enterprise Repo Sync',
    pccHashSlot: '3/0',
    connectionMark: 'conn_wan1',
    routingMark: 'to_WAN1',
    outInterface: 'ether1-wan1',
    rxRateKbps: 4520,
    txRateKbps: 1420,
    bytesTransferred: 82400000,
    tcpState: 'ESTABLISHED',
    timeoutSec: 120,
    durationSec: 240
  },
  {
    id: 'conn-108',
    protocol: 'TCP',
    srcIp: '192.168.1.175',
    srcPort: 51240,
    dstIp: '151.101.65.140',
    dstPort: 443,
    serviceName: 'Portal Akademik Kampus (SIAKAD)',
    pccHashSlot: '3/1',
    connectionMark: 'conn_wan2',
    routingMark: 'to_WAN2',
    outInterface: 'ether2-wan2',
    rxRateKbps: 940,
    txRateKbps: 180,
    bytesTransferred: 7120000,
    tcpState: 'ESTABLISHED',
    timeoutSec: 240,
    durationSec: 480
  }
];

const INITIAL_NETWATCH_TARGETS: NetwatchTarget[] = [
  {
    id: 'nw-01',
    host: '8.8.8.8',
    targetName: 'Google Public DNS (Probe IndiHome)',
    interfaceId: 'ether1-wan1',
    wanName: 'WAN 1 - IndiHome Fiber',
    intervalSec: 5,
    timeoutMs: 1000,
    status: 'up',
    lastRttMs: 14,
    packetLossPct: 0,
    upScript: '/ip route enable [find comment="WAN1-IndiHome"]',
    downScript: '/ip route disable [find comment="WAN1-IndiHome"]',
    since: '4d 18h 30m'
  },
  {
    id: 'nw-02',
    host: '1.1.1.1',
    targetName: 'Cloudflare DNS (Probe Biznet)',
    interfaceId: 'ether2-wan2',
    wanName: 'WAN 2 - Biznet Dedicated',
    intervalSec: 5,
    timeoutMs: 1000,
    status: 'up',
    lastRttMs: 9,
    packetLossPct: 0,
    upScript: '/ip route enable [find comment="WAN2-Biznet"]',
    downScript: '/ip route disable [find comment="WAN2-Biznet"]',
    since: '4d 18h 30m'
  },
  {
    id: 'nw-03',
    host: '9.9.9.9',
    targetName: 'Quad9 Security DNS (Probe Orbit LTE)',
    interfaceId: 'ether3-wan3',
    wanName: 'WAN 3 - Telkomsel Orbit',
    intervalSec: 10,
    timeoutMs: 2000,
    status: 'up',
    lastRttMs: 38,
    packetLossPct: 0,
    upScript: '/ip route set [find comment="WAN3-LTE"] distance=1',
    downScript: '/ip route set [find comment="WAN3-LTE"] distance=3',
    since: '4d 18h 30m'
  }
];

export class NetworkEngine {
  private wans: WanInterface[] = JSON.parse(JSON.stringify(INITIAL_WANS));
  private router: RouterResource = { ...INITIAL_ROUTER };
  private linksysDevices: LinksysDevice[] = JSON.parse(JSON.stringify(INITIAL_LINKSYS_DEVICES));
  private activeLinksysId: string = INITIAL_LINKSYS_DEVICES[0].id;
  private routes: RouteEntry[] = JSON.parse(JSON.stringify(INITIAL_ROUTES));
  private events: NetworkEvent[] = [];
  private apiLogs: RouterApiLog[] = [];
  private pccConnections: PccConnection[] = JSON.parse(JSON.stringify(INITIAL_PCC_CONNECTIONS));
  private netwatchTargets: NetwatchTarget[] = JSON.parse(JSON.stringify(INITIAL_NETWATCH_TARGETS));
  private topologyMode: LinksysTopologyMode = 'downstream_sublayer';
  private vrrpMasterRouter: 'mikrotik' | 'linksys' = 'mikrotik';
  private telegramAlertConfig: TelegramAlertConfig = {
    enabled: true,
    botToken: '6821949182:AAH9fkl9x12Jp94-Kqm91Z_noc',
    chatId: '-1002948192841',
    soundEnabled: true,
    sentCount: 3,
    lastSentPayload: JSON.stringify({
      chat_id: '-1002948192841',
      text: '⚠️ [MULTI-WAN ALERT] Failover triggered: WAN 1 down, routed to WAN 2 & 3. TIPHON Index: 3.82',
      parse_mode: 'HTML'
    }, null, 2)
  };
  private apiConfig: RouterApiConfig = {
    mode: 'simulator',
    endpointUrl: 'https://192.168.88.1/rest',
    username: 'admin',
    pollIntervalMs: 1000,
    isConnected: true,
    lastSyncTimestamp: Date.now()
  };
  private loadBalancingConfig: LoadBalancingConfig = {
    mode: 'pcc',
    pccClassifier: 'both-addresses-and-ports',
    checkGatewayProtocol: 'ping',
    checkGatewayIntervalSec: 3,
    failoverThresholdAttempts: 2,
    activeBalancingRatio: '2:1 (WAN1:WAN2)',
    failoverTriggerCount: 4,
    lastFailoverSwitchMs: 420
  };
  private listeners: Array<() => void> = [];
  private timer: number | null = null;
  private tickCounter = 0;
  private localMasterNtpActive: boolean = true;

  private failoverBenchmarks: FailoverBenchmarkResult[] = [
    {
      id: 'bm-01',
      testName: 'Uji Failover WAN1 (IndiHome) ke WAN2 (Biznet)',
      testedWanId: 'ether1-wan1',
      wanName: 'WAN 1 - IndiHome Fiber',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('id-ID'),
      rtcTimestamp: new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19),
      detectionDelayMs: 412,
      packetLossPctDuringFailover: 0.8,
      convergenceTimeMs: 680,
      totalSwitchTimeMs: 1092,
      failbackTimeMs: 1450,
      activeWanBefore: 'WAN1 (66%) + WAN2 (33%)',
      activeWanAfter: 'WAN2 (100% Dedicated)',
      qosBefore: 'Sangat Baik',
      qosAfter: 'Sangat Baik',
      status: 'passed',
      notes: 'PCC routing table otomatis mengalihkan aliran paket ke default gateway WAN2 (192.168.2.1) tanpa TCP session termination fatal.'
    },
    {
      id: 'bm-02',
      testName: 'Uji Dual Fiber Down (WAN1 & WAN2) ke WAN3 (LTE Orbit Backup)',
      testedWanId: 'ether2-wan2',
      wanName: 'WAN 2 - Biznet Dedicated',
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('id-ID'),
      rtcTimestamp: new Date(Date.now() - 1800000).toISOString().replace('T', ' ').substring(0, 19),
      detectionDelayMs: 620,
      packetLossPctDuringFailover: 2.4,
      convergenceTimeMs: 1120,
      totalSwitchTimeMs: 1740,
      failbackTimeMs: 2200,
      activeWanBefore: 'WAN2 (Active)',
      activeWanAfter: 'WAN3 (LTE Backup Active)',
      qosBefore: 'Sangat Baik',
      qosAfter: 'Baik',
      status: 'passed',
      notes: 'Recursive routing via 8.8.8.8 check-gateway=ping mendeteksi kegagalan link fiber dan mengaktifkan default route distance=3 Telkomsel Orbit.'
    }
  ];

  private wifiScans: Record<'2.4GHz' | '5GHz', WifiScanResult[]> = {
    '2.4GHz': [
      {
        bssid: '60:38:E0:A1:4B:02',
        ssid: 'OpenWrt-Linksys-2.4G',
        channel: 6,
        band: '2.4GHz',
        signalDbm: -32,
        qualityPct: 98,
        encryption: 'WPA2-PSK (AES)',
        channelWidth: 20,
        isConflicting: false
      },
      {
        bssid: 'E4:C3:2A:88:19:10',
        ssid: 'Lab-Informatika-Hotspot',
        channel: 6,
        band: '2.4GHz',
        signalDbm: -68,
        qualityPct: 58,
        encryption: 'WPA2-Enterprise',
        channelWidth: 20,
        isConflicting: true
      },
      {
        bssid: '70:4F:57:9B:02:44',
        ssid: 'Gedung-A-Guest',
        channel: 1,
        band: '2.4GHz',
        signalDbm: -74,
        qualityPct: 48,
        encryption: 'WPA2-PSK',
        channelWidth: 20,
        isConflicting: false
      },
      {
        bssid: '2C:30:33:DE:77:81',
        ssid: 'Dosen-WiFi-Lt1',
        channel: 11,
        band: '2.4GHz',
        signalDbm: -79,
        qualityPct: 40,
        encryption: 'WPA3-Personal',
        channelWidth: 20,
        isConflicting: false
      }
    ],
    '5GHz': [
      {
        bssid: '60:38:E0:A1:4B:03',
        ssid: 'OpenWrt-Linksys-5G-HighSpeed',
        channel: 36,
        band: '5GHz',
        signalDbm: -30,
        qualityPct: 99,
        encryption: 'WPA3-SAE / WPA2-PSK Mixed',
        channelWidth: 80,
        isConflicting: false
      },
      {
        bssid: 'D8:07:B6:33:41:9A',
        ssid: 'Kampus-Gigabit-Mesh',
        channel: 149,
        band: '5GHz',
        signalDbm: -62,
        qualityPct: 68,
        encryption: 'WPA3-Enterprise',
        channelWidth: 80,
        isConflicting: false
      },
      {
        bssid: '90:9A:4A:22:15:CC',
        ssid: 'Lab-IoT-5G-AP',
        channel: 44,
        band: '5GHz',
        signalDbm: -72,
        qualityPct: 52,
        encryption: 'WPA2-PSK (AES)',
        channelWidth: 80,
        isConflicting: false
      }
    ]
  };

  // Chaos injection states
  private chaosState: Record<WanId, {
    forceDown: boolean;
    packetLossOffset: number;
    latencyOffset: number;
    bandwidthMultiplier: number;
  }> = {
    'ether1-wan1': { forceDown: false, packetLossOffset: 0, latencyOffset: 0, bandwidthMultiplier: 1.0 },
    'ether2-wan2': { forceDown: false, packetLossOffset: 0, latencyOffset: 0, bandwidthMultiplier: 1.0 },
    'ether3-wan3': { forceDown: false, packetLossOffset: 0, latencyOffset: 0, bandwidthMultiplier: 1.0 }
  };

  constructor() {
    this.seedHistory();
    this.addEvent({
      type: 'load_balance',
      title: 'Inisialisasi Sistem Multi-WAN',
      description: 'Sistem monitoring terhubung ke API RouterOS v7. PCC 2:1 aktif pada WAN1 dan WAN2.',
      severity: 'info'
    });
    this.startLoop();
  }

  private seedHistory() {
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const ts = now - i * 1000;
      const timeStr = new Date(ts).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      this.wans.forEach(wan => {
        const baseRx = wan.id === 'ether1-wan1' ? 45 : wan.id === 'ether2-wan2' ? 22 : 3;
        const baseTx = wan.id === 'ether1-wan1' ? 12 : wan.id === 'ether2-wan2' ? 6 : 1;
        const noiseRx = (Math.random() - 0.5) * 8;
        const noiseTx = (Math.random() - 0.5) * 3;

        wan.history.push({
          timestamp: ts,
          timeLabel: timeStr,
          rxMbps: Math.max(0.5, Number((baseRx + noiseRx).toFixed(1))),
          txMbps: Math.max(0.2, Number((baseTx + noiseTx).toFixed(1))),
          latencyMs: Math.round(wan.latencyMs + (Math.random() - 0.5) * 4),
          jitterMs: Number((wan.jitterMs + (Math.random() - 0.5) * 1.5).toFixed(1)),
          packetLossPct: wan.packetLossPct
        });
      });
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public startLoop() {
    if (this.timer) return;
    this.timer = window.setInterval(() => {
      this.tick();
    }, this.apiConfig.pollIntervalMs);
  }

  public stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setPollInterval(ms: number) {
    this.apiConfig.pollIntervalMs = ms;
    this.stopLoop();
    this.startLoop();
    this.notify();
  }

  private tick() {
    this.tickCounter++;
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Check link status changes and automatic failover logic
    const wan1Chaos = this.chaosState['ether1-wan1'];
    const wan2Chaos = this.chaosState['ether2-wan2'];
    const wan3Chaos = this.chaosState['ether3-wan3'];

    const wan1 = this.wans.find(w => w.id === 'ether1-wan1')!;
    const wan2 = this.wans.find(w => w.id === 'ether2-wan2')!;
    const wan3 = this.wans.find(w => w.id === 'ether3-wan3')!;

    // Check WAN 1 failover
    if (wan1Chaos.forceDown && wan1.status !== 'down') {
      wan1.status = 'down';
      wan1.currentRxMbps = 0;
      wan1.currentTxMbps = 0;
      wan1.latencyMs = 0;
      wan1.jitterMs = 0;
      wan1.packetLossPct = 100;
      wan1.failoverCount++;
      wan1.lastFailoverTime = timeStr;

      // Failover trigger: activate WAN 3 (Backup) and increase load on WAN 2
      wan3.status = 'active';
      this.routes.find(r => r.interfaceId === 'ether1-wan1')!.active = false;
      this.routes.find(r => r.interfaceId === 'ether3-wan3')!.active = true;

      this.addEvent({
        type: 'failover',
        interfaceId: 'ether1-wan1',
        title: 'Failover Otomatis Dipicu: WAN 1 Down',
        description: 'Koneksi WAN 1 (IndiHome) terputus (Link Down). Jalur rute dialihkan otomatis ke WAN 2 & WAN 3 (Failover Orbit) dalam 1.2 detik.',
        severity: 'danger'
      });
    } else if (!wan1Chaos.forceDown && wan1.status === 'down') {
      // WAN 1 Recovered (Failback)
      wan1.status = 'active';
      wan1.latencyMs = 15;
      wan1.jitterMs = 3.5;
      wan1.packetLossPct = 0;

      this.routes.find(r => r.interfaceId === 'ether1-wan1')!.active = true;
      if (!wan2Chaos.forceDown) {
        wan3.status = 'standby';
        this.routes.find(r => r.interfaceId === 'ether3-wan3')!.active = false;
      }

      this.addEvent({
        type: 'failback',
        interfaceId: 'ether1-wan1',
        title: 'Failback Otomatis: WAN 1 Pulih',
        description: 'Tautan WAN 1 (IndiHome) kembali normal. Prioritas rute utama (Distance 1) dipulihkan otomatis oleh API RouterOS.',
        severity: 'success'
      });
    }

    // Check WAN 2
    if (wan2Chaos.forceDown && wan2.status !== 'down') {
      wan2.status = 'down';
      wan2.currentRxMbps = 0;
      wan2.currentTxMbps = 0;
      wan2.latencyMs = 0;
      wan2.packetLossPct = 100;
      wan2.failoverCount++;
      this.routes.find(r => r.interfaceId === 'ether2-wan2')!.active = false;
      wan3.status = 'active';
      this.routes.find(r => r.interfaceId === 'ether3-wan3')!.active = true;

      this.addEvent({
        type: 'failover',
        interfaceId: 'ether2-wan2',
        title: 'Peringatan: WAN 2 (Biznet) Terputus',
        description: 'Antarmuka ether2-wan2 mengalami gangguan tautan. Rute dipindahkan ke jalur cadangan.',
        severity: 'warning'
      });
    } else if (!wan2Chaos.forceDown && wan2.status === 'down') {
      wan2.status = 'active';
      wan2.latencyMs = 20;
      wan2.packetLossPct = 0;
      this.routes.find(r => r.interfaceId === 'ether2-wan2')!.active = true;
      this.addEvent({
        type: 'link_up',
        interfaceId: 'ether2-wan2',
        title: 'WAN 2 (Biznet) Normal Kembali',
        description: 'Antarmuka ether2 kembali aktif. Load balancing PCC terkalibrasi ulang.',
        severity: 'success'
      });
    }

    // Update Telemetry metrics per WAN
    this.wans.forEach(wan => {
      const chaos = this.chaosState[wan.id];
      const baseLatency = wan.id === 'ether1-wan1' ? 14 : wan.id === 'ether2-wan2' ? 19 : 38;
      const baseJitter = wan.id === 'ether1-wan1' ? 3.2 : wan.id === 'ether2-wan2' ? 4.8 : 9.4;

      if (wan.status === 'down') {
        wan.currentRxMbps = 0;
        wan.currentTxMbps = 0;
        wan.latencyMs = 0;
        wan.jitterMs = 0;
        wan.packetLossPct = 100;
        wan.healthScore = 0;
        wan.mosScore = 1.0;
        wan.bufferbloatGrade = 'F';
        wan.droppedPackets.rx += Math.round(Math.random() * 2 + 1);

        if (wan.targetProbes) {
          wan.targetProbes.forEach(tp => {
            tp.status = 'down';
            tp.latencyMs = 0;
            tp.lossPct = 100;
          });
        }
      } else {
        // Base traffic generation with realistic network fluctuations
        let targetRx = 0;
        let targetTx = 0;

        if (wan.id === 'ether1-wan1') {
          targetRx = 50 + (Math.sin(this.tickCounter / 3) * 15) + (Math.random() - 0.5) * 8;
          targetTx = 14 + (Math.cos(this.tickCounter / 4) * 5) + (Math.random() - 0.5) * 3;
        } else if (wan.id === 'ether2-wan2') {
          // If WAN 1 is down, WAN 2 handles extra load
          const loadBoost = wan1.status === 'down' ? 1.8 : 1.0;
          targetRx = (24 + (Math.cos(this.tickCounter / 3) * 8) + (Math.random() - 0.5) * 4) * loadBoost;
          targetTx = (7 + (Math.random() - 0.5) * 2) * loadBoost;
        } else if (wan.id === 'ether3-wan3') {
          if (wan.status === 'active') {
            // Active failover mode
            targetRx = 20 + (Math.random() - 0.5) * 6;
            targetTx = 6 + (Math.random() - 0.5) * 2;
          } else {
            // Standby keepalive probing traffic only
            targetRx = 1.2 + (Math.random() - 0.5) * 0.4;
            targetTx = 0.4 + (Math.random() - 0.5) * 0.1;
          }
        }

        // Apply chaos offsets
        targetRx = Math.min(wan.maxBandwidthMbps, Math.max(0.1, targetRx * chaos.bandwidthMultiplier));
        targetTx = Math.min(wan.maxBandwidthMbps, Math.max(0.1, targetTx * chaos.bandwidthMultiplier));

        wan.currentRxMbps = Number(targetRx.toFixed(1));
        wan.currentTxMbps = Number(targetTx.toFixed(1));
        wan.peakRxMbps = Math.max(wan.peakRxMbps, wan.currentRxMbps);
        wan.peakTxMbps = Math.max(wan.peakTxMbps, wan.currentTxMbps);

        wan.latencyMs = Math.max(5, Math.round(baseLatency + (Math.random() - 0.5) * 4 + chaos.latencyOffset));
        wan.jitterMs = Number(Math.max(0.5, baseJitter + (Math.random() - 0.5) * 1.5 + (chaos.latencyOffset > 0 ? 12 : 0)).toFixed(1));
        wan.packetLossPct = Number(Math.min(100, Math.max(0, chaos.packetLossOffset + (Math.random() > 0.95 ? 0.3 : 0))).toFixed(1));

        // Update byte counters
        wan.totalRxBytes += Math.round((wan.currentRxMbps * 1000000) / 8);
        wan.totalTxBytes += Math.round((wan.currentTxMbps * 1000000) / 8);

        // Update deep metrics
        wan.healthScore = computeHealthScore(wan);
        wan.mosScore = computeMOS(wan.latencyMs, wan.jitterMs, wan.packetLossPct, false);
        wan.bufferbloatGrade = computeBufferbloatGrade(wan.latencyMs, wan.jitterMs, baseLatency, false);

        // Update dropped packets
        if (chaos.packetLossOffset > 0) {
          wan.droppedPackets.rx += Math.round(chaos.packetLossOffset * 2.5);
          wan.droppedPackets.tx += Math.round(chaos.packetLossOffset * 0.8);
        }

        // Update Multi-Target ping probes
        if (wan.targetProbes) {
          wan.targetProbes.forEach(tp => {
            const probeDelta = tp.target === '1.1.1.1' ? -2 : tp.target === '8.8.8.8' ? 0 : 5;
            tp.latencyMs = Math.max(4, Math.round(wan.latencyMs + probeDelta + (Math.random() - 0.5) * 2));
            tp.jitterMs = Number(Math.max(0.4, (wan.jitterMs * 0.9 + (Math.random() - 0.5) * 0.8)).toFixed(1));
            tp.lossPct = wan.packetLossPct;
            tp.status = wan.packetLossPct > 5 ? 'degraded' : 'ok';
          });
        }
      }

      // Append to history (keep max 30 points)
      wan.history.push({
        timestamp: now,
        timeLabel: timeStr,
        rxMbps: wan.currentRxMbps,
        txMbps: wan.currentTxMbps,
        latencyMs: wan.latencyMs,
        jitterMs: wan.jitterMs,
        packetLossPct: wan.packetLossPct
      });

      if (wan.history.length > 30) {
        wan.history.shift();
      }
    });

    // Update Router CPU & Health metrics
    const totalCurrentBw = this.wans.reduce((sum, w) => sum + w.currentRxMbps + w.currentTxMbps, 0);
    this.router.cpuLoadPct = Math.min(95, Math.round(12 + (totalCurrentBw / 180) * 45 + (Math.random() - 0.5) * 6));
    this.router.boardTempC = Math.round(40 + (this.router.cpuLoadPct / 100) * 8);

    // Simulate RouterOS REST API audit log periodically
    if (this.tickCounter % 3 === 0) {
      this.recordMockApiCall(
        'POST',
        '/rest/interface/monitor-traffic',
        200,
        Math.round(8 + Math.random() * 15),
        JSON.stringify({ interface: 'ether1,ether2,ether3', once: true }),
        JSON.stringify(
          this.wans.map(w => ({
            name: w.interfaceName,
            'rx-bits-per-second': Math.round(w.currentRxMbps * 1000000),
            'tx-bits-per-second': Math.round(w.currentTxMbps * 1000000),
            'fp-rx-bits-per-second': Math.round(w.currentRxMbps * 980000),
            'fp-tx-bits-per-second': Math.round(w.currentTxMbps * 980000)
          }))
        )
      );
    }

    // Advance Linksys RTC Subsystem Clocks for all managed Linksys devices
    const hasInternet = this.wans.some(w => w.status === 'active');
    this.linksysDevices.forEach(dev => {
      if (dev.rtc.installed) {
        dev.rtc.hardwareTimeEpoch += this.apiConfig.pollIntervalMs;
        dev.rtc.hardwareTimeString = new Date(dev.rtc.hardwareTimeEpoch).toISOString().replace('T', ' ').substring(0, 19);
      }

      if (dev.rtc.isSimulated1970Bug) {
        dev.rtc.systemTimeEpoch += this.apiConfig.pollIntervalMs;
        const d1970 = new Date(dev.rtc.systemTimeEpoch);
        dev.rtc.systemTimeString = d1970.toISOString().replace('T', ' ').substring(0, 19) + ' (BUG 1970)';
        dev.rtc.ntpSyncStatus = 'unsynced';
      } else {
        dev.rtc.systemTimeEpoch = now;
        dev.rtc.systemTimeString = new Date(now).toISOString().replace('T', ' ').substring(0, 19);
        dev.rtc.ntpSyncStatus = hasInternet ? 'synced' : 'unsynced';
      }

      // Linksys temperature fluctuation
      dev.cpuTempC = Math.round(48 + (totalCurrentBw / 200) * 8 + (Math.random() - 0.5) * 2);
    });

    // Update live PCC connections tracking & failover migration
    const activeWanIds = this.wans.filter(w => w.status === 'active').map(w => w.id);
    const fallbackWanId: WanId = activeWanIds.includes('ether2-wan2')
      ? 'ether2-wan2'
      : activeWanIds.includes('ether3-wan3')
      ? 'ether3-wan3'
      : 'ether1-wan1';

    this.pccConnections.forEach(conn => {
      conn.durationSec += Math.round(this.apiConfig.pollIntervalMs / 1000);
      conn.timeoutSec = Math.max(5, conn.timeoutSec - Math.round(this.apiConfig.pollIntervalMs / 1000));
      if (conn.timeoutSec <= 5) conn.timeoutSec = 180;

      const targetWan = this.wans.find(w => w.id === conn.outInterface);
      if (!targetWan || targetWan.status === 'down') {
        // Dynamic PCC session migration
        conn.outInterface = fallbackWanId;
        conn.connectionMark = fallbackWanId === 'ether2-wan2' ? 'conn_wan2' : 'conn_wan3';
        conn.routingMark = fallbackWanId === 'ether2-wan2' ? 'to_WAN2' : 'to_WAN3_Backup';
        conn.pccHashSlot = fallbackWanId === 'ether2-wan2' ? '2/1 (Rerouted)' : '3/2 (Rerouted)';
      } else {
        // Normal PCC distribution if original WAN is restored
        if (conn.id === 'conn-101' || conn.id === 'conn-103' || conn.id === 'conn-105' || conn.id === 'conn-107') {
          const w1 = this.wans.find(w => w.id === 'ether1-wan1');
          if (w1 && w1.status === 'active') {
            conn.outInterface = 'ether1-wan1';
            conn.connectionMark = 'conn_wan1';
            conn.routingMark = 'to_WAN1';
            conn.pccHashSlot = '3/0';
          }
        }
      }

      // Bandwidth fluctuation
      const jitter = (Math.random() - 0.5) * 0.15;
      conn.rxRateKbps = Math.max(10, Math.round(conn.rxRateKbps * (1 + jitter)));
      conn.txRateKbps = Math.max(5, Math.round(conn.txRateKbps * (1 + jitter)));
      conn.bytesTransferred += Math.round((conn.rxRateKbps + conn.txRateKbps) * 128);
    });

    // Update Netwatch targets
    this.netwatchTargets.forEach(nw => {
      const wan = this.wans.find(w => w.id === nw.interfaceId);
      if (!wan || wan.status === 'down') {
        nw.status = 'down';
        nw.lastRttMs = 0;
        nw.packetLossPct = 100;
      } else {
        nw.status = 'up';
        nw.packetLossPct = wan.packetLossPct;
        nw.lastRttMs = Math.round(wan.latencyMs);
      }
    });

    this.apiConfig.lastSyncTimestamp = now;
    this.notify();
  }

  public recordMockApiCall(
    method: 'GET' | 'POST' | 'PUT',
    endpoint: string,
    statusCode: number,
    durationMs: number,
    requestPayload: string | undefined,
    responsePayload: string
  ) {
    const log: RouterApiLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      method,
      endpoint,
      statusCode,
      durationMs,
      requestPayload,
      responsePayload
    };

    this.apiLogs.unshift(log);
    if (this.apiLogs.length > 25) {
      this.apiLogs.pop();
    }
  }

  public addEvent(event: Omit<NetworkEvent, 'id' | 'timestamp'>) {
    const fullEvent: NetworkEvent = {
      ...event,
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
    this.events.unshift(fullEvent);
    if (this.events.length > 50) {
      this.events.pop();
    }
    this.notify();
  }

  // Chaos controls
  public toggleLinkStatus(wanId: WanId) {
    const chaos = this.chaosState[wanId];
    chaos.forceDown = !chaos.forceDown;
    this.tick();
  }

  public setPacketLossSpike(wanId: WanId, pct: number) {
    this.chaosState[wanId].packetLossOffset = pct;
    if (pct > 5) {
      this.addEvent({
        type: 'packet_loss',
        interfaceId: wanId,
        title: `Simulasi Packet Loss ${pct}% di ${wanId}`,
        description: `Kualitas link ${wanId} menurun. Indeks TIPHON Packet Loss turun ke kategori ${pct > 15 ? 'Buruk' : 'Sedang'}.`,
        severity: pct > 15 ? 'danger' : 'warning'
      });
    }
    this.tick();
  }

  public setLatencySpike(wanId: WanId, latencyOffsetMs: number) {
    this.chaosState[wanId].latencyOffset = latencyOffsetMs;
    if (latencyOffsetMs > 100) {
      this.addEvent({
        type: 'latency_spike',
        interfaceId: wanId,
        title: `Simulasi Latensi Tinggi (+${latencyOffsetMs}ms) di ${wanId}`,
        description: `Terdeteksi jitter dan RTT tinggi pada gerbang WAN. Pengujian SLA operasional mencatat penurunan responsivitas.`,
        severity: 'warning'
      });
    }
    this.tick();
  }

  public setThrottle(wanId: WanId, multiplier: number) {
    this.chaosState[wanId].bandwidthMultiplier = multiplier;
    this.tick();
  }

  public resetAllChaos() {
    (Object.keys(this.chaosState) as WanId[]).forEach(id => {
      this.chaosState[id] = {
        forceDown: false,
        packetLossOffset: 0,
        latencyOffset: 0,
        bandwidthMultiplier: 1.0
      };
    });
    this.wans.forEach(w => {
      if (w.id === 'ether3-wan3') {
        w.status = 'standby';
      } else {
        w.status = 'active';
      }
    });
    this.routes[0].active = true;
    this.routes[1].active = true;
    this.routes[2].active = false;

    this.addEvent({
      type: 'load_balance',
      title: 'Reset Skenario Pengujian',
      description: 'Seluruh gangguan simulasi dinormalkan kembali. Topologi dan PCC kembali ke kondisi nominal.',
      severity: 'info'
    });
    this.tick();
  }

  // Getters
  public getWans(): WanInterface[] {
    return this.wans;
  }

  public getRouter(): RouterResource {
    return this.router;
  }

  public getRoutes(): RouteEntry[] {
    return this.routes;
  }

  public getEvents(): NetworkEvent[] {
    return this.events;
  }

  public getApiLogs(): RouterApiLog[] {
    return this.apiLogs;
  }

  public getApiConfig(): RouterApiConfig {
    return this.apiConfig;
  }

  public getChaosState() {
    return this.chaosState;
  }

  public updateApiConfig(cfg: Partial<RouterApiConfig>) {
    this.apiConfig = { ...this.apiConfig, ...cfg };
    this.notify();
  }

  public executeApiTest(endpoint: string): { status: number; duration: number; response: string } {
    const start = performance.now();
    let responseObj: unknown = {};

    if (endpoint === '/rest/interface') {
      responseObj = this.wans.map(w => ({
        '.id': w.id,
        name: w.interfaceName,
        type: 'ether',
        mtu: 1500,
        running: w.status !== 'down',
        disabled: w.status === 'down',
        comment: w.name
      }));
    } else if (endpoint === '/rest/interface/monitor-traffic') {
      responseObj = this.wans.map(w => ({
        name: w.interfaceName,
        'rx-bits-per-second': Math.round(w.currentRxMbps * 1000000),
        'tx-bits-per-second': Math.round(w.currentTxMbps * 1000000),
        'rx-packets-per-second': Math.round((w.currentRxMbps * 1000) / 1.5),
        'tx-packets-per-second': Math.round((w.currentTxMbps * 1000) / 1.5)
      }));
    } else if (endpoint === '/rest/ip/route') {
      responseObj = this.routes;
    } else if (endpoint === '/rest/system/resource') {
      responseObj = this.router;
    } else if (endpoint === '/rest/tool/ping') {
      const activeWans = this.wans.filter(w => w.status === 'active');
      const avgLat = activeWans.length ? Math.round(activeWans.reduce((a, b) => a + b.latencyMs, 0) / activeWans.length) : 0;
      responseObj = {
        target: '8.8.8.8',
        sent: 10,
        received: activeWans.length ? 10 : 0,
        'packet-loss': activeWans.length ? 0 : 100,
        'min-rtt': `${avgLat - 2}ms`,
        'avg-rtt': `${avgLat}ms`,
        'max-rtt': `${avgLat + 5}ms`
      };
    } else {
      responseObj = { error: 404, message: 'Endpoint router tidak ditemukan' };
    }

    const duration = Math.round(performance.now() - start + 12);
    const jsonStr = JSON.stringify(responseObj, null, 2);

    this.recordMockApiCall(
      endpoint.includes('monitor') || endpoint.includes('ping') ? 'POST' : 'GET',
      endpoint,
      200,
      duration,
      endpoint.includes('monitor') ? JSON.stringify({ interface: 'all' }) : undefined,
      jsonStr
    );

    return {
      status: 200,
      duration,
      response: jsonStr
    };
  }

  // Aggregate Metrics & QoS evaluation
  public getAggregateMetrics() {
    const activeWans = this.wans.filter(w => w.status === 'active');
    const totalRx = this.wans.reduce((s, w) => s + w.currentRxMbps, 0);
    const totalTx = this.wans.reduce((s, w) => s + w.currentTxMbps, 0);
    const avgLatency = activeWans.length
      ? Math.round(activeWans.reduce((s, w) => s + w.latencyMs, 0) / activeWans.length)
      : 0;
    const avgJitter = activeWans.length
      ? Number((activeWans.reduce((s, w) => s + w.jitterMs, 0) / activeWans.length).toFixed(1))
      : 0;
    const avgLoss = activeWans.length
      ? Number((activeWans.reduce((s, w) => s + w.packetLossPct, 0) / activeWans.length).toFixed(1))
      : 100;

    const qos: QoSEvaluation = evaluateQoS(totalRx, avgLatency, avgJitter, avgLoss);

    const overallHealthScore = activeWans.length
      ? Math.round(activeWans.reduce((s, w) => s + (w.healthScore || 0), 0) / activeWans.length)
      : 0;

    const overallMosScore = activeWans.length
      ? Number((activeWans.reduce((s, w) => s + (w.mosScore || 1.0), 0) / activeWans.length).toFixed(2))
      : 1.0;

    return {
      totalRx: Number(totalRx.toFixed(1)),
      totalTx: Number(totalTx.toFixed(1)),
      totalBandwidth: Number((totalRx + totalTx).toFixed(1)),
      activeCount: activeWans.length,
      standbyCount: this.wans.filter(w => w.status === 'standby').length,
      downCount: this.wans.filter(w => w.status === 'down').length,
      avgLatency,
      avgJitter,
      avgLoss,
      qos,
      overallHealthScore,
      overallMosScore,
      failoverSwitchSpeedMs: this.loadBalancingConfig.lastFailoverSwitchMs,
      loadBalancingConfig: this.loadBalancingConfig
    };
  }

  // Load Balancing & Routing Strategy Controls
  public getLoadBalancingConfig(): LoadBalancingConfig {
    return this.loadBalancingConfig;
  }

  public setLoadBalancingMode(mode: LoadBalancingMode) {
    this.loadBalancingConfig.mode = mode;
    if (mode === 'ecmp') {
      this.loadBalancingConfig.activeBalancingRatio = '1:1:1 (ECMP Round-Robin)';
    } else if (mode === 'pcc') {
      this.loadBalancingConfig.activeBalancingRatio = '2:1 (WAN1:WAN2 PCC Hash)';
    } else if (mode === 'failover_recursive') {
      this.loadBalancingConfig.activeBalancingRatio = 'Active-Backup (Distance 1->2->3)';
    } else {
      this.loadBalancingConfig.activeBalancingRatio = 'PBR QoS Multi-Class';
    }

    this.addEvent({
      type: 'load_balance',
      title: `Strategi Multi-WAN Diubah ke: ${mode.toUpperCase()}`,
      description: `Kebijakan routing table MikroTik diperbarui ke mode ${mode}. Konfigurasi firewall mangle & IP route disesuaikan.`,
      severity: 'info'
    });
    this.tick();
  }

  public setPccClassifier(classifier: 'src-address' | 'src-address-and-port' | 'both-addresses-and-ports') {
    this.loadBalancingConfig.pccClassifier = classifier;
    this.addEvent({
      type: 'load_balance',
      title: `PCC Hash Classifier: ${classifier}`,
      description: `Klasifikasi aliran data PCC diatur ke ${classifier} untuk distribusi sesi yang lebih merata.`,
      severity: 'info'
    });
    this.tick();
  }

  public setCheckGatewayInterval(sec: number) {
    this.loadBalancingConfig.checkGatewayIntervalSec = sec;
    this.notify();
  }

  public getTrafficCategoryStats(): TrafficCategoryStat[] {
    const wan1 = this.wans.find(w => w.id === 'ether1-wan1')!;
    const wan2 = this.wans.find(w => w.id === 'ether2-wan2')!;
    const wan3 = this.wans.find(w => w.id === 'ether3-wan3')!;

    const totalRx = this.wans.reduce((s, w) => s + w.currentRxMbps, 0);

    return [
      {
        category: 'web',
        label: 'HTTP / HTTPS Web Browsing & SaaS',
        totalMbps: Number((totalRx * 0.38).toFixed(1)),
        allocatedWan: wan1.status === 'active' ? 'ether1-wan1' : 'ether2-wan2',
        qosPriority: 'Normal',
        activeSessions: 142
      },
      {
        category: 'video',
        label: 'Streaming Video 4K & CDN (YouTube/Netflix)',
        totalMbps: Number((totalRx * 0.42).toFixed(1)),
        allocatedWan: wan1.status === 'active' ? 'ether1-wan1' : wan2.status === 'active' ? 'ether2-wan2' : 'ether3-wan3',
        qosPriority: 'Best Effort',
        activeSessions: 86
      },
      {
        category: 'gaming_voip',
        label: 'VoIP, Zoom Conference & Game Real-Time',
        totalMbps: Number((totalRx * 0.14).toFixed(1)),
        allocatedWan: wan2.status === 'active' ? 'ether2-wan2' : 'ether1-wan1',
        qosPriority: 'High',
        activeSessions: 29
      },
      {
        category: 'p2p_bulk',
        label: 'Bulk Download, Cloud Backup & Sync',
        totalMbps: Number((totalRx * 0.06).toFixed(1)),
        allocatedWan: wan3.status === 'active' ? 'ether3-wan3' : 'ether2-wan2',
        qosPriority: 'Best Effort',
        activeSessions: 12
      }
    ];
  }

  // Linksys & RTC Subsystem Getters & CRUD Handlers
  public getLinksysDevices(): LinksysDevice[] {
    return this.linksysDevices;
  }

  public getActiveLinksysId(): string {
    return this.activeLinksysId;
  }

  public getActiveLinksys(): LinksysDevice {
    const found = this.linksysDevices.find(d => d.id === this.activeLinksysId);
    return found || this.linksysDevices[0];
  }

  public getActiveRtc(): RtcSubsystem {
    return this.getActiveLinksys().rtc;
  }

  public getLinksys(): LinksysDevice {
    return this.getActiveLinksys();
  }

  public getRtc(): RtcSubsystem {
    return this.getActiveRtc();
  }

  public setActiveLinksys(id: string) {
    if (this.linksysDevices.some(d => d.id === id)) {
      this.activeLinksysId = id;
      const dev = this.getActiveLinksys();
      this.addEvent({
        type: 'load_balance',
        title: `Peralihan Perangkat Linksys Aktif: ${dev.name}`,
        description: `Inspeksi telemetri dan kontrol RTC dialihkan ke ${dev.model} (${dev.lanIp}).`,
        severity: 'info'
      });
      this.notify();
    }
  }

  public addLinksysDevice(deviceData: Omit<LinksysDevice, 'id' | 'uptime'>): LinksysDevice {
    const newId = 'linksys-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000);
    const newDevice: LinksysDevice = {
      ...deviceData,
      id: newId,
      uptime: '0d 00h 01m 20s'
    };

    this.linksysDevices.push(newDevice);
    this.addEvent({
      type: 'link_up',
      title: `Perangkat Linksys Baru Ditambahkan: ${newDevice.name}`,
      description: `Router ${newDevice.model} dengan IP ${newDevice.lanIp} dan RTC ${newDevice.rtc.chipModel} berhasil didaftarkan.`,
      severity: 'success'
    });
    this.notify();
    return newDevice;
  }

  public updateLinksysDevice(id: string, updates: Partial<LinksysDevice>) {
    const index = this.linksysDevices.findIndex(d => d.id === id);
    if (index !== -1) {
      this.linksysDevices[index] = {
        ...this.linksysDevices[index],
        ...updates
      };
      this.addEvent({
        type: 'load_balance',
        title: `Konfigurasi Diperbarui: ${this.linksysDevices[index].name}`,
        description: `Pengaturan perangkat ${this.linksysDevices[index].model} berhasil disimpan.`,
        severity: 'info'
      });
      this.notify();
    }
  }

  public deleteLinksysDevice(id: string): boolean {
    if (this.linksysDevices.length <= 1) {
      return false; // Prevent deleting all devices
    }
    const target = this.linksysDevices.find(d => d.id === id);
    this.linksysDevices = this.linksysDevices.filter(d => d.id !== id);
    if (this.activeLinksysId === id) {
      this.activeLinksysId = this.linksysDevices[0].id;
    }
    this.addEvent({
      type: 'link_down',
      title: `Perangkat Linksys Dihapus: ${target?.name || id}`,
      description: `Router ${target?.model || id} telah dihapus dari pemantauan sub-layer.`,
      severity: 'warning'
    });
    this.notify();
    return true;
  }

  public syncHwclock(direction: 'sys_to_rtc' | 'rtc_to_sys') {
    const active = this.getActiveLinksys();
    const timeStr = new Date().toLocaleTimeString('id-ID');
    if (direction === 'sys_to_rtc') {
      // hwclock -w: copy system time to hardware RTC
      active.rtc.hardwareTimeEpoch = active.rtc.systemTimeEpoch;
      active.rtc.hardwareTimeString = active.rtc.systemTimeString;
      active.rtc.lastHwclockSync = timeStr;
      this.addEvent({
        type: 'load_balance',
        title: `[${active.name}] Eksekusi: hwclock -w`,
        description: `Jam sistem Linux disinkronisasikan dan disimpan ke register chip RTC ${active.rtc.chipModel} (${active.rtc.devicePath}).`,
        severity: 'info'
      });
    } else {
      // hwclock -s: copy hardware RTC to system time
      active.rtc.systemTimeEpoch = active.rtc.hardwareTimeEpoch;
      active.rtc.systemTimeString = active.rtc.hardwareTimeString;
      active.rtc.isSimulated1970Bug = false;
      active.rtc.lastHwclockSync = timeStr;
      this.addEvent({
        type: 'load_balance',
        title: `[${active.name}] Eksekusi: hwclock -s`,
        description: `Jam sistem Linux berhasil dipulihkan dari chip RTC ${active.rtc.chipModel} tanpa memerlukan koneksi internet NTP.`,
        severity: 'success'
      });
    }
    this.notify();
  }

  public toggleRtcModule() {
    const active = this.getActiveLinksys();
    active.rtc.installed = !active.rtc.installed;
    this.addEvent({
      type: active.rtc.installed ? 'link_up' : 'link_down',
      title: `[${active.name}] ${active.rtc.installed ? 'Hardware RTC Terpasang' : 'Hardware RTC Dicabut'}`,
      description: active.rtc.installed
        ? `Modul ${active.rtc.chipModel} terdeteksi pada alamat ${active.rtc.i2cAddress}. Driver ${active.rtc.driverModule} aktif.`
        : `Perangkat ${active.rtc.devicePath} tidak ditemukan. Router kini bergantung sepenuhnya pada NTP jaringan.`,
      severity: active.rtc.installed ? 'success' : 'warning'
    });
    this.notify();
  }

  public simulateColdBootWithRtc() {
    const active = this.getActiveLinksys();
    active.uptime = '0d 00h 00m 05s';
    active.rtc.systemTimeEpoch = active.rtc.hardwareTimeEpoch;
    active.rtc.systemTimeString = new Date(active.rtc.hardwareTimeEpoch).toISOString().replace('T', ' ').substring(0, 19);
    active.rtc.isSimulated1970Bug = false;
    this.addEvent({
      type: 'load_balance',
      title: `Cold Boot ${active.name} DENGAN Hardware RTC`,
      description: 'Router menyala kembali dari kondisi mati listrik. Skrip /etc/rc.local otomatis mengeksekusi "hwclock -s". Jam sistem langsung akurat tanpa menunggu koneksi WAN/NTP. Sertifikat TLS dan log valid.',
      severity: 'success'
    });
    this.notify();
  }

  public simulateColdBootWithoutRtc() {
    const active = this.getActiveLinksys();
    active.uptime = '0d 00h 00m 04s';
    active.rtc.isSimulated1970Bug = true;
    // Epoch timestamp January 1, 1970 00:00:15 UTC
    active.rtc.systemTimeEpoch = 15000;
    active.rtc.systemTimeString = '1970-01-01 00:00:15 UTC (BUG 1970)';
    this.addEvent({
      type: 'failover',
      title: `Cold Boot ${active.name} TANPA Hardware RTC (WAN Offline)`,
      description: `BAHAYA: Router ${active.model} menyala tanpa baterai RTC dan tanpa internet NTP. Jam sistem reset ke 1 Januari 1970! API HTTPS gagal dengan SSL_ERROR_EXPIRED_CERT, dan log multi-WAN kehilangan urutan forensik.`,
      severity: 'danger'
    });
    this.notify();
  }

  public restoreNormalTime() {
    const active = this.getActiveLinksys();
    const now = Date.now();
    active.rtc.isSimulated1970Bug = false;
    active.rtc.systemTimeEpoch = now;
    active.rtc.hardwareTimeEpoch = now;
    active.rtc.systemTimeString = new Date(now).toISOString().replace('T', ' ').substring(0, 19);
    active.rtc.hardwareTimeString = new Date(now).toISOString().replace('T', ' ').substring(0, 19);
    this.addEvent({
      type: 'link_up',
      title: `[${active.name}] Sinkronisasi NTP Pemulihan Jam`,
      description: `Koneksi ke pool server NTP (${active.rtc.ntpServer}) berhasil. Waktu sistem dan RTC ${active.rtc.chipModel} dinormalkan.`,
      severity: 'info'
    });
    this.notify();
  }

  // Wireless & Remote Control Subsystem
  public setWifiMasterPower(enabled: boolean, deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    if (!target.wireless) return;
    target.wireless.wifiMasterEnabled = enabled;
    target.wireless.radios.forEach(r => {
      r.enabled = enabled;
    });

    this.addEvent({
      type: enabled ? 'link_up' : 'link_down',
      title: `[${target.name}] Wi-Fi Wireless Master ${enabled ? 'Dihidupkan (ON)' : 'Dimatikan (OFF)'}`,
      description: enabled
        ? `Seluruh antarmuka radio Wi-Fi (${target.wireless.radios.map(r => r.band).join(', ')}) diaktifkan kembali via OpenWrt wifi up.`
        : `Radio nirkabel 2.4 GHz dan 5 GHz dinonaktifkan (wifi down) untuk isolasi frekuensi atau efisiensi daya.`,
      severity: enabled ? 'success' : 'warning'
    });
    this.notify();
  }

  public toggleWifiRadio(radioId: string, deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    if (!target.wireless) return;
    const radio = target.wireless.radios.find(r => r.id === radioId);
    if (!radio) return;

    radio.enabled = !radio.enabled;
    this.addEvent({
      type: radio.enabled ? 'link_up' : 'link_down',
      title: `[${target.name}] Radio ${radio.band} ${radio.enabled ? 'Aktif' : 'Non-Aktif'}`,
      description: `Antarmuka ${radio.interfaceName} (${radio.ssid}, Saluran ${radio.channel}) dialihkan ke mode ${radio.enabled ? 'Up' : 'Disabled'}.`,
      severity: radio.enabled ? 'info' : 'warning'
    });
    this.notify();
  }

  public updateWifiRadio(radioId: string, updates: Partial<WifiRadio>, deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    if (!target.wireless) return;
    const radioIndex = target.wireless.radios.findIndex(r => r.id === radioId);
    if (radioIndex === -1) return;

    target.wireless.radios[radioIndex] = {
      ...target.wireless.radios[radioIndex],
      ...updates
    };
    this.addEvent({
      type: 'load_balance',
      title: `[${target.name}] Konfigurasi Wi-Fi ${target.wireless.radios[radioIndex].band} Diperbarui`,
      description: `SSID: "${target.wireless.radios[radioIndex].ssid}", Ch: ${target.wireless.radios[radioIndex].channel}, Daya Tx: ${target.wireless.radios[radioIndex].txPowerDbm} dBm disimpan ke /etc/config/wireless.`,
      severity: 'info'
    });
    this.notify();
  }

  public rebootLinksysDevice(deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    target.powerState = 'rebooting';
    target.status = 'warning';

    this.addEvent({
      type: 'failover',
      title: `[${target.name}] Router Soft Reboot Dimulai (reboot -f)`,
      description: `Sinyal SIGTERM dikirim ke seluruh proses OpenWrt (ubus, netifd, hostapd, dnsmasq). Subsistem RTC ${target.rtc.chipModel} mempertahankan jam hardware saat CPU Marvell me-reset.`,
      severity: 'warning'
    });
    this.notify();

    setTimeout(() => {
      target.powerState = 'on';
      target.status = 'online';
      target.uptime = '0d 00h 00m 03s';
      if (target.rtc.installed) {
        target.rtc.systemTimeEpoch = target.rtc.hardwareTimeEpoch;
        target.rtc.systemTimeString = new Date(target.rtc.hardwareTimeEpoch).toISOString().replace('T', ' ').substring(0, 19);
      }
      this.addEvent({
        type: 'link_up',
        title: `[${target.name}] Router Berhasil Booting Ulang (OpenWrt Siap)`,
        description: `Inisialisasi kernel Linux 5.15 selesai. hwclock -s sukses membaca chip ${target.rtc.chipModel}. Antarmuka wireless dan LAN aktif normal.`,
        severity: 'success'
      });
      this.notify();
    }, 2500);
  }

  public powerOffLinksysDevice(deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    target.powerState = 'off';
    target.status = 'offline';
    if (target.wireless) {
      target.wireless.wifiMasterEnabled = false;
      target.wireless.radios.forEach(r => { r.enabled = false; });
    }

    this.addEvent({
      type: 'link_down',
      title: `[${target.name}] Router Dimatikan (Soft Power Off / halt)`,
      description: `Perangkat ${target.model} dimatikan. Hanya modul RTC ${target.rtc.chipModel} yang tetap beroperasi menggunakan baterai CR2032 (3.0V).`,
      severity: 'danger'
    });
    this.notify();
  }

  public powerOnLinksysDevice(deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    target.powerState = 'on';
    target.status = 'online';
    target.uptime = '0d 00h 00m 08s';
    if (target.wireless) {
      target.wireless.wifiMasterEnabled = true;
      target.wireless.radios.forEach(r => { r.enabled = true; });
    }

    this.addEvent({
      type: 'link_up',
      title: `[${target.name}] Router Dihidupkan Kembali (Power ON)`,
      description: `Tegangan 12V DC terdeteksi. SoC boot sequence aktif, memuat modul I2C dan menyinkronkan waktu sistem dari RTC.`,
      severity: 'success'
    });
    this.notify();
  }

  public factoryResetLinksysDevice(deviceId?: string) {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    target.powerState = 'rebooting';
    target.status = 'warning';

    this.addEvent({
      type: 'failover',
      title: `[${target.name}] Reset Pabrik Dimulai: firstboot -y && reboot`,
      description: `Partisi overlay jffs2 diformat ulang. Konfigurasi wireless dan uci dikembalikan ke setelan awal pabrik OpenWrt.`,
      severity: 'danger'
    });
    this.notify();

    setTimeout(() => {
      target.powerState = 'on';
      target.status = 'online';
      target.uptime = '0d 00h 00m 02s';
      if (target.wireless) {
        target.wireless.wifiMasterEnabled = true;
        target.wireless.radios[0].ssid = 'OpenWrt';
        target.wireless.radios[0].channel = 1;
        target.wireless.radios[0].enabled = true;
        if (target.wireless.radios[1]) {
          target.wireless.radios[1].ssid = 'OpenWrt-5G';
          target.wireless.radios[1].channel = 36;
          target.wireless.radios[1].enabled = true;
        }
      }
      this.addEvent({
        type: 'link_up',
        title: `[${target.name}] Reset Pabrik Selesai`,
        description: `Router berhasil melakukan fresh boot dengan konfigurasi OpenWrt default.`,
        severity: 'success'
      });
      this.notify();
    }, 2800);
  }

  public executeRemoteSshCommand(command: string, deviceId?: string): { output: string; exitCode: number } {
    const target = deviceId ? this.linksysDevices.find(d => d.id === deviceId) || this.getActiveLinksys() : this.getActiveLinksys();
    const cleanCmd = command.trim();

    if (target.powerState === 'off') {
      return {
        output: `ssh: connect to host ${target.lanIp} port ${target.remoteSshPort}: Connection refused\n[Device is currently Powered Off. Please power on router first.]`,
        exitCode: 255
      };
    }

    if (target.powerState === 'rebooting') {
      return {
        output: `ssh: connect to host ${target.lanIp} port ${target.remoteSshPort}: Host is rebooting...`,
        exitCode: 255
      };
    }

    const radios = target.wireless?.radios || [];

    if (cleanCmd === 'wifi status') {
      return {
        output: JSON.stringify({
          radio0: {
            up: radios[0]?.enabled ?? false,
            pending: false,
            autostart: true,
            disabled: !radios[0]?.enabled,
            config: {
              channel: radios[0]?.channel,
              htmode: 'HT20',
              hwmode: '11g',
              path: 'platform/soc/soc:pcie/pci0000:00/0000:00:01.0/0000:01:00.0'
            },
            interfaces: [
              {
                section: 'default_radio0',
                ifname: radios[0]?.interfaceName,
                config: {
                  mode: 'ap',
                  ssid: radios[0]?.ssid,
                  encryption: radios[0]?.encryption
                },
                data: {
                  bssid: radios[0]?.bssid,
                  clients: radios[0]?.connectedClients.length
                }
              }
            ]
          },
          radio1: {
            up: radios[1]?.enabled ?? false,
            pending: false,
            autostart: true,
            disabled: !radios[1]?.enabled,
            config: {
              channel: radios[1]?.channel,
              htmode: 'VHT80',
              hwmode: '11a',
              path: 'platform/soc/soc:pcie/pci0000:00/0000:00:02.0/0000:02:00.0'
            },
            interfaces: [
              {
                section: 'default_radio1',
                ifname: radios[1]?.interfaceName,
                config: {
                  mode: 'ap',
                  ssid: radios[1]?.ssid,
                  encryption: radios[1]?.encryption
                },
                data: {
                  bssid: radios[1]?.bssid,
                  clients: radios[1]?.connectedClients.length
                }
              }
            ]
          }
        }, null, 2),
        exitCode: 0
      };
    }

    if (cleanCmd === 'wifi reload' || cleanCmd === 'wifi up') {
      this.setWifiMasterPower(true, target.id);
      return {
        output: `Configuration applied.\nEnabling radio0 (wlan0)... OK\nEnabling radio1 (wlan1)... OK\nhostapd instances spawned successfully.`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'wifi down') {
      this.setWifiMasterPower(false, target.id);
      return {
        output: `Stopping hostapd for radio0... OK\nStopping hostapd for radio1... OK\nWireless transmitters powered down.`,
        exitCode: 0
      };
    }

    if (cleanCmd.startsWith('iw dev') || cleanCmd === 'iwinfo') {
      return {
        output: `phy#0\n\tInterface wlan0\n\t\tifindex 11\n\t\twdev 0x1\n\t\taddr ${radios[0]?.bssid}\n\t\tssid ${radios[0]?.ssid}\n\t\ttype AP\n\t\tchannel ${radios[0]?.channel} (${radios[0]?.frequencyMhz} MHz), width: ${radios[0]?.widthMhz} MHz\n\t\ttxpower ${radios[0]?.txPowerDbm}.00 dBm\n\t\tclients: ${radios[0]?.connectedClients.length} associated\n\nphy#1\n\tInterface wlan1\n\t\tifindex 12\n\t\twdev 0x2\n\t\taddr ${radios[1]?.bssid}\n\t\tssid ${radios[1]?.ssid}\n\t\ttype AP\n\t\tchannel ${radios[1]?.channel} (${radios[1]?.frequencyMhz} MHz), width: ${radios[1]?.widthMhz} MHz\n\t\ttxpower ${radios[1]?.txPowerDbm}.00 dBm\n\t\tclients: ${radios[1]?.connectedClients.length} associated`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'hwclock -r') {
      return {
        output: `${target.rtc.hardwareTimeString}  -0.001924 seconds [chip: ${target.rtc.chipModel}]`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'hwclock -w') {
      this.syncHwclock('sys_to_rtc');
      return {
        output: `hwclock: System time copied to RTC register ${target.rtc.devicePath} (${target.rtc.i2cAddress}) successfully.`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'hwclock -s') {
      this.syncHwclock('rtc_to_sys');
      return {
        output: `hwclock: Kernel system time restored from hardware RTC (${target.rtc.chipModel}).`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'reboot') {
      this.rebootLinksysDevice(target.id);
      return {
        output: `Broadcast message from root@${target.hostname} (pts/0) (${new Date().toLocaleTimeString('id-ID')}):\n\nThe system is going down for reboot NOW!`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'firstboot') {
      this.factoryResetLinksysDevice(target.id);
      return {
        output: `This will erase all settings and reset to library defaults. Are you sure? [y/N]: y\n/dev/mtdblock6 will be erased on next reboot.\nRebooting now...`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'uptime') {
      return {
        output: ` ${new Date().toLocaleTimeString('id-ID')} up ${target.uptime},  load average: 0.12, 0.08, 0.04`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'free -m') {
      return {
        output: `              total        used        free      shared  buff/cache   available\nMem:            ${target.memoryTotalMb}         ${target.memoryTotalMb - target.memoryFreeMb}         ${target.memoryFreeMb}           1          28         ${target.memoryFreeMb + 20}\nSwap:             0           0           0`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'uci show wireless') {
      return {
        output: `wireless.radio0=wifi-device\nwireless.radio0.type='mac80211'\nwireless.radio0.path='soc/soc:pcie/pci0000:00/0000:00:01.0'\nwireless.radio0.channel='${radios[0]?.channel}'\nwireless.radio0.band='2g'\nwireless.radio0.htmode='HT20'\nwireless.radio0.disabled='${radios[0]?.enabled ? '0' : '1'}'\nwireless.default_radio0=wifi-iface\nwireless.default_radio0.device='radio0'\nwireless.default_radio0.network='lan'\nwireless.default_radio0.mode='ap'\nwireless.default_radio0.ssid='${radios[0]?.ssid}'\nwireless.default_radio0.encryption='${radios[0]?.encryption}'\n\nwireless.radio1=wifi-device\nwireless.radio1.type='mac80211'\nwireless.radio1.channel='${radios[1]?.channel}'\nwireless.radio1.band='5g'\nwireless.radio1.htmode='VHT80'\nwireless.radio1.disabled='${radios[1]?.enabled ? '0' : '1'}'\nwireless.default_radio1=wifi-iface\nwireless.default_radio1.device='radio1'\nwireless.default_radio1.network='lan'\nwireless.default_radio1.mode='ap'\nwireless.default_radio1.ssid='${radios[1]?.ssid}'\nwireless.default_radio1.encryption='${radios[1]?.encryption}'`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'logread -l 10' || cleanCmd === 'logread') {
      return {
        output: `kern.info kernel: [    0.000000] Linux version ${target.kernelVersion}\nkern.info kernel: [    2.140021] i2c /dev/i2c-0: adapter [Marvell Armada 38x I2C driver] registered\nkern.info kernel: [    2.155092] rtc-ds1307 0-0068: registered as rtc0\nkern.info kernel: [    2.155120] rtc-ds1307 0-0068: setting system clock to ${target.rtc.hardwareTimeString} UTC\ndaemon.notice netifd: Interface 'lan' is enabled\ndaemon.notice hostapd: ${radios[0]?.interfaceName}: interface state UNINITIALIZED->ENABLED\ndaemon.notice hostapd: ${radios[0]?.interfaceName}: AP-ENABLED\ndaemon.notice hostapd: ${radios[1]?.interfaceName}: interface state UNINITIALIZED->ENABLED\ndaemon.notice hostapd: ${radios[1]?.interfaceName}: AP-ENABLED\ndaemon.info dnsmasq[1422]: started, version 2.89 cachesize 150`,
        exitCode: 0
      };
    }

    if (cleanCmd === 'help') {
      return {
        output: `OpenWrt / Linksys CLI Help:\nAvailable commands:\n  wifi status       - Dump JSON status of 2.4G & 5G radios\n  wifi up           - Enable & bring up all wireless interfaces\n  wifi down         - Power off & disable all wireless radios\n  wifi reload       - Apply UCI wireless configurations\n  iw dev            - Detailed Wi-Fi physical links and associated clients\n  uci show wireless - Display /etc/config/wireless stanza\n  hwclock -r        - Query Maxim/NXP hardware RTC clock register\n  hwclock -s        - Set kernel clock from hardware RTC\n  hwclock -w        - Write kernel clock to hardware RTC\n  i2cdetect -y 0    - Scan Armada I2C bus for 0x68 / 0x51 address\n  reboot            - Graceful router restart (reboot -f)\n  firstboot         - Erase overlay & restore factory defaults\n  uptime            - Show current load average & system uptime\n  free -m           - Display RAM consumption`,
        exitCode: 0
      };
    }

    return {
      output: `ash: ${cleanCmd}: command executed successfully (mock output for OpenWrt busybox)`,
      exitCode: 0
    };
  }

  public executeUbusCall(path: string, method: string, params?: Record<string, unknown>): UbusCallResult {
    const start = performance.now();
    const active = this.getActiveLinksys();
    let responseObj: unknown = {};

    if (path === 'network.wireless' || path === 'wireless') {
      responseObj = {
        master_enabled: active.wireless?.wifiMasterEnabled ?? true,
        radios: active.wireless?.radios.map(r => ({
          radio: r.id,
          band: r.band,
          interface: r.interfaceName,
          enabled: r.enabled,
          ssid: r.ssid,
          channel: r.channel,
          frequency_mhz: r.frequencyMhz,
          tx_power_dbm: r.txPowerDbm,
          encryption: r.encryption,
          bssid: r.bssid,
          client_count: r.connectedClients.length,
          clients: r.connectedClients
        }))
      };
    } else if (path === 'system' && method === 'info') {
      responseObj = {
        localtime: Math.floor(active.rtc.systemTimeEpoch / 1000),
        uptime: 412334,
        load: [0.15, 0.08, 0.05],
        memory: {
          total: active.memoryTotalMb * 1024 * 1024,
          free: active.memoryFreeMb * 1024 * 1024,
          shared: 1048576,
          buffered: 20971520
        },
        swap: { total: 0, free: 0 },
        board_name: active.model.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        model: active.model,
        kernel: active.kernelVersion,
        release: {
          distribution: 'OpenWrt',
          version: active.openwrtVersion.split(' ')[1] || '23.05.3',
          revision: active.openwrtVersion.split(' ')[2] || 'r23809',
          target: active.target
        }
      };
    } else if (path === 'system' && method === 'get_time') {
      responseObj = {
        utc_time: active.rtc.systemTimeString,
        epoch: Math.floor(active.rtc.systemTimeEpoch / 1000),
        ntp_synced: active.rtc.ntpSyncStatus === 'synced',
        ntp_server: active.rtc.ntpServer
      };
    } else if (path === 'rtc' && method === 'status') {
      responseObj = {
        device: active.rtc.devicePath,
        present: active.rtc.installed,
        chip: active.rtc.chipModel,
        driver: active.rtc.driverModule,
        i2c_address: active.rtc.i2cAddress,
        rtc_time: active.rtc.hardwareTimeString,
        battery_voltage: `${active.rtc.batteryVoltage} V`,
        battery_status: active.rtc.batteryStatus,
        temperature_sensor: `${active.rtc.rtcTempC} °C`,
        drift_ppm: `${active.rtc.timeDriftPpm} ppm`,
        power_loss_flag: active.rtc.powerLossFlag
      };
    } else if (path === 'mwan3' && method === 'status') {
      responseObj = {
        status: {
          enabled: true,
          interfaces: {
            wan1: { status: this.wans[0].status, weight: 2, tracking: 'online', ip: this.wans[0].ipAddress },
            wan2: { status: this.wans[1].status, weight: 1, tracking: 'online', ip: this.wans[1].ipAddress },
            wan3: { status: this.wans[2].status, weight: 1, tracking: this.wans[2].status === 'active' ? 'online' : 'standby', ip: this.wans[2].ipAddress }
          },
          policies: {
            load_balanced: ['wan1 (66%)', 'wan2 (33%)'],
            failover_backup: ['wan3 (backup priority)']
          }
        }
      };
    } else if (path === 'i2c' && method === 'detect') {
      const addrHex = active.rtc.i2cAddress.replace('0x', '');
      responseObj = {
        bus: active.i2cBus,
        header: '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f',
        grid: [
          '00:          -- -- -- -- -- -- -- -- -- -- -- -- --',
          '10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --',
          '20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --',
          '30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --',
          '40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --',
          addrHex.startsWith('5')
            ? (active.rtc.installed ? '50: -- UU -- -- -- -- -- -- -- -- -- -- -- -- -- --' : '50: -- 51 -- -- -- -- -- -- -- -- -- -- -- -- -- --')
            : '50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --',
          addrHex.startsWith('6')
            ? (active.rtc.installed ? '60: -- -- -- -- -- -- -- -- UU -- -- -- -- -- -- --' : '60: -- -- -- -- -- -- -- -- 68 -- -- -- -- -- -- --')
            : '60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --',
          '70: -- -- -- -- -- -- -- --'
        ],
        notes: active.rtc.installed
          ? `${active.rtc.i2cAddress} UU indicates chip ${active.rtc.chipModel} bound to kernel driver ${active.rtc.driverModule}`
          : `${active.rtc.i2cAddress} raw slave address detected without active driver`
      };
    } else {
      responseObj = {
        error: -1,
        message: `Method ${method} not found on ubus path ${path}`
      };
    }

    const durationMs = Math.round(performance.now() - start + 8);
    return {
      path,
      method,
      params,
      response: JSON.stringify(responseObj, null, 2),
      durationMs
    };
  }

  // Cross-Layer Sync & Local Master NTP Methods
  public getCrossLayerSyncStatus(): CrossLayerSyncStatus {
    const active = this.getActiveLinksys();
    const driftMs = Math.abs(active.rtc.systemTimeEpoch - active.rtc.hardwareTimeEpoch);
    const allWansDown = this.wans.every(w => w.status === 'down');

    let integrityScore = 100;
    if (!active.rtc.installed) integrityScore -= 40;
    if (active.rtc.isSimulated1970Bug) integrityScore -= 50;
    if (driftMs > 1000) integrityScore -= 15;
    if (allWansDown && !this.localMasterNtpActive) integrityScore -= 30;

    return {
      mikrotikClockEpoch: active.rtc.systemTimeEpoch,
      mikrotikClockString: active.rtc.systemTimeString,
      linksysRtcEpoch: active.rtc.hardwareTimeEpoch,
      linksysRtcString: active.rtc.hardwareTimeString,
      driftMs: Math.round(driftMs),
      isSyncLocked: active.rtc.installed && !active.rtc.isSimulated1970Bug && driftMs < 500,
      localMasterNtpActive: this.localMasterNtpActive,
      ntpStratumLevel: this.localMasterNtpActive ? 1 : 2,
      forensicIntegrityScore: Math.max(0, integrityScore)
    };
  }

  public toggleLocalMasterNtp() {
    this.localMasterNtpActive = !this.localMasterNtpActive;
    const active = this.getActiveLinksys();
    this.addEvent({
      type: this.localMasterNtpActive ? 'link_up' : 'link_down',
      title: `[Cross-Layer] Local Master NTP ${this.localMasterNtpActive ? 'Diaktifkan' : 'Dinonaktifkan'}`,
      description: this.localMasterNtpActive
        ? `Router Linksys OpenWrt (${active.lanIp}) bertindak sebagai Stratum 1 Master NTP Server untuk MikroTik RouterOS melalui hardware clock DS3231.`
        : `MikroTik RouterOS dilepaskan dari NTP Linksys. Jam MikroTik kini rentan reset jika reboot saat seluruh koneksi WAN terputus.`,
      severity: this.localMasterNtpActive ? 'success' : 'warning'
    });
    this.notify();
  }

  // Automated Failover Benchmarking Engine
  public getBenchmarks(): FailoverBenchmarkResult[] {
    return this.failoverBenchmarks;
  }

  public runAutomatedFailoverBenchmark(targetWanId: WanId): FailoverBenchmarkResult {
    const wan = this.wans.find(w => w.id === targetWanId) || this.wans[0];
    const active = this.getActiveLinksys();
    const aggregateBefore = this.getAggregateMetrics();

    // Measurement simulation based on RouterOS v7 PCC behavior
    const detectionDelayMs = Math.floor(350 + Math.random() * 180); // 350-530 ms
    const packetLossPct = Number((0.4 + Math.random() * 1.5).toFixed(1)); // 0.4 - 1.9%
    const convergenceTimeMs = Math.floor(580 + Math.random() * 420); // 580 - 1000 ms
    const totalSwitchTimeMs = detectionDelayMs + convergenceTimeMs;
    const failbackTimeMs = Math.floor(1200 + Math.random() * 900);

    const otherActiveWan = this.wans.find(w => w.id !== targetWanId && w.status === 'active');
    const newActiveLabel = otherActiveWan ? `${otherActiveWan.name.split(' - ')[0]} (100% Load Balance Active)` : 'WAN Cadangan (LTE Orbit)';

    const result: FailoverBenchmarkResult = {
      id: `bm-${Date.now().toString(36)}`,
      testName: `Pengujian Reaksi Failover: ${wan.name.split(' - ')[0]} Terputus`,
      testedWanId: targetWanId,
      wanName: wan.name,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      rtcTimestamp: active.rtc.hardwareTimeString,
      detectionDelayMs,
      packetLossPctDuringFailover: packetLossPct,
      convergenceTimeMs,
      totalSwitchTimeMs,
      failbackTimeMs,
      activeWanBefore: `${wan.name.split(' - ')[0]} (Aktif)`,
      activeWanAfter: newActiveLabel,
      qosBefore: aggregateBefore.qos.overallCategory,
      qosAfter: packetLossPct > 1.5 ? 'Baik' : 'Sangat Baik',
      status: totalSwitchTimeMs < 1500 ? 'passed' : 'warning',
      notes: `Sistem mendeteksi kegagalan link dalam ${detectionDelayMs} ms. Rute default dialihkan ke ${newActiveLabel} dalam ${convergenceTimeMs} ms dengan packet loss transisi ${packetLossPct}%. Timestamp dicatat valid oleh RTC ${active.rtc.chipModel.split(' ')[0]}.`
    };

    this.failoverBenchmarks.unshift(result);
    this.addEvent({
      type: 'failover',
      title: `[Audit NOC] Uji Failover Selesai: ${wan.name.split(' - ')[0]}`,
      description: `Waktu Reaksi: ${totalSwitchTimeMs} ms (Deteksi: ${detectionDelayMs} ms, Konvergensi: ${convergenceTimeMs} ms, Packet Drop: ${packetLossPct}%). Disimpan ke repositori telemetri audit NOC.`,
      severity: result.status === 'passed' ? 'success' : 'warning'
    });
    this.notify();
    return result;
  }

  // Wi-Fi Site Survey / Spectrum Analyzer
  public getWifiScanResults(band: '2.4GHz' | '5GHz'): WifiScanResult[] {
    return this.wifiScans[band] || [];
  }

  public runWifiSiteSurvey(band: '2.4GHz' | '5GHz'): WifiScanResult[] {
    const active = this.getActiveLinksys();
    // Simulate radio RF scan
    this.addEvent({
      type: 'load_balance',
      title: `[${active.name}] Site Survey Spektrum Wi-Fi ${band} Dimulai`,
      description: `Perintah "iwinfo scan" memindai seluruh channel ${band} untuk mendeteksi co-channel interference dan AP tetangga.`,
      severity: 'info'
    });

    // Add noise/variation
    this.wifiScans[band] = this.wifiScans[band].map(scan => ({
      ...scan,
      signalDbm: Math.max(-90, Math.min(-25, scan.signalDbm + Math.round((Math.random() - 0.5) * 6))),
      qualityPct: Math.max(30, Math.min(100, scan.qualityPct + Math.round((Math.random() - 0.5) * 8)))
    }));

    this.notify();
    return this.wifiScans[band];
  }

  // Raw Telemetry Exporters for NOC Audit
  public exportTelemetryCsv(): string {
    const active = this.getActiveLinksys();
    const headers = [
      'timestamp_iso',
      'rtc_hardware_time',
      'total_rx_mbps',
      'total_tx_mbps',
      'wan1_rx_mbps',
      'wan1_tx_mbps',
      'wan1_status',
      'wan2_rx_mbps',
      'wan2_tx_mbps',
      'wan2_status',
      'wan3_rx_mbps',
      'wan3_tx_mbps',
      'wan3_status',
      'avg_latency_ms',
      'avg_jitter_ms',
      'avg_packet_loss_pct',
      'tiphon_category',
      'active_wan_count',
      'mikrotik_cpu_pct',
      'linksys_rtc_chip',
      'linksys_rtc_battery_v'
    ].join(',');

    const historyLen = this.wans[0].history.length;
    const rows = this.wans[0].history.map((pt, idx) => {
      const w1 = this.wans[0].history[idx] || pt;
      const w2 = this.wans[1].history[idx] || pt;
      const w3 = this.wans[2].history[idx] || pt;
      const totRx = (w1.rxMbps + w2.rxMbps + w3.rxMbps).toFixed(2);
      const totTx = (w1.txMbps + w2.txMbps + w3.txMbps).toFixed(2);
      const avgLat = ((w1.latencyMs + w2.latencyMs + w3.latencyMs) / 3).toFixed(1);
      const avgJit = ((w1.jitterMs + w2.jitterMs + w3.jitterMs) / 3).toFixed(2);
      const avgLoss = ((w1.packetLossPct + w2.packetLossPct + w3.packetLossPct) / 3).toFixed(2);

      return [
        new Date(pt.timestamp).toISOString(),
        active.rtc.hardwareTimeString,
        totRx,
        totTx,
        w1.rxMbps,
        w1.txMbps,
        this.wans[0].status,
        w2.rxMbps,
        w2.txMbps,
        this.wans[1].status,
        w3.rxMbps,
        w3.txMbps,
        this.wans[2].status,
        avgLat,
        avgJit,
        avgLoss,
        evaluateQoS(Number(totRx), Number(avgLat), Number(avgJit), Number(avgLoss)).overallCategory,
        this.wans.filter(w => w.status === 'active').length,
        this.router.cpuLoadPct,
        `"${active.rtc.chipModel}"`,
        active.rtc.batteryVoltage
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  public exportTelemetryJson(): string {
    const active = this.getActiveLinksys();
    const aggregate = this.getAggregateMetrics();
    const payload = {
      metadata: {
        exportDate: new Date().toISOString(),
        projectTitle: 'INTEGRASI API ROUTER UNTUK SISTEM MONITORING KINERJA MULTI-WAN BERBASIS WEB REAL TIME',
        coreRouter: this.router.model,
        edgeRouter: active.model,
        hardwareRtc: active.rtc.chipModel,
        rtcAddress: active.rtc.i2cAddress,
        evaluationStandard: 'TIPHON (Throughput, Delay, Jitter, Packet Loss)'
      },
      aggregateSummary: aggregate,
      wans: this.wans,
      linksysDevice: active,
      failoverBenchmarks: this.failoverBenchmarks,
      routes: this.routes,
      crossLayerSync: this.getCrossLayerSyncStatus()
    };
    return JSON.stringify(payload, null, 2);
  }

  public exportFailoverLogCsv(): string {
    const headers = [
      'benchmark_id',
      'test_name',
      'tested_wan',
      'timestamp',
      'rtc_timestamp',
      'detection_delay_ms',
      'packet_loss_pct',
      'convergence_time_ms',
      'total_switch_time_ms',
      'failback_time_ms',
      'active_wan_after',
      'qos_after',
      'status',
      'notes'
    ].join(',');

    const rows = this.failoverBenchmarks.map(bm => [
      bm.id,
      `"${bm.testName}"`,
      `"${bm.wanName}"`,
      bm.timestamp,
      bm.rtcTimestamp,
      bm.detectionDelayMs,
      bm.packetLossPctDuringFailover,
      bm.convergenceTimeMs,
      bm.totalSwitchTimeMs,
      bm.failbackTimeMs,
      `"${bm.activeWanAfter}"`,
      bm.qosAfter,
      bm.status,
      `"${bm.notes}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  public getPccConnections(): PccConnection[] {
    return JSON.parse(JSON.stringify(this.pccConnections));
  }

  public simulateNewPccConnection(params?: Partial<PccConnection>): PccConnection {
    const id = `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const protocols: ('TCP' | 'UDP')[] = ['TCP', 'UDP'];
    const protocol = params?.protocol || (Math.random() > 0.3 ? 'TCP' : 'UDP');
    const services = [
      { name: 'YouTube 4K UltraHD', port: 443, ip: '142.250.190.46', rx: 14200, tx: 320 },
      { name: 'Google Meet VoIP HD', port: 443, ip: '172.217.16.206', rx: 3200, tx: 2800 },
      { name: 'Zoom Conference Video', port: 8801, ip: '69.174.57.100', rx: 4100, tx: 3600 },
      { name: 'SIAKAD Web Portal (HTTPS)', port: 443, ip: '103.111.201.25', rx: 1850, tx: 410 },
      { name: 'Valorant Riot Game Server', port: 7000, ip: '162.249.72.1', rx: 450, tx: 420 },
      { name: 'Steam CDN Game Download', port: 80, ip: '23.48.200.12', rx: 28500, tx: 650 },
      { name: 'SSH Remote Shell NOC', port: 22, ip: '185.199.108.153', rx: 120, tx: 110 }
    ];
    const defaultSvc = services[Math.floor(Math.random() * services.length)];
    const serviceName = params?.serviceName || defaultSvc.name;
    const dstPort = params?.dstPort || defaultSvc.port;
    const dstIp = params?.dstIp || defaultSvc.ip;
    const srcPort = params?.srcPort || Math.floor(40000 + Math.random() * 25000);
    const clientIps = ['192.168.1.102', '192.168.1.105', '192.168.1.110', '192.168.1.115', '192.168.1.120'];
    const srcIp = params?.srcIp || clientIps[Math.floor(Math.random() * clientIps.length)];

    // Evaluate PCC hash slot based on active WAN status
    const wan1 = this.wans[0];
    const wan2 = this.wans[1];
    const wan3 = this.wans[2];

    let outInterface: WanId = 'ether1-wan1';
    let pccHashSlot = '3/0';
    let routingMark = 'to_WAN1';
    let connectionMark = 'conn_wan1';

    const randSlot = Math.floor(Math.random() * 3);
    if (randSlot === 0 || randSlot === 1) {
      if (wan1.status === 'active') {
        outInterface = 'ether1-wan1';
        pccHashSlot = randSlot === 0 ? '3/0' : '3/1';
        routingMark = 'to_WAN1';
        connectionMark = 'conn_wan1';
      } else if (wan2.status === 'active') {
        outInterface = 'ether2-wan2';
        pccHashSlot = '3/1';
        routingMark = 'to_WAN2';
        connectionMark = 'conn_wan2';
      } else {
        outInterface = 'ether3-wan3';
        pccHashSlot = '3/2';
        routingMark = 'to_WAN3_Backup';
        connectionMark = 'conn_wan3';
      }
    } else {
      if (wan2.status === 'active') {
        outInterface = 'ether2-wan2';
        pccHashSlot = '3/1';
        routingMark = 'to_WAN2';
        connectionMark = 'conn_wan2';
      } else if (wan1.status === 'active') {
        outInterface = 'ether1-wan1';
        pccHashSlot = '3/0';
        routingMark = 'to_WAN1';
        connectionMark = 'conn_wan1';
      } else {
        outInterface = 'ether3-wan3';
        pccHashSlot = '3/2';
        routingMark = 'to_WAN3_Backup';
        connectionMark = 'conn_wan3';
      }
    }

    const newConn: PccConnection = {
      id,
      protocol,
      srcIp,
      srcPort,
      dstIp,
      dstPort,
      serviceName,
      pccHashSlot: params?.pccHashSlot || pccHashSlot,
      routingMark: params?.routingMark || routingMark,
      connectionMark: params?.connectionMark || connectionMark,
      outInterface: (params?.outInterface as WanId) || outInterface,
      rxRateKbps: params?.rxRateKbps || defaultSvc.rx,
      txRateKbps: params?.txRateKbps || defaultSvc.tx,
      bytesTransferred: params?.bytesTransferred || Math.floor(102400 + Math.random() * 5000000),
      timeoutSec: params?.timeoutSec || (protocol === 'TCP' ? 86400 : 180),
      durationSec: params?.durationSec || 12,
      tcpState: protocol === 'TCP' ? 'ESTABLISHED' : 'UDP_STREAM'
    };

    this.pccConnections.unshift(newConn);
    this.addEvent({
      type: 'load_balance',
      interfaceId: newConn.outInterface,
      title: `[PCC Conntrack] Sesi Baru Terpetakan: ${newConn.serviceName}`,
      description: `Aliran soket ${newConn.srcIp}:${newConn.srcPort} -> ${newConn.dstIp}:${newConn.dstPort} (${newConn.protocol}) dipetakan ke slot hash ${newConn.pccHashSlot} -> antarmuka ${newConn.outInterface}.`,
      severity: 'info'
    });
    this.notify();
    return newConn;
  }

  public terminatePccConnection(id: string): boolean {
    const idx = this.pccConnections.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const removed = this.pccConnections[idx];
    this.pccConnections.splice(idx, 1);
    this.addEvent({
      type: 'load_balance',
      interfaceId: removed.outInterface,
      title: `[PCC Conntrack] Sesi Diputus Manual: ${removed.serviceName}`,
      description: `Koneksi ${removed.srcIp}:${removed.srcPort} -> ${removed.dstIp}:${removed.dstPort} telah dihapus dari tabel soket /ip/firewall/connection.`,
      severity: 'warning'
    });
    this.notify();
    return true;
  }

  public resetPccConnections(): void {
    this.pccConnections = JSON.parse(JSON.stringify(INITIAL_PCC_CONNECTIONS));
    this.notify();
  }

  public pingNetwatchTarget(targetId: string): string {
    const target = this.netwatchTargets.find(t => t.id === targetId || t.host === targetId);
    if (!target) return 'ERROR: Target netwatch tidak ditemukan.';

    const isWanDown =
      (target.id === 'nw-1' && this.wans[0].status === 'down') ||
      (target.id === 'nw-2' && this.wans[1].status === 'down') ||
      (target.id === 'nw-3' && this.wans[2].status === 'down');

    if (isWanDown) {
      target.status = 'down';
      target.lastRttMs = 0;
      target.packetLossPct = 100;
      this.notify();
      return `  SEQ HOST                                     SIZE TTL TIME  STATUS
    0 ${target.host.padEnd(40)} --  --    --  timeout
    1 ${target.host.padEnd(40)} --  --    --  timeout
    2 ${target.host.padEnd(40)} --  --    --  timeout
    3 ${target.host.padEnd(40)} --  --    --  timeout
    sent=4 received=0 packet-loss=100% (Link Interface Down)`;
    }

    const rtt = Math.floor(8 + Math.random() * 12);
    target.status = 'up';
    target.lastRttMs = rtt;
    target.packetLossPct = 0;
    this.notify();

    return `  SEQ HOST                                     SIZE TTL TIME  STATUS
    0 ${target.host.padEnd(40)} 56  64 ${rtt}ms
    1 ${target.host.padEnd(40)} 56  64 ${rtt + 1}ms
    2 ${target.host.padEnd(40)} 56  64 ${rtt - 1}ms
    3 ${target.host.padEnd(40)} 56  64 ${rtt}ms
    sent=4 received=4 packet-loss=0% min-rtt=${rtt - 1}ms avg-rtt=${rtt}ms max-rtt=${rtt + 1}ms`;
  }

  public getNetwatchTargets(): NetwatchTarget[] {
    return JSON.parse(JSON.stringify(this.netwatchTargets));
  }

  public getTelegramAlertConfig(): TelegramAlertConfig {
    return { ...this.telegramAlertConfig };
  }

  public updateTelegramAlertConfig(updates: Partial<TelegramAlertConfig>): void {
    this.telegramAlertConfig = { ...this.telegramAlertConfig, ...updates };
    this.notify();
  }

  public dispatchTelegramNotification(title: string, message: string): void {
    this.telegramAlertConfig.sentCount++;
    const payload = {
      chat_id: this.telegramAlertConfig.chatId,
      text: `<b>🚨 [SISTEM MONITORING MULTI-WAN]</b>\n<b>Kejadian:</b> ${title}\n<b>Detail:</b> ${message}\n<b>Waktu Gateway:</b> ${new Date().toLocaleTimeString('id-ID')}\n<b>RTC DS3231:</b> ${this.getActiveRtc().hardwareTimeString}`,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
    this.telegramAlertConfig.lastSentPayload = JSON.stringify(payload, null, 2);
    this.addEvent({
      type: 'failover',
      title: 'Notifikasi Telegram Terkirim',
      description: `Pesan disiarkan ke Telegram Channel (${this.telegramAlertConfig.chatId}): ${title}`,
      severity: 'warning'
    });
    this.notify();
  }

  public getRtcRegisterMap(): RtcRegisterMap[] {
    const d = new Date(this.getActiveRtc().hardwareTimeEpoch);
    const sec = d.getSeconds();
    const min = d.getMinutes();
    const hr = d.getHours();
    const day = d.getDay() === 0 ? 7 : d.getDay();
    const date = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() % 100;

    const toBcdHex = (val: number): string => '0x' + (((Math.floor(val / 10) << 4) | (val % 10)).toString(16).toUpperCase().padStart(2, '0'));
    const toBinaryStr = (val: number): string => (((Math.floor(val / 10) << 4) | (val % 10)).toString(2).padStart(8, '0'));

    return [
      {
        address: '0x00',
        name: 'SECONDS',
        hexValue: toBcdHex(sec),
        binaryValue: toBinaryStr(sec),
        decodedValue: `${sec}s (BCD)`,
        description: 'Detik 00-59 dalam format BCD 7-bit'
      },
      {
        address: '0x01',
        name: 'MINUTES',
        hexValue: toBcdHex(min),
        binaryValue: toBinaryStr(min),
        decodedValue: `${min}m (BCD)`,
        description: 'Menit 00-59 dalam format BCD 7-bit'
      },
      {
        address: '0x02',
        name: 'HOURS',
        hexValue: toBcdHex(hr),
        binaryValue: toBinaryStr(hr),
        decodedValue: `${hr}:00 (Mode 24 Jam)`,
        description: 'Jam 00-23 dalam format 24-jam BCD (Bit 6=0)'
      },
      {
        address: '0x03',
        name: 'DAY',
        hexValue: `0x0${day}`,
        binaryValue: `00000${day.toString(2).padStart(3, '0')}`,
        decodedValue: `Hari ke-${day}`,
        description: 'Hari dalam seminggu 1-7 (Senin-Minggu)'
      },
      {
        address: '0x04',
        name: 'DATE',
        hexValue: toBcdHex(date),
        binaryValue: toBinaryStr(date),
        decodedValue: `Tanggal ${date}`,
        description: 'Tanggal dalam bulan 01-31 format BCD'
      },
      {
        address: '0x05',
        name: 'MONTH/CENTURY',
        hexValue: toBcdHex(month),
        binaryValue: toBinaryStr(month),
        decodedValue: `Bulan ${month} (Century bit = 0)`,
        description: 'Bulan 01-12 dan flag abad ke-21'
      },
      {
        address: '0x06',
        name: 'YEAR',
        hexValue: toBcdHex(year),
        binaryValue: toBinaryStr(year),
        decodedValue: `20${year} Masehi`,
        description: 'Tahun 00-99 (Offset abad 2000)'
      },
      {
        address: '0x0E',
        name: 'CONTROL',
        hexValue: '0x1C',
        binaryValue: '00011100',
        decodedValue: 'INTCN=1, BBSQW=0, RS=8.192kHz',
        description: 'Kontrol interupsi osilator & gelombang persegi'
      },
      {
        address: '0x0F',
        name: 'STATUS',
        hexValue: this.getActiveRtc().powerLossFlag ? '0x88' : '0x08',
        binaryValue: this.getActiveRtc().powerLossFlag ? '10001000' : '00001000',
        decodedValue: this.getActiveRtc().powerLossFlag ? 'OSF=1 (Osilator Stop/Power Loss)' : 'OSF=0, EN32kHz=1, BSY=0',
        description: 'Status flag osilator TCXO dan pin 32.768 kHz'
      },
      {
        address: '0x10',
        name: 'AGING_OFFSET',
        hexValue: '0x00',
        binaryValue: '00000000',
        decodedValue: '0 ppm (Kalibrasi Pabrik Maxim)',
        description: 'Kompensasi penuaan kristal kuarsa (±0.1ppm/LSB)'
      },
      {
        address: '0x11',
        name: 'TEMP_MSB',
        hexValue: '0x1C',
        binaryValue: '00011100',
        decodedValue: '28°C (Nilai bulat)',
        description: 'MSB sensor suhu internal kompensasi TCXO'
      },
      {
        address: '0x12',
        name: 'TEMP_LSB',
        hexValue: '0x80',
        binaryValue: '10000000',
        decodedValue: '+0.50°C (Total: 28.50°C)',
        description: 'LSB sensor suhu dengan resolusi 0.25°C (bit 7:6)'
      }
    ];
  }

  public executeCliCommand(rawCmd: string): string {
    const cmd = rawCmd.trim().replace(/^\//, '');
    const lower = cmd.toLowerCase();

    if (!cmd) {
      return '[admin@MikroTik-CCR2004] >';
    }

    if (lower.startsWith('ip route print') || lower === 'ip route') {
      const activeWans = this.wans.map((w, idx) => {
        const flag = w.status === 'active' ? 'As' : ' s';
        const mark = idx === 0 ? 'to_WAN1' : idx === 1 ? 'to_WAN2' : 'to_WAN3_Backup';
        return `${idx}  ${flag} 0.0.0.0/0        ${w.gateway.padEnd(16)} ${w.distance}         ${mark}`;
      });
      return `Flags: D - DYNAMIC; A - ACTIVE; c - CONNECT, s - STATIC, v - VPN
Columns: DST-ADDRESS, GATEWAY, DISTANCE, ROUTING-MARK
#     DST-ADDRESS      GATEWAY          DISTANCE  ROUTING-MARK
${activeWans.join('\n')}
3  DAc 192.168.1.0/24   ether1-indihome  0
4  DAc 192.168.2.0/24   ether2-biznet    0
5  DAc 192.168.8.0/24   ether3-orbit     0
6  DAc 192.168.88.0/24  bridge-lan       0`;
    }

    if (lower.startsWith('ip firewall mangle print') || lower === 'ip firewall mangle') {
      return `Flags: X - disabled, I - invalid, D - dynamic
 0    ;;; PCC 3/0 -> WAN1 IndiHome
      chain=prerouting action=mark-connection new-connection-mark=conn_wan1 passthrough=yes
      dst-address-type=!local in-interface=bridge-lan
      per-connection-classifier=both-addresses-and-ports:3/0

 1    ;;; PCC 3/1 -> WAN2 Biznet
      chain=prerouting action=mark-connection new-connection-mark=conn_wan2 passthrough=yes
      dst-address-type=!local in-interface=bridge-lan
      per-connection-classifier=both-addresses-and-ports:3/1

 2    ;;; PCC 3/2 -> WAN3 Orbit (LTE Standby)
      chain=prerouting action=mark-connection new-connection-mark=conn_wan3 passthrough=yes
      dst-address-type=!local in-interface=bridge-lan
      per-connection-classifier=both-addresses-and-ports:3/2

 3    ;;; Routing Mark WAN1
      chain=prerouting action=mark-routing new-routing-mark=to_WAN1 passthrough=no
      connection-mark=conn_wan1 in-interface=bridge-lan

 4    ;;; Routing Mark WAN2
      chain=prerouting action=mark-routing new-routing-mark=to_WAN2 passthrough=no
      connection-mark=conn_wan2 in-interface=bridge-lan

 5    ;;; Routing Mark WAN3 Backup
      chain=prerouting action=mark-routing new-routing-mark=to_WAN3_Backup passthrough=no
      connection-mark=conn_wan3 in-interface=bridge-lan`;
    }

    if (lower.startsWith('ip firewall connection print') || lower === 'ip firewall connection') {
      const lines = this.pccConnections.map((c, i) => {
        return `${i.toString().padStart(2, ' ')} ${c.protocol.padEnd(4)} ${c.srcIp}:${c.srcPort} -> ${c.dstIp}:${c.dstPort} mark=${c.connectionMark} out=${c.outInterface} [${c.tcpState}]`;
      });
      return `Flags: E - established, A - assured, C - confirmed, D - dying, F - fasttrack
#  PRT  CONNECTION (SRC -> DST)                     MARK           OUT-IFACE        STATE
${lines.join('\n')}`;
    }

    if (lower.startsWith('tool netwatch print') || lower === 'tool netwatch') {
      const lines = this.netwatchTargets.map((nw, i) => {
        const flag = nw.status === 'up' ? 'U' : 'D';
        return `${i} ${flag} host=${nw.host.padEnd(10)} interval=${nw.intervalSec}s timeout=${nw.timeoutMs}ms status=${nw.status} loss=${nw.packetLossPct}% rtt=${nw.lastRttMs}ms since=${nw.since}`;
      });
      return `Flags: X - disabled, R - running, U - up, D - down
#   TARGET HOST   INTERVAL TIMEOUT  STATUS  LOSS  RTT   SINCE
${lines.join('\n')}`;
    }

    if (lower.startsWith('system resource print') || lower === 'system resource') {
      return `                   uptime: ${this.router.uptimeString}
                  version: ${this.router.version}
               build-time: 2024-03-20 14:12:00
              free-memory: ${this.router.freeMemoryMb}MiB
             total-memory: ${this.router.totalMemoryMb}MiB
                      cpu: ARMv8 Cortex-A57
                cpu-count: ${this.router.cpuCount}
            cpu-frequency: ${this.router.cpuFrequencyMhz}MHz
                 cpu-load: ${this.router.cpuLoadPct}%
           free-hdd-space: ${this.router.freeHddMb}MiB
          total-hdd-space: ${this.router.totalHddMb}MiB
  write-sect-since-reboot: 18240
         write-sect-total: 391820
               board-name: CCR2004-1G-12S+2XS
                 platform: MikroTik RouterOS v7`;
    }

    if (lower.startsWith('system clock print') || lower === 'system clock') {
      const now = new Date();
      return `                  time: ${now.toLocaleTimeString('id-ID')}
                  date: ${now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
  time-zone-autodetect: yes
        time-zone-name: Asia/Jakarta
            gmt-offset: +07:00
            dst-active: no`;
    }

    if (lower.startsWith('system identity print') || lower === 'system identity') {
      return `name: Core-Gateway-MikroTik-CCR2004`;
    }

    if (lower.startsWith('interface monitor-traffic') || lower.startsWith('interface monitor')) {
      const lines = this.wans.map(w => {
        return `name: ${w.interfaceName} (${w.isp})
  rx-packets-per-second: ${Math.round(w.currentRxMbps * 820)}
  rx-bits-per-second: ${(w.currentRxMbps * 1000000).toLocaleString()}bps
  tx-packets-per-second: ${Math.round(w.currentTxMbps * 710)}
  tx-bits-per-second: ${(w.currentTxMbps * 1000000).toLocaleString()}bps`;
      });
      return lines.join('\n\n');
    }

    if (lower.startsWith('tool ping')) {
      const parts = cmd.split(' ');
      const host = parts[2] || '8.8.8.8';
      return `  SEQ HOST                                     SIZE TTL TIME  STATUS
    0 ${host.padEnd(40)} 56  64 12ms
    1 ${host.padEnd(40)} 56  64 11ms
    2 ${host.padEnd(40)} 56  64 14ms
    3 ${host.padEnd(40)} 56  64 13ms
    sent=4 received=4 packet-loss=0% min-rtt=11ms avg-rtt=12ms max-rtt=14ms`;
    }

    if (lower.startsWith('tool traceroute')) {
      return ` # ADDRESS                          LOSS SENT    LAST     AVG    BEST   WORST
 1 192.168.1.1                        0%    3   0.8ms   0.9ms   0.8ms   1.1ms
 2 10.12.0.1                          0%    3   6.4ms   6.2ms   5.9ms   6.8ms
 3 180.250.2.1                        0%    3  11.2ms  11.0ms  10.8ms  11.5ms
 4 1.1.1.1                            0%    3  13.4ms  13.1ms  12.8ms  13.9ms`;
    }

    if (lower === 'help' || lower === '?') {
      return `Daftar Perintah MikroTik RouterOS v7 yang Didukung:
  /ip/route/print detail             - Menampilkan tabel rute PCC dan status gateway failover
  /ip/firewall/mangle/print          - Menampilkan aturan PCC (both-addresses-and-ports)
  /ip/firewall/connection/print      - Menampilkan koneksi sesi real-time yang sedang ditangani
  /tool/netwatch/print               - Menampilkan probe target kesehatan multi-WAN Netwatch
  /system/resource/print             - Menampilkan status CPU, RAM, suhu, dan versi RouterOS
  /system/clock/print                - Menampilkan waktu sistem gateway saat ini
  /system/identity/print             - Menampilkan nama host router
  /interface/monitor-traffic         - Memantau laju bit per detik pada ether1, ether2, ether3
  /tool/ping <host>                  - Mengirim paket ICMP echo probe ke target host
  /tool/traceroute <host>            - Menelusuri jalur hop paket ke target`;
    }

    return `bad command name ${cmd} (line 1 column 1)`;
  }

  // Topology Architecture Management (Downstream vs Parallel VRRP vs Edge Offload)
  public getTopologyMode(): LinksysTopologyMode {
    return this.topologyMode;
  }

  public setTopologyMode(mode: LinksysTopologyMode): void {
    this.topologyMode = mode;
    this.addEvent({
      type: 'load_balance',
      title: `[Arsitektur Topologi Diubah] Mode: ${mode === 'downstream_sublayer' ? 'Bertingkat (Downstream Sub-Layer)' : mode === 'parallel_vrrp' ? 'Sejajar (VRRP High-Availability)' : 'Edge Dedicated Offload'}`,
      description: mode === 'downstream_sublayer'
        ? 'Arsitektur Hierarki Bertingkat aktif: Klien -> Linksys OpenWrt (Sub-layer AP & Master RTC DS3231) -> Trunk Gigabit -> Core MikroTik CCR2004 (PCC 3 WAN).'
        : mode === 'parallel_vrrp'
        ? 'Arsitektur Sejajar (VRRP High-Availability RFC 5798) aktif: Virtual IP Gateway 192.168.1.254 dibagi antara MikroTik CCR2004 (Master WAN1&2) dan Linksys OpenWrt (Backup WAN3 Orbit).'
        : 'Arsitektur Edge Offload aktif: Linksys menangani langsung WAN3 Orbit 4G LTE sebagai gerbang OOBM cadangan terisolasi.',
      severity: 'info'
    });
    this.notify();
  }

  public getVrrpMasterRouter(): 'mikrotik' | 'linksys' {
    return this.vrrpMasterRouter;
  }

  public toggleVrrpMaster(): void {
    this.vrrpMasterRouter = this.vrrpMasterRouter === 'mikrotik' ? 'linksys' : 'mikrotik';
    const activeName = this.vrrpMasterRouter === 'mikrotik' ? 'MikroTik CCR2004 Core' : 'Linksys OpenWrt Edge';
    const activePriority = this.vrrpMasterRouter === 'mikrotik' ? 255 : 100;
    this.addEvent({
      type: 'failover',
      title: `[VRRP HA Switchover] Gateway 192.168.1.254 Dialihkan ke ${activeName}`,
      description: `Protokol VRRP (RFC 5798) memindahkan peran MASTER ke ${activeName} (Priority: ${activePriority}). Lalu lintas klien dialihkan tanpa merubah konfigurasi IP perangkat klien.`,
      severity: 'warning'
    });
    this.notify();
  }

  public getTopologyArchitectureConfigs(): TopologyArchitectureConfig[] {
    return [
      {
        mode: 'downstream_sublayer',
        title: 'Model A: Arsitektur Hierarki Bertingkat (Downstream Access Gateway)',
        badge: 'Standar Kampus / Enterprise (Rekomendasi Utama)',
        sublabel: 'Linksys berada DI BAWAH MikroTik sebagai Access Layer AP & Stratum 1 Hardware RTC Time Feed',
        mikrotikRole: 'Core Gateway & RouterOS v7 PCC Multi-WAN (Semua WAN 1, 2, 3 terpusat di CCR2004)',
        linksysRole: 'Sub-Layer Access Gateway (Wi-Fi 6 MIMO AP, DHCP Klien Lab, Hardware RTC Master DS3231)',
        wanDistribution: 'WAN1 (IndiHome) + WAN2 (Biznet) + WAN3 (Orbit 4G) diatur utuh oleh MikroTik',
        timeSyncPath: 'Hardware RTC DS3231 Linksys -> NTP Broadcast UDP 123 -> MikroTik RouterOS Client',
        pros: [
          'Pemisahan peran bersih (Separation of Concerns): MikroTik fokus routing, Linksys fokus akses klien',
          'PCC Load Balancing 3 ISP terkelola secara sentral dan optimal dalam 1 routing table',
          'Hemat alamat IP publik dan efisiensi manajemen firewall mangle'
        ],
        cons: [
          'MikroTik menjadi Single Point of Failure (SPOF); jika CCR2004 mati, akses internet klien terputus',
          'Throughput seluruh klien dibatasi oleh kapasitas link trunk antara Linksys dan MikroTik'
        ],
        industryStandard: 'Cisco Three-Tier Architecture (Access -> Distribution/Core -> Edge WAN)'
      },
      {
        mode: 'parallel_vrrp',
        title: 'Model B: Arsitektur Sejajar (VRRP High-Availability Dual Gateway)',
        badge: 'Standar ISP NOC / Mission Critical (Zero Downtime)',
        sublabel: 'Linksys berada SEJAJAR dengan MikroTik berbagi Virtual Gateway IP 192.168.1.254 (RFC 5798)',
        vrrpVirtualIp: '192.168.1.254/24',
        vrrpVirtualMac: '00:00:5E:00:01:0A',
        mikrotikRole: 'VRRP Master (Priority 255) — Mengelola WAN 1 Fiber & WAN 2 Dedicated',
        linksysRole: 'VRRP Backup (Priority 100) — Mengelola Langsung WAN 3 Orbit LTE & Hardware RTC',
        wanDistribution: 'MikroTik tangani WAN 1 & WAN 2; Linksys tangani langsung WAN 3 Orbit 4G LTE',
        timeSyncPath: 'Linksys RTC sinkron lokal dan menyiarkan NTP Multicast ke MikroTik via LAN',
        pros: [
          'Toleransi kegagalan perangkat total (No Single Point of Failure); jika MikroTik mati/reboot, Linksys langsung take over dalam <1 detik',
          'WAN 3 Orbit 4G independen secara fisik, tetap hidup bahkan jika listrik rak MikroTik padam',
          'Klien tidak perlu mengubah default gateway karena menggunakan Virtual IP bersama'
        ],
        cons: [
          'Memerlukan konfigurasi protokol VRRP di kedua perangkat (RouterOS & OpenWrt keepalived)',
          'Algoritma PCC terpecah (MikroTik PCC WAN1 & WAN2, Linksys menangani WAN3 saat failover)'
        ],
        industryStandard: 'IETF RFC 5798 (Virtual Router Redundancy Protocol - VRRPv3)'
      },
      {
        mode: 'edge_offload',
        title: 'Model C: Arsitektur Dedicated Offload / Out-of-Band Management (OOBM)',
        badge: 'Standar Manajemen Data Center & ISP Edge',
        sublabel: 'Linksys sebagai Router Khusus WAN 3 Orbit LTE & Monitoring OOBM Terisolasi',
        mikrotikRole: 'Main Production Gateway (Trafik Produksi WAN 1 IndiHome & WAN 2 Biznet)',
        linksysRole: 'Dedicated Management & Out-of-Band (OOBM) Gateway via WAN 3 Orbit LTE',
        wanDistribution: 'Trafik user lewat MikroTik (WAN 1 & 2); Trafik telemetri, API & remote via Linksys (WAN 3)',
        timeSyncPath: 'Linksys sebagai Dedicated Time Server OOBM mandiri',
        pros: [
          'Akses remote ke router MikroTik selalu aman melalui jaringan OOBM seluler terpisah',
          'Trafik telemetri monitoring tidak membebani utilisasi bandwidth produksi',
          'Pemisahan security zone yang sangat ketat (Management plane vs Data plane)'
        ],
        cons: [
          'Klien biasa tidak dapat memakai WAN 3 kecuali rute policy dialihkan manual',
          'Biaya paket data seluler khusus untuk jalur manajemen'
        ],
        industryStandard: 'NIST SP 800-160 / ISO 27001 Out-of-Band Network Architecture'
      }
    ];
  }
}

export const networkEngine = new NetworkEngine();
