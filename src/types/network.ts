export type WanId = 'ether1-wan1' | 'ether2-wan2' | 'ether3-wan3';

export type LinkStatus = 'active' | 'standby' | 'down' | 'degraded';
export type LinkRole = 'primary' | 'secondary' | 'failover';

export interface TelemetryPoint {
  timestamp: number;
  timeLabel: string;
  rxMbps: number;
  txMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
}

export interface WanTargetProbe {
  target: string;
  name: string;
  latencyMs: number;
  jitterMs: number;
  lossPct: number;
  status: 'ok' | 'degraded' | 'down';
}

export type BufferbloatGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface WanInterface {
  id: WanId;
  name: string;
  isp: string;
  interfaceName: string;
  role: LinkRole;
  status: LinkStatus;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dnsServers: string[];
  distance: number;
  pccWeight: number; // e.g. 2 for WAN1, 1 for WAN2, 1 for WAN3
  maxBandwidthMbps: number;
  currentRxMbps: number;
  currentTxMbps: number;
  peakRxMbps: number;
  peakTxMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
  totalRxBytes: number;
  totalTxBytes: number;
  uptimeSeconds: number;
  failoverCount: number;
  lastFailoverTime?: string;
  healthScore: number; // 0 - 100%
  mosScore: number; // 1.0 - 4.5 (Mean Opinion Score)
  bufferbloatGrade: BufferbloatGrade;
  mtu: number;
  droppedPackets: { rx: number; tx: number };
  switchoverLatencyMs?: number;
  targetProbes: WanTargetProbe[];
  history: TelemetryPoint[];
}

export type LoadBalancingMode = 'pcc' | 'ecmp' | 'failover_recursive' | 'pbr_qos';

export interface LoadBalancingConfig {
  mode: LoadBalancingMode;
  pccClassifier: 'src-address' | 'src-address-and-port' | 'both-addresses-and-ports';
  checkGatewayProtocol: 'ping' | 'arp';
  checkGatewayIntervalSec: number;
  failoverThresholdAttempts: number;
  activeBalancingRatio: string;
  failoverTriggerCount: number;
  lastFailoverSwitchMs: number;
}

export interface TrafficCategoryStat {
  category: 'web' | 'video' | 'gaming_voip' | 'p2p_bulk';
  label: string;
  totalMbps: number;
  allocatedWan: WanId;
  qosPriority: 'High' | 'Normal' | 'Best Effort';
  activeSessions: number;
}

export interface RouterResource {
  model: string;
  platform: string;
  version: string;
  cpuLoadPct: number;
  cpuFrequencyMhz: number;
  cpuCount: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  totalHddMb: number;
  freeHddMb: number;
  boardTempC: number;
  voltageV: number;
  uptimeString: string;
  architecture: string;
}

export interface RouteEntry {
  id: string;
  dstAddress: string;
  gateway: string;
  interfaceId: WanId;
  distance: number;
  routingMark?: string;
  active: boolean;
  dynamic: boolean;
  comment: string;
}

export type TiphonCategory = 'Sangat Baik' | 'Baik' | 'Sedang' | 'Buruk';

export interface TiphonMetric {
  value: number;
  unit: string;
  category: TiphonCategory;
  indexScore: number; // 4: Sangat Baik, 3: Baik, 2: Sedang, 1: Buruk
  thresholdReference: string;
}

export interface QoSEvaluation {
  throughput: TiphonMetric;
  delay: TiphonMetric;
  jitter: TiphonMetric;
  packetLoss: TiphonMetric;
  overallScore: number;
  overallCategory: TiphonCategory;
}

export interface NetworkEvent {
  id: string;
  timestamp: string;
  type: 'failover' | 'failback' | 'link_down' | 'link_up' | 'packet_loss' | 'latency_spike' | 'load_balance';
  interfaceId?: WanId;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export interface RouterApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT';
  endpoint: string;
  statusCode: number;
  durationMs: number;
  requestPayload?: string;
  responsePayload: string;
}

export interface RouterApiConfig {
  mode: 'simulator' | 'live_routeros';
  endpointUrl: string;
  username: string;
  tokenOrPassword?: string;
  pollIntervalMs: number;
  isConnected: boolean;
  lastSyncTimestamp: number;
}

export interface AuditNocMetadata {
  operatorName: string;
  operatorId: string;
  projectTitle: string;
  department: string;
  supervisor: string;
  institution: string;
  testDate: string;
  notes: string;
}

export interface WifiConnectedClient {
  hostname: string;
  ip: string;
  mac: string;
  signalDbm: number;
  rxRateMbps: number;
  txRateMbps: number;
  connectedTime: string;
}

export interface WifiRadio {
  id: string; // 'radio0' | 'radio1'
  band: '2.4GHz' | '5GHz';
  interfaceName: string; // 'wlan0' | 'wlan1'
  enabled: boolean;
  ssid: string;
  channel: number;
  frequencyMhz: number;
  widthMhz: number;
  txPowerDbm: number;
  encryption: string;
  bssid: string;
  connectedClients: WifiConnectedClient[];
}

export interface LinksysWirelessConfig {
  wifiMasterEnabled: boolean;
  radios: WifiRadio[];
}

export interface LinksysDevice {
  id: string;
  name: string;
  model: string;
  hostname: string;
  openwrtVersion: string;
  kernelVersion: string;
  target: string;
  soc: string;
  memoryTotalMb: number;
  memoryFreeMb: number;
  flashSizeMb: number;
  cpuTempC: number;
  i2cBus: string;
  lanIp: string;
  macAddress: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  powerState: 'on' | 'off' | 'rebooting';
  remoteSshPort: number;
  remoteHttpPort: number;
  uptime: string;
  rtc: RtcSubsystem;
  wireless: LinksysWirelessConfig;
  optionalFeatures?: DeviceOptionalFeatures;
}

export interface DeviceOptionalFeatures {
  deviceRole?: 'gateway' | 'access_point' | 'backup_node' | 'forensic_probe';
  notes?: string;
  subnetMask?: string;
  gatewayIp?: string;
  dnsServer?: string;
  vlanId?: number | string;
  dhcpEnabled?: boolean;
  enableSyslog?: boolean;
  enableTimeDriftAlarm?: boolean;
  enableRtcThermalSync?: boolean;
  enableMwan3Sync?: boolean;
  autoHwclockSyncMinutes?: number;
}

export interface RtcSubsystem {
  installed: boolean;
  chipModel: string;
  devicePath: string;
  i2cAddress: string;
  driverModule: string;
  batteryVoltage: number;
  batteryStatus: 'Good' | 'Low' | 'Missing';
  hardwareTimeEpoch: number;
  hardwareTimeString: string;
  systemTimeEpoch: number;
  systemTimeString: string;
  ntpSyncStatus: 'synced' | 'unsynced' | 'searching';
  ntpServer: string;
  timeDriftPpm: number;
  rtcTempC: number;
  powerLossFlag: boolean;
  lastHwclockSync: string;
  isSimulated1970Bug: boolean;
}

export interface UbusCallResult {
  path: string;
  method: string;
  params?: Record<string, unknown>;
  response: string;
  durationMs: number;
}

export interface FailoverBenchmarkResult {
  id: string;
  testName: string;
  testedWanId: WanId;
  wanName: string;
  timestamp: string;
  rtcTimestamp: string;
  detectionDelayMs: number;
  packetLossPctDuringFailover: number;
  convergenceTimeMs: number;
  totalSwitchTimeMs: number;
  failbackTimeMs: number;
  activeWanBefore: string;
  activeWanAfter: string;
  qosBefore: TiphonCategory;
  qosAfter: TiphonCategory;
  status: 'passed' | 'warning' | 'failed';
  notes: string;
}

export interface WifiScanResult {
  bssid: string;
  ssid: string;
  channel: number;
  band: '2.4GHz' | '5GHz';
  signalDbm: number;
  qualityPct: number;
  encryption: string;
  channelWidth: number;
  isConflicting: boolean;
}

export interface CrossLayerSyncStatus {
  mikrotikClockEpoch: number;
  mikrotikClockString: string;
  linksysRtcEpoch: number;
  linksysRtcString: string;
  driftMs: number;
  isSyncLocked: boolean;
  localMasterNtpActive: boolean;
  ntpStratumLevel: number;
  forensicIntegrityScore: number;
}

export interface PccConnection {
  id: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  serviceName: string;
  pccHashSlot: string; // e.g. "3/0", "3/1", "3/2"
  connectionMark: string; // e.g. "conn_wan1", "conn_wan2", "conn_wan3"
  routingMark: string; // e.g. "to_WAN1", "to_WAN2", "to_WAN3"
  outInterface: WanId;
  rxRateKbps: number;
  txRateKbps: number;
  bytesTransferred: number;
  tcpState: 'ESTABLISHED' | 'TIME_WAIT' | 'SYN_SENT' | 'UDP_STREAM';
  timeoutSec: number;
  durationSec: number;
}

export interface NetwatchTarget {
  id: string;
  host: string;
  targetName: string;
  interfaceId: WanId;
  wanName: string;
  intervalSec: number;
  timeoutMs: number;
  status: 'up' | 'down' | 'testing';
  lastRttMs: number;
  packetLossPct: number;
  upScript: string;
  downScript: string;
  since: string;
}

export interface TerminalHistoryItem {
  id: string;
  timestamp: string;
  command: string;
  output: string;
  type: 'command' | 'output' | 'error' | 'system';
}

export interface TelegramAlertConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  soundEnabled: boolean;
  lastSentPayload?: string;
  sentCount: number;
}

export interface RtcRegisterMap {
  address: string;
  name: string;
  hexValue: string;
  binaryValue: string;
  decodedValue: string;
  description: string;
}

export type LinksysTopologyMode = 'downstream_sublayer' | 'parallel_vrrp' | 'edge_offload';

export interface TopologyArchitectureConfig {
  mode: LinksysTopologyMode;
  title: string;
  badge: string;
  sublabel: string;
  vrrpVirtualIp?: string;
  vrrpVirtualMac?: string;
  mikrotikRole: string;
  linksysRole: string;
  wanDistribution: string;
  timeSyncPath: string;
  pros: string[];
  cons: string[];
  industryStandard: string;
}


