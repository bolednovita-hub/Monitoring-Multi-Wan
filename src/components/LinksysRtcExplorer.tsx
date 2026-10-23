import React, { useState } from 'react';
import {
  Clock,
  Cpu,
  Terminal,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RotateCw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Server,
  Layers,
  BatteryCharging,
  Thermometer,
  Radio,
  FileCode,
  Copy,
  Check,
  Play,
  Plus,
  Pencil,
  Trash2,
  HardDrive,
  MapPin,
  Settings,
  Sliders,
  CheckCircle,
  Wifi,
  WifiOff,
  Power,
  Globe,
  Smartphone,
  Laptop,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Network,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Filter,
  Info
} from 'lucide-react';
import { LinksysDevice, RtcSubsystem, UbusCallResult, WifiRadio, WifiScanResult, CrossLayerSyncStatus, RtcRegisterMap } from '../types/network';

interface LinksysRtcExplorerProps {
  linksysDevices: LinksysDevice[];
  activeLinksysId: string;
  activeLinksys: LinksysDevice;
  activeRtc: RtcSubsystem;
  onSelectDevice: (id: string) => void;
  onAddDevice: (device: Omit<LinksysDevice, 'id' | 'uptime'>) => void;
  onUpdateDevice: (id: string, updates: Partial<LinksysDevice>) => void;
  onDeleteDevice: (id: string) => void;
  onSyncHwclock: (direction: 'sys_to_rtc' | 'rtc_to_sys') => void;
  onToggleRtcModule: () => void;
  onSimulateColdBootWithRtc: () => void;
  onSimulateColdBootWithoutRtc: () => void;
  onRestoreNormalTime: () => void;
  onExecuteUbus: (path: string, method: string) => UbusCallResult;
  onSetWifiMasterPower: (enabled: boolean, deviceId?: string) => void;
  onToggleWifiRadio: (radioId: string, deviceId?: string) => void;
  onUpdateWifiRadio?: (radioId: string, updates: Partial<WifiRadio>, deviceId?: string) => void;
  onRebootDevice: (deviceId?: string) => void;
  onPowerOffDevice: (deviceId?: string) => void;
  onPowerOnDevice: (deviceId?: string) => void;
  onFactoryResetDevice: (deviceId?: string) => void;
  onExecuteRemoteSsh: (command: string, deviceId?: string) => { output: string; exitCode: number };
  wifiScans?: Record<'2.4GHz' | '5GHz', WifiScanResult[]>;
  onRunWifiScan?: (band: '2.4GHz' | '5GHz') => void;
  crossLayerSync?: CrossLayerSyncStatus;
  onToggleLocalMasterNtp?: () => void;
  rtcRegisters?: RtcRegisterMap[];
}

type SubTab = 'devices_crud' | 'wireless_remote' | 'rtc_deep_dive' | 'boot_experiment' | 'guide' | 'ubus_rpc';

export const LinksysRtcExplorer: React.FC<LinksysRtcExplorerProps> = ({
  linksysDevices,
  activeLinksysId,
  activeLinksys,
  activeRtc,
  onSelectDevice,
  onAddDevice,
  onUpdateDevice,
  onDeleteDevice,
  onSyncHwclock,
  onToggleRtcModule,
  onSimulateColdBootWithRtc,
  onSimulateColdBootWithoutRtc,
  onRestoreNormalTime,
  onExecuteUbus,
  onSetWifiMasterPower,
  onToggleWifiRadio,
  onUpdateWifiRadio,
  onRebootDevice,
  onPowerOffDevice,
  onPowerOnDevice,
  onFactoryResetDevice,
  onExecuteRemoteSsh,
  wifiScans,
  onRunWifiScan,
  crossLayerSync,
  onToggleLocalMasterNtp,
  rtcRegisters
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('devices_crud');
  const [selectedScanBand, setSelectedScanBand] = useState<'2.4GHz' | '5GHz'>('2.4GHz');
  const [selectedUbusPath, setSelectedUbusPath] = useState<string>('rtc');
  const [selectedUbusMethod, setSelectedUbusMethod] = useState<string>('status');
  const [ubusResponse, setUbusResponse] = useState<UbusCallResult | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // SSH Web Terminal interactive states
  const [sshInput, setSshInput] = useState<string>('');
  const [sshHistory, setSshHistory] = useState<Array<{ cmd: string; output: string; time: string; exitCode: number }>>([
    {
      cmd: 'wifi status',
      output: '{\n  "radio0": { "up": true, "ssid": "OpenWrt-Linksys-2.4G", "channel": 6, "clients": 2 },\n  "radio1": { "up": true, "ssid": "OpenWrt-Linksys-5G-HighSpeed", "channel": 36, "clients": 2 }\n}',
      time: new Date().toLocaleTimeString('id-ID'),
      exitCode: 0
    }
  ]);
  const [isSshRunning, setIsSshRunning] = useState<boolean>(false);
  const [editingSsidRadioId, setEditingSsidRadioId] = useState<string | null>(null);
  const [newSsidValue, setNewSsidValue] = useState<string>('');

  // Modal states for CRUD
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<LinksysDevice | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [confirmResetPabrik, setConfirmResetPabrik] = useState<boolean>(false);

  // Categorized form states for Device Add/Edit
  type FormCategory = 'identitas' | 'soc' | 'jaringan' | 'rtc' | 'wifi' | 'monitoring';
  const [modalCategory, setModalCategory] = useState<FormCategory>('identitas');

  const initialFormState = {
    // Kategori 1: Identitas & Peran Node
    name: 'Linksys WRT3200ACM - Node Baru',
    model: 'Linksys WRT3200ACM (MU-MIMO Gigabit)',
    deviceRole: 'gateway' as 'gateway' | 'access_point' | 'backup_node' | 'forensic_probe',
    hostname: 'OpenWrt-WRT3200-Node',
    location: 'Lab Jaringan Komputer Lt. 3',
    status: 'online' as 'online' | 'offline' | 'warning',
    notes: 'Node gateway cadangan dengan logging RTC independen.',

    // Kategori 2: Spesifikasi SoC & Kernel
    target: 'mvebu/cortexa9 (Linksys Rango)',
    soc: 'Marvell Armada 388 Dual-Core @ 1.8 GHz',
    openwrtVersion: 'OpenWrt 23.05.3 r23809-234f1a2efa',
    kernelVersion: 'Linux 5.15.150 (armv7l)',
    memoryTotalMb: 512,
    memoryFreeMb: 390,
    flashSizeMb: 256,
    cpuTempC: 48,

    // Kategori 3: Jaringan LAN & Port Remote
    lanIp: '192.168.1.10',
    subnetMask: '255.255.255.0',
    gatewayIp: '192.168.1.1',
    dnsServer: '1.1.1.1, 8.8.8.8',
    macAddress: '60:38:E0:F4:2A:90',
    remoteSshPort: 22,
    remoteHttpPort: 80,
    vlanId: 10,
    dhcpEnabled: true,

    // Kategori 4: Hardware RTC DS3231 & I2C Bus
    rtcInstalled: true,
    rtcChipModel: 'Maxim DS3231 (Extremely Accurate I2C RTC with TCXO)',
    i2cAddress: '0x68',
    i2cBus: 'i2c-0 (SoC I2C Controller)',
    driverModule: 'rtc-ds1307 (Linux RTC driver)',
    batteryVoltage: 3.05,
    ntpServer: '0.id.pool.ntp.org',
    autoHwclockSyncMinutes: 30,

    // Kategori 5: Antarmuka Wi-Fi Dual-Band
    wifiMasterEnabled: true,
    ssid2g: 'OpenWrt-Linksys-2.4G',
    channel2g: 6,
    txPower2g: 20,
    ssid5g: 'OpenWrt-Linksys-5G-HighSpeed',
    channel5g: 36,
    width5g: 80,
    txPower5g: 23,
    encryption: 'WPA2-PSK (AES)',

    // Kategori 6: Monitoring & Forensik Skripsi
    enableSyslog: true,
    enableTimeDriftAlarm: true,
    enableRtcThermalSync: true,
    enableMwan3Sync: true
  };

  const [deviceForm, setDeviceForm] = useState(initialFormState);

  const presets = [
    {
      label: 'Linksys WRT1900ACS v2 (Marvell Armada 385 1.6GHz)',
      model: 'Linksys WRT1900ACS v2 (Dual-Band Gigabit)',
      soc: 'Marvell Armada 385 (88F6820) Dual-Core @ 1.6 GHz',
      target: 'mvebu/cortexa9 (Linksys Shelby)',
      flashSizeMb: 128,
      chipModel: 'Maxim DS3231 (Extremely Accurate I2C RTC with TCXO)',
      i2cAddress: '0x68',
      driver: 'rtc-ds1307'
    },
    {
      label: 'Linksys WRT3200ACM (Marvell Armada 388 1.8GHz)',
      model: 'Linksys WRT3200ACM (MU-MIMO Gigabit)',
      soc: 'Marvell Armada 388 (88F6828) Dual-Core @ 1.8 GHz',
      target: 'mvebu/cortexa9 (Linksys Rango)',
      flashSizeMb: 256,
      chipModel: 'NXP PCF8563 (Low-Power CMOS Real-Time Clock)',
      i2cAddress: '0x51',
      driver: 'rtc-pcf8563'
    },
    {
      label: 'Linksys WRT1200AC (Marvell Armada 385 1.33GHz)',
      model: 'Linksys WRT1200AC v1 (Dual-Band Gigabit)',
      soc: 'Marvell Armada 385 Dual-Core @ 1.33 GHz',
      target: 'mvebu/cortexa9 (Linksys Caiman)',
      flashSizeMb: 128,
      chipModel: 'Dallas DS1307 (Standard Serial I2C RTC)',
      i2cAddress: '0x68',
      driver: 'rtc-ds1307'
    },
    {
      label: 'Linksys EA8300 (Qualcomm IPQ4019 Quad-Core 717MHz)',
      model: 'Linksys EA8300 (Max-Stream AC2200)',
      soc: 'Qualcomm Atheros IPQ4019 Quad-Core @ 717 MHz',
      target: 'ipq40xx/generic',
      flashSizeMb: 256,
      chipModel: 'Microchip MCP79410 (I2C RTC with Battery Switchover)',
      i2cAddress: '0x6f',
      driver: 'rtc-mcp7941x'
    }
  ];

  const handleApplyPreset = (presetIndex: number) => {
    const p = presets[presetIndex];
    setDeviceForm(prev => ({
      ...prev,
      model: p.model,
      soc: p.soc,
      target: p.target,
      flashSizeMb: p.flashSizeMb,
      rtcChipModel: p.chipModel,
      i2cAddress: p.i2cAddress,
      driverModule: p.driver
    }));
  };

  const handleOpenAddModal = () => {
    setDeviceForm(initialFormState);
    setModalCategory('identitas');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (dev: LinksysDevice) => {
    setEditingDevice(dev);
    setModalCategory('identitas');
    setDeviceForm({
      name: dev.name,
      model: dev.model,
      deviceRole: dev.optionalFeatures?.deviceRole || 'gateway',
      hostname: dev.hostname,
      location: dev.location,
      status: dev.status,
      notes: dev.optionalFeatures?.notes || '',

      target: dev.target,
      soc: dev.soc,
      openwrtVersion: dev.openwrtVersion,
      kernelVersion: dev.kernelVersion,
      memoryTotalMb: dev.memoryTotalMb,
      memoryFreeMb: dev.memoryFreeMb,
      flashSizeMb: dev.flashSizeMb,
      cpuTempC: dev.cpuTempC,

      lanIp: dev.lanIp,
      subnetMask: dev.optionalFeatures?.subnetMask || '255.255.255.0',
      gatewayIp: dev.optionalFeatures?.gatewayIp || '192.168.1.1',
      dnsServer: dev.optionalFeatures?.dnsServer || '1.1.1.1, 8.8.8.8',
      macAddress: dev.macAddress,
      remoteSshPort: dev.remoteSshPort || 22,
      remoteHttpPort: dev.remoteHttpPort || 80,
      vlanId: dev.optionalFeatures?.vlanId ? Number(dev.optionalFeatures.vlanId) : 10,
      dhcpEnabled: dev.optionalFeatures?.dhcpEnabled ?? true,

      rtcInstalled: dev.rtc.installed,
      rtcChipModel: dev.rtc.chipModel,
      i2cAddress: dev.rtc.i2cAddress,
      i2cBus: dev.i2cBus,
      driverModule: dev.rtc.driverModule,
      batteryVoltage: dev.rtc.batteryVoltage,
      ntpServer: dev.rtc.ntpServer,
      autoHwclockSyncMinutes: dev.optionalFeatures?.autoHwclockSyncMinutes || 30,

      wifiMasterEnabled: dev.wireless?.wifiMasterEnabled ?? true,
      ssid2g: dev.wireless?.radios?.find(r => r.band === '2.4GHz')?.ssid || `OpenWrt-${dev.name.split(' ')[0]}-2.4G`,
      channel2g: dev.wireless?.radios?.find(r => r.band === '2.4GHz')?.channel || 6,
      txPower2g: dev.wireless?.radios?.find(r => r.band === '2.4GHz')?.txPowerDbm || 20,
      ssid5g: dev.wireless?.radios?.find(r => r.band === '5GHz')?.ssid || `OpenWrt-${dev.name.split(' ')[0]}-5G`,
      channel5g: dev.wireless?.radios?.find(r => r.band === '5GHz')?.channel || 36,
      width5g: dev.wireless?.radios?.find(r => r.band === '5GHz')?.widthMhz || 80,
      txPower5g: dev.wireless?.radios?.find(r => r.band === '5GHz')?.txPowerDbm || 23,
      encryption: dev.wireless?.radios?.[0]?.encryption || 'WPA2-PSK (AES)',

      enableSyslog: dev.optionalFeatures?.enableSyslog ?? true,
      enableTimeDriftAlarm: dev.optionalFeatures?.enableTimeDriftAlarm ?? true,
      enableRtcThermalSync: dev.optionalFeatures?.enableRtcThermalSync ?? true,
      enableMwan3Sync: dev.optionalFeatures?.enableMwan3Sync ?? true
    });
  };

  const handleSaveAdd = () => {
    const now = Date.now();
    const timeStr = new Date(now).toISOString().replace('T', ' ').substring(0, 19);

    onAddDevice({
      name: deviceForm.name,
      model: deviceForm.model,
      hostname: deviceForm.hostname,
      openwrtVersion: deviceForm.openwrtVersion,
      kernelVersion: deviceForm.kernelVersion,
      target: deviceForm.target,
      soc: deviceForm.soc,
      memoryTotalMb: Number(deviceForm.memoryTotalMb),
      memoryFreeMb: Number(deviceForm.memoryFreeMb),
      flashSizeMb: Number(deviceForm.flashSizeMb),
      cpuTempC: Number(deviceForm.cpuTempC),
      i2cBus: deviceForm.i2cBus,
      lanIp: deviceForm.lanIp,
      macAddress: deviceForm.macAddress,
      location: deviceForm.location,
      status: deviceForm.status,
      powerState: 'on',
      remoteSshPort: Number(deviceForm.remoteSshPort) || 22,
      remoteHttpPort: Number(deviceForm.remoteHttpPort) || 80,
      rtc: {
        installed: deviceForm.rtcInstalled,
        chipModel: deviceForm.rtcChipModel,
        devicePath: '/dev/rtc0',
        i2cAddress: deviceForm.i2cAddress,
        driverModule: deviceForm.driverModule,
        batteryVoltage: Number(deviceForm.batteryVoltage),
        batteryStatus: Number(deviceForm.batteryVoltage) > 2.8 ? 'Good' : 'Low',
        hardwareTimeEpoch: now,
        hardwareTimeString: timeStr,
        systemTimeEpoch: now,
        systemTimeString: timeStr,
        ntpSyncStatus: 'synced',
        ntpServer: deviceForm.ntpServer,
        timeDriftPpm: 1.2,
        rtcTempC: 28.0,
        powerLossFlag: false,
        lastHwclockSync: new Date().toLocaleTimeString('id-ID'),
        isSimulated1970Bug: false
      },
      wireless: {
        wifiMasterEnabled: deviceForm.wifiMasterEnabled,
        radios: [
          {
            id: 'radio0',
            band: '2.4GHz',
            interfaceName: 'wlan0',
            enabled: deviceForm.wifiMasterEnabled,
            ssid: deviceForm.ssid2g,
            channel: Number(deviceForm.channel2g),
            frequencyMhz: 2412 + (Number(deviceForm.channel2g) - 1) * 5,
            widthMhz: 20,
            txPowerDbm: Number(deviceForm.txPower2g),
            encryption: deviceForm.encryption,
            bssid: deviceForm.macAddress,
            connectedClients: [
              {
                hostname: 'Client-Station-01',
                ip: deviceForm.lanIp.replace(/\.\d+$/, '.105'),
                mac: 'A4:C3:F0:88:1A:42',
                signalDbm: -56,
                rxRateMbps: 144.4,
                txRateMbps: 144.4,
                connectedTime: '01:24:00'
              }
            ]
          },
          {
            id: 'radio1',
            band: '5GHz',
            interfaceName: 'wlan1',
            enabled: deviceForm.wifiMasterEnabled,
            ssid: deviceForm.ssid5g,
            channel: Number(deviceForm.channel5g),
            frequencyMhz: 5000 + Number(deviceForm.channel5g) * 5,
            widthMhz: Number(deviceForm.width5g),
            txPowerDbm: Number(deviceForm.txPower5g),
            encryption: deviceForm.encryption,
            bssid: deviceForm.macAddress.replace(/[0-9A-Fa-f]$/, '1'),
            connectedClients: [
              {
                hostname: 'Client-5G-Station',
                ip: deviceForm.lanIp.replace(/\.\d+$/, '.106'),
                mac: 'F0:18:98:C2:5E:8B',
                signalDbm: -48,
                rxRateMbps: 866.7,
                txRateMbps: 866.7,
                connectedTime: '00:45:10'
              }
            ]
          }
        ]
      },
      optionalFeatures: {
        deviceRole: deviceForm.deviceRole,
        notes: deviceForm.notes,
        subnetMask: deviceForm.subnetMask,
        gatewayIp: deviceForm.gatewayIp,
        dnsServer: deviceForm.dnsServer,
        vlanId: Number(deviceForm.vlanId),
        dhcpEnabled: deviceForm.dhcpEnabled,
        enableSyslog: deviceForm.enableSyslog,
        enableTimeDriftAlarm: deviceForm.enableTimeDriftAlarm,
        enableRtcThermalSync: deviceForm.enableRtcThermalSync,
        enableMwan3Sync: deviceForm.enableMwan3Sync,
        autoHwclockSyncMinutes: Number(deviceForm.autoHwclockSyncMinutes)
      }
    });

    setShowAddModal(false);
  };

  const handleRunSshCommand = (cmdToRun?: string) => {
    const cmd = (cmdToRun || sshInput).trim();
    if (!cmd) return;

    setIsSshRunning(true);
    const result = onExecuteRemoteSsh(cmd, activeLinksys.id);
    const newEntry = {
      cmd,
      output: result.output,
      time: new Date().toLocaleTimeString('id-ID'),
      exitCode: result.exitCode
    };

    setSshHistory(prev => [newEntry, ...prev.slice(0, 19)]);
    setSshInput('');
    setIsSshRunning(false);
  };

  const handleSaveEdit = () => {
    if (!editingDevice) return;

    onUpdateDevice(editingDevice.id, {
      name: deviceForm.name,
      model: deviceForm.model,
      hostname: deviceForm.hostname,
      openwrtVersion: deviceForm.openwrtVersion,
      kernelVersion: deviceForm.kernelVersion,
      target: deviceForm.target,
      soc: deviceForm.soc,
      memoryTotalMb: Number(deviceForm.memoryTotalMb),
      memoryFreeMb: Number(deviceForm.memoryFreeMb),
      flashSizeMb: Number(deviceForm.flashSizeMb),
      cpuTempC: Number(deviceForm.cpuTempC),
      i2cBus: deviceForm.i2cBus,
      lanIp: deviceForm.lanIp,
      macAddress: deviceForm.macAddress,
      location: deviceForm.location,
      status: deviceForm.status,
      remoteSshPort: Number(deviceForm.remoteSshPort) || 22,
      remoteHttpPort: Number(deviceForm.remoteHttpPort) || 80,
      rtc: {
        ...editingDevice.rtc,
        installed: deviceForm.rtcInstalled,
        chipModel: deviceForm.rtcChipModel,
        i2cAddress: deviceForm.i2cAddress,
        driverModule: deviceForm.driverModule,
        batteryVoltage: Number(deviceForm.batteryVoltage),
        batteryStatus: Number(deviceForm.batteryVoltage) > 2.8 ? 'Good' : 'Low',
        ntpServer: deviceForm.ntpServer
      },
      wireless: {
        ...editingDevice.wireless,
        wifiMasterEnabled: deviceForm.wifiMasterEnabled
      },
      optionalFeatures: {
        deviceRole: deviceForm.deviceRole,
        notes: deviceForm.notes,
        subnetMask: deviceForm.subnetMask,
        gatewayIp: deviceForm.gatewayIp,
        dnsServer: deviceForm.dnsServer,
        vlanId: Number(deviceForm.vlanId),
        dhcpEnabled: deviceForm.dhcpEnabled,
        enableSyslog: deviceForm.enableSyslog,
        enableTimeDriftAlarm: deviceForm.enableTimeDriftAlarm,
        enableRtcThermalSync: deviceForm.enableRtcThermalSync,
        enableMwan3Sync: deviceForm.enableMwan3Sync,
        autoHwclockSyncMinutes: Number(deviceForm.autoHwclockSyncMinutes)
      }
    });

    setEditingDevice(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingDeviceId) return;
    onDeleteDevice(deletingDeviceId);
    setDeletingDeviceId(null);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRunUbus = () => {
    const res = onExecuteUbus(selectedUbusPath, selectedUbusMethod);
    setUbusResponse(res);
  };

  return (
    <div className="space-y-4">
      {/* Linksys Hardware & OpenWrt Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0 mt-1">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Manajemen Router Linksys & Subsistem Hardware RTC (OpenWrt)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  Sub-Layer Device ({linksysDevices.length} Terdaftar)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mempelajari arsitektur perangkat keras router Linksys WRT di bawah MikroTik, manajemen multi-perangkat OpenWrt (Tambah, Edit, Hapus), dan peran subsistem Real-Time Clock (RTC I2C DS3231) untuk kontinuitas telemetri Multi-WAN saat offline.
              </p>
            </div>
          </div>

          {/* Active Device Badge & Add Button */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Router Linksys</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 pt-3 border-b border-slate-800 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveSubTab('devices_crud')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'devices_crud'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Kelola Perangkat Linksys ({linksysDevices.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('wireless_remote')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'wireless_remote'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>2. Kendali Remote & Wi-Fi Wireless</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rtc_deep_dive')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'rtc_deep_dive'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>3. Subsistem Hardware RTC (DS3231)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('boot_experiment')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'boot_experiment'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>4. Eksperimen Booting (Dengan vs Tanpa RTC)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('guide')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'guide'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>5. Panduan Praktikum & Wiring Skripsi</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ubus_rpc')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'ubus_rpc'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>6. Konsol OpenWrt ubus JSON-RPC</span>
          </button>
        </div>

        {/* TAB 1: DEVICE MANAGEMENT (CRUD) */}
        {activeSubTab === 'devices_crud' && (
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Daftar Router Linksys OpenWrt Terdaftar di Topologi
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih perangkat aktif untuk memantau jam RTC secara langsung atau gunakan tombol Edit/Hapus untuk memodifikasi konfigurasi.
                </p>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Perangkat Aktif:{' '}
                <span className="text-cyan-400 font-bold">{activeLinksys.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {linksysDevices.map(device => {
                const isActive = device.id === activeLinksysId;

                return (
                  <div
                    key={device.id}
                    className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-slate-900 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/20'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top row: Name & Active badge */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{device.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {device.model}
                          </div>
                        </div>

                        {isActive && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                            Aktif Dipantau
                          </span>
                        )}
                      </div>

                      {/* Specs details */}
                      <div className="mt-3 space-y-1.5 text-[11px] font-mono text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Alamat IP:</span>
                          <span className="text-cyan-300">{device.lanIp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">MAC Address:</span>
                          <span className="text-slate-300">{device.macAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Firmware OS:</span>
                          <span className="text-slate-300">{device.openwrtVersion.split(' ')[0]} {device.openwrtVersion.split(' ')[1]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Processor SoC:</span>
                          <span className="text-slate-300 truncate max-w-[170px]" title={device.soc}>{device.soc.split(' (')[0]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Lokasi Node:</span>
                          <span className="text-slate-300 font-sans truncate max-w-[170px]" title={device.location}>{device.location}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-slate-500 font-sans">Modul RTC:</span>
                          <span className={device.rtc.installed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                            {device.rtc.installed ? device.rtc.chipModel.split(' (')[0] : 'Tidak Ada'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Bus I2C & Bat.:</span>
                          <span className="text-slate-300">
                            {device.rtc.i2cAddress} ({device.rtc.batteryVoltage}V)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      {!isActive ? (
                        <button
                          onClick={() => onSelectDevice(device.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex-1"
                        >
                          Pilih Router Ini
                        </button>
                      ) : (
                        <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 py-1 flex-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Router Utama</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(device)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
                        title="Edit Konfigurasi Router"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        disabled={linksysDevices.length <= 1}
                        onClick={() => setDeletingDeviceId(device.id)}
                        className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 disabled:opacity-40 rounded border border-rose-800/60 transition-colors"
                        title={linksysDevices.length <= 1 ? 'Minimal harus ada 1 router tersisa' : 'Hapus Router'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: WIRELESS WI-FI & REMOTE CONTROL (Power, Reset, SSH, Web LuCI) */}
        {activeSubTab === 'wireless_remote' && (
          <div className="space-y-4 pt-4">
            {/* Router Power & Status Ribbon */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border shrink-0 ${
                    activeLinksys.powerState === 'on'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : activeLinksys.powerState === 'rebooting'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {activeLinksys.powerState === 'rebooting' ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Power className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Kendali Jarak Jauh (Remote) & Daya: {activeLinksys.name}
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        activeLinksys.powerState === 'on'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : activeLinksys.powerState === 'rebooting'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {activeLinksys.powerState === 'on'
                          ? 'STATUS: POWER ON (BEROPERASI)'
                          : activeLinksys.powerState === 'rebooting'
                          ? 'STATUS: REBOOTING DALAM PROSES...'
                          : 'STATUS: POWER OFF (DIMATIKAN)'}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        activeLinksys.wireless?.wifiMasterEnabled
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        Wi-Fi Master: {activeLinksys.wireless?.wifiMasterEnabled ? 'AKTIF' : 'NON-AKTIF'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Akses remote manajemen, sakelar daya Wi-Fi nirkabel, reboot terkendali, dan eksekusi SSH pada port {activeLinksys.remoteSshPort} ({activeLinksys.lanIp}).
                    </p>
                  </div>
                </div>

                {/* Primary Remote Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Wi-Fi ON / OFF */}
                  {activeLinksys.wireless?.wifiMasterEnabled ? (
                    <button
                      onClick={() => onSetWifiMasterPower(false, activeLinksys.id)}
                      disabled={activeLinksys.powerState !== 'on'}
                      className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      title="Matikan seluruh pemancar Wi-Fi (wifi down)"
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Matikan Wi-Fi</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSetWifiMasterPower(true, activeLinksys.id)}
                      disabled={activeLinksys.powerState !== 'on'}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                      title="Hidupkan seluruh pemancar Wi-Fi (wifi up)"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Hidupkan Wi-Fi</span>
                    </button>
                  )}

                  {/* Soft Reboot */}
                  <button
                    onClick={() => onRebootDevice(activeLinksys.id)}
                    disabled={activeLinksys.powerState === 'rebooting' || activeLinksys.powerState === 'off'}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    title="Kirim sinyal reboot -f ke OpenWrt"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${activeLinksys.powerState === 'rebooting' ? 'animate-spin' : ''}`} />
                    <span>Reboot Router</span>
                  </button>

                  {/* Power ON / OFF Router */}
                  {activeLinksys.powerState === 'on' ? (
                    <button
                      onClick={() => onPowerOffDevice(activeLinksys.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      title="Matikan router (soft halt)"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Matikan Router</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onPowerOnDevice(activeLinksys.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Nyalakan router (Power ON / Wake)"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Hidupkan Router</span>
                    </button>
                  )}

                  {/* Factory Reset */}
                  <button
                    onClick={() => setConfirmResetPabrik(true)}
                    disabled={activeLinksys.powerState !== 'on'}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    title="Format partisi overlay dan reset ke default OpenWrt (firstboot)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Pabrik</span>
                  </button>
                </div>
              </div>

              {/* Quick Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-[11px] font-mono">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 block">IP Gateway Remote:</span>
                  <span className="text-cyan-300 font-bold">{activeLinksys.lanIp}:{activeLinksys.remoteHttpPort}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 block">Port Layanan Dropbear SSH:</span>
                  <span className="text-slate-200">TCP Port {activeLinksys.remoteSshPort}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 block">Status Sub-Sistem Jam:</span>
                  <span className={activeRtc.installed ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {activeRtc.installed ? `${activeRtc.chipModel.split(' ')[0]} Terproteksi` : 'Tanpa RTC (NTP Saja)'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 block">Uptime Sistem Linux:</span>
                  <span className="text-slate-200">{activeLinksys.uptime}</span>
                </div>
              </div>
            </div>

            {/* Wireless Dual-Band Radio Management Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>Konfigurasi & Telemetri Antarmuka Nirkabel (Dual-Band 2.4 GHz & 5 GHz)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Modulasi radio fisik mac80211 pada SoC Marvell Armada, konfigurasi SSID hostapd, dan daftar stasiun klien terhubung.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeLinksys.wireless?.radios.map((radio) => {
                  const is2G = radio.band === '2.4GHz';
                  const isEditingThisSsid = editingSsidRadioId === radio.id;

                  return (
                    <div
                      key={radio.id}
                      className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                        radio.enabled && activeLinksys.powerState === 'on'
                          ? 'bg-slate-900 border-slate-700 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800 opacity-75'
                      }`}
                    >
                      <div>
                        {/* Radio Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded ${
                              radio.enabled && activeLinksys.powerState === 'on'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}>
                              <Wifi className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Radio {radio.band}</span>
                                <span className="text-[10px] font-mono text-slate-400">({radio.interfaceName})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {is2G ? '802.11b/g/n (20 MHz HT)' : '802.11a/n/ac/ax (MU-MIMO Wave 2)'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              radio.enabled && activeLinksys.powerState === 'on'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {radio.enabled && activeLinksys.powerState === 'on' ? 'Aktif (Up)' : 'Mati (Disabled)'}
                            </span>
                            <button
                              onClick={() => onToggleWifiRadio(radio.id, activeLinksys.id)}
                              disabled={activeLinksys.powerState !== 'on'}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                                radio.enabled
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                              } disabled:opacity-40`}
                            >
                              {radio.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </div>
                        </div>

                        {/* SSID & Inline Editing */}
                        <div className="mt-3 p-3 bg-slate-950 rounded border border-slate-800/80">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Nama Jaringan (SSID):</span>
                            {!isEditingThisSsid ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-cyan-300">{radio.ssid}</span>
                                <button
                                  onClick={() => {
                                    setEditingSsidRadioId(radio.id);
                                    setNewSsidValue(radio.ssid);
                                  }}
                                  className="text-slate-400 hover:text-white p-1"
                                  title="Ganti SSID"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={newSsidValue}
                                  onChange={e => setNewSsidValue(e.target.value)}
                                  className="px-2 py-0.5 bg-slate-900 border border-cyan-500 rounded text-white text-xs font-mono focus:outline-none"
                                />
                                <button
                                  onClick={() => {
                                    if (onUpdateWifiRadio && newSsidValue.trim()) {
                                      onUpdateWifiRadio(radio.id, { ssid: newSsidValue.trim() }, activeLinksys.id);
                                    }
                                    setEditingSsidRadioId(null);
                                  }}
                                  className="px-2 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded"
                                >
                                  Simpan
                                </button>
                                <button
                                  onClick={() => setEditingSsidRadioId(null)}
                                  className="px-2 py-0.5 bg-slate-800 text-slate-400 hover:text-white text-xs rounded"
                                >
                                  Batal
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono">
                            <div>
                              <span className="text-slate-500 block">Saluran:</span>
                              <span className="text-slate-200 font-bold">Ch {radio.channel}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Frekuensi:</span>
                              <span className="text-slate-200">{radio.frequencyMhz} MHz</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Lebar Pita:</span>
                              <span className="text-slate-200">{radio.widthMhz} MHz</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Daya Tx:</span>
                              <span className="text-cyan-300 font-bold">{radio.txPowerDbm} dBm</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-slate-800/60">
                            <span className="text-slate-500">Enkripsi:</span>
                            <span className="text-slate-300 font-sans flex items-center gap-1">
                              <Lock className="w-3 h-3 text-emerald-400" />
                              {radio.encryption}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                            <span className="text-slate-500">BSSID Radio:</span>
                            <span className="text-slate-400">{radio.bssid}</span>
                          </div>
                        </div>

                        {/* Connected Clients */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Stasiun Nirkabel Terhubung ({radio.connectedClients.length})</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">ARP / hostapd assoc list</span>
                          </div>

                          {radio.connectedClients.length === 0 ? (
                            <div className="p-3 bg-slate-950/60 rounded border border-slate-800/60 text-center text-xs text-slate-500">
                              Tidak ada klien wireless yang terhubung pada band ini.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {radio.connectedClients.map((client) => (
                                <div
                                  key={client.mac}
                                  className="p-2.5 bg-slate-950 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                      <Laptop className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{client.hostname}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {client.ip} · <span className="text-slate-500">{client.mac}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                                    <div className="text-right">
                                      <span className="text-slate-500 block text-[9px]">Sinyal</span>
                                      <span className={`font-bold ${
                                        client.signalDbm > -60 ? 'text-emerald-400' : 'text-amber-400'
                                      }`}>
                                        {client.signalDbm} dBm
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-slate-500 block text-[9px]">Tx/Rx Link</span>
                                      <span className="text-cyan-300 font-bold">{client.rxRateMbps} Mbps</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-slate-500 block text-[9px]">Uptime</span>
                                      <span className="text-slate-400">{client.connectedTime}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Remote Web SSH Console */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>Konsol Remote SSH Web (Dropbear v2022.82) - {activeLinksys.hostname}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Terminal interaktif untuk remote execution perintah OpenWrt: Wi-Fi, jam RTC hardware, uci wireless, dan log sistem.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-mono">Port: {activeLinksys.remoteSshPort} (LAN)</span>
                  <button
                    onClick={() => setSshHistory([])}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                  >
                    Bersihkan Log
                  </button>
                </div>
              </div>

              {/* Preset Command Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-2 text-xs">
                <span className="text-[11px] text-slate-500 font-mono">Perintah Cepat:</span>
                {[
                  'wifi status',
                  'wifi up',
                  'wifi down',
                  'wifi reload',
                  'iw dev',
                  'uci show wireless',
                  'hwclock -r',
                  'hwclock -s',
                  'hwclock -w',
                  'i2cdetect -y 0',
                  'uptime',
                  'free -m',
                  'logread -l 10',
                  'help'
                ].map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => handleRunSshCommand(cmd)}
                    disabled={activeLinksys.powerState === 'off'}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-cyan-300 font-mono text-[11px] rounded transition-colors disabled:opacity-40"
                  >
                    {cmd}
                  </button>
                ))}
              </div>

              {/* Terminal View Output */}
              <div className="mt-2 bg-slate-950 font-mono text-xs p-3 rounded-lg border border-slate-800/90 max-h-72 overflow-y-auto space-y-2.5">
                <div className="text-slate-500 text-[11px] pb-1 border-b border-slate-800">
                  BusyBox v1.36.1 (2024-03-23 18:32:04 UTC) built-in shell (ash)<br />
                  Connecting to {activeLinksys.lanIp}:{activeLinksys.remoteSshPort} as root... Authenticated via Ed25519 key.
                </div>

                {sshHistory.length === 0 ? (
                  <div className="text-slate-600 text-center py-4">
                    Terminal siap. Ketikkan perintah di bawah atau klik salah satu tombol perintah cepat.
                  </div>
                ) : (
                  sshHistory.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-emerald-400">root@{activeLinksys.hostname}</span>
                          <span className="text-slate-600">:</span>
                          <span className="text-cyan-400">~#</span>
                          <span className="text-white">{item.cmd}</span>
                        </div>
                        <span className="text-[10px] text-slate-600">{item.time}</span>
                      </div>
                      <pre className="text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
                        {item.output}
                      </pre>
                    </div>
                  ))
                )}
              </div>

              {/* Terminal Input Bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono">
                  <span className="text-emerald-400 font-bold shrink-0">root@{activeLinksys.hostname}</span>
                  <span className="text-slate-600 shrink-0 mx-1">:</span>
                  <span className="text-cyan-400 font-bold shrink-0">~# </span>
                  <input
                    type="text"
                    value={sshInput}
                    onChange={e => setSshInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleRunSshCommand();
                      }
                    }}
                    disabled={activeLinksys.powerState === 'off' || isSshRunning}
                    placeholder="Masukkan perintah (mis: wifi status, iw dev, hwclock -r)..."
                    className="flex-1 bg-transparent text-white focus:outline-none ml-1 placeholder:text-slate-600 disabled:opacity-40"
                  />
                </div>
                <button
                  onClick={() => handleRunSshCommand()}
                  disabled={activeLinksys.powerState === 'off' || isSshRunning || !sshInput.trim()}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Jalankan</span>
                </button>
              </div>
            </div>

            {/* Remote LuCI Web GUI Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      Antarmuka Web Manajemen LuCI (OpenWrt Web GUI)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Endpoint: http://{activeLinksys.lanIp}:{activeLinksys.remoteHttpPort}/cgi-bin/luci (uHTTPd daemon)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
                    uHTTPd Aktif (Port {activeLinksys.remoteHttpPort})
                  </span>
                  <button
                    onClick={() => {
                      handleRunSshCommand('logread -l 10');
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors border border-slate-700"
                  >
                    Cek Status HTTP
                  </button>
                </div>
              </div>
            </div>

            {/* Wi-Fi Spectrum Analyzer & Site Survey (iwinfo scan) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>Survei Spektrum & Pemindai Sinyal Wi-Fi (Site Survey - iwinfo scan)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Menganalisis kepadatan frekuensi nirkabel di sekitar lab jaringan untuk menghindari co-channel interference yang menurunkan QoS TIPHON.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 text-[11px]">
                    <button
                      onClick={() => setSelectedScanBand('2.4GHz')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        selectedScanBand === '2.4GHz' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Band 2.4 GHz
                    </button>
                    <button
                      onClick={() => setSelectedScanBand('5GHz')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        selectedScanBand === '5GHz' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Band 5 GHz
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onRunWifiScan) onRunWifiScan(selectedScanBand);
                    }}
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Pindai Frekuensi</span>
                  </button>
                </div>
              </div>

              {/* Channel Occupancy Bar Graphic */}
              <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Peta Kepadatan Kanal ({selectedScanBand}):</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Rekomendasi Saluran: {selectedScanBand === '2.4GHz' ? 'Saluran 11 (Paling Bersih)' : 'Saluran 36 / 149 (Minim Noise)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] font-mono pt-1">
                  {(selectedScanBand === '2.4GHz' ? [1, 6, 11] : [36, 44, 149, 157]).map(ch => {
                    const scans = wifiScans ? wifiScans[selectedScanBand] : [];
                    const count = scans.filter(s => s.channel === ch).length;
                    const isCongested = count > 1;

                    return (
                      <div key={ch} className="p-2 rounded bg-slate-950 border border-slate-800/80 text-center">
                        <div className="text-slate-400">Ch {ch}</div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full my-1.5 overflow-hidden">
                          <div
                            className={`h-full ${isCongested ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(100, count * 50)}%` }}
                          ></div>
                        </div>
                        <div className={`font-bold ${isCongested ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {count} AP Terdeteksi
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scanned Access Points Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                      <th className="pb-1.5 font-normal">SSID Jaringan</th>
                      <th className="pb-1.5 font-normal">BSSID (MAC)</th>
                      <th className="pb-1.5 font-normal">Kanal</th>
                      <th className="pb-1.5 font-normal">Sinyal (RSSI)</th>
                      <th className="pb-1.5 font-normal">Kualitas</th>
                      <th className="pb-1.5 font-normal">Enkripsi</th>
                      <th className="pb-1.5 font-normal text-right">Interferensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {wifiScans && wifiScans[selectedScanBand]?.map(scan => (
                      <tr key={scan.bssid} className="hover:bg-slate-900/40">
                        <td className="py-2 text-slate-200 font-bold">{scan.ssid}</td>
                        <td className="py-2 text-slate-400 text-[10px]">{scan.bssid}</td>
                        <td className="py-2 text-cyan-300 font-bold">Ch {scan.channel}</td>
                        <td className="py-2 text-slate-200">
                          <span className={scan.signalDbm > -60 ? 'text-emerald-400' : 'text-amber-400'}>
                            {scan.signalDbm} dBm
                          </span>
                        </td>
                        <td className="py-2 text-slate-300">{scan.qualityPct}%</td>
                        <td className="py-2 text-slate-400 text-[10px]">{scan.encryption}</td>
                        <td className="py-2 text-right">
                          {scan.isConflicting ? (
                            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                              Co-Channel Conflict
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cross-Layer Local Master NTP Feed (Linksys DS3231 -> MikroTik CCR2004) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      Peran Hardware RTC Linksys Sebagai Master NTP Lokal MikroTik (Stratum 1)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Menjamin validitas timestamp log telemetri dan sertifikat TLS MikroTik RouterOS saat terjadi Internet Blackout (seluruh WAN putus).
                    </p>
                  </div>
                </div>

                {onToggleLocalMasterNtp && (
                  <button
                    onClick={onToggleLocalMasterNtp}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors border ${
                      crossLayerSync?.localMasterNtpActive
                        ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {crossLayerSync?.localMasterNtpActive ? 'Master NTP Lokal: AKTIF' : 'Master NTP: NON-AKTIF'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Waktu Hardware RTC (DS3231):</span>
                  <span className="text-cyan-300 font-bold">{crossLayerSync?.linksysRtcString || activeRtc.hardwareTimeString}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Sumber: I2C Register /dev/rtc0</span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Waktu RouterOS Core (/system/clock):</span>
                  <span className="text-slate-200 font-bold">{crossLayerSync?.mikrotikClockString || activeRtc.systemTimeString}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Klien NTP: 192.168.1.1 (LAN)</span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Divergensi Waktu & Skor Forensik:</span>
                  <span className="text-emerald-400 font-bold">{crossLayerSync?.driftMs || 0} ms · Skor: {crossLayerSync?.forensicIntegrityScore || 100}%</span>
                  <span className="text-[9px] text-emerald-400 block mt-0.5">Jaminan Timestamp Skripsi Valid</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RTC DEEP DIVE */}
        {activeSubTab === 'rtc_deep_dive' && (
          <div className="space-y-4 pt-4">
            {/* Live Clock Comparison Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Hardware RTC Clock */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Hardware RTC ({activeRtc.devicePath})
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded">
                    {activeRtc.chipModel.split(' ')[0]} I2C
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-white tracking-tight mt-1">
                  {activeRtc.installed ? activeRtc.hardwareTimeString : 'MODUL TIDAK TERDETEKSI'}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perangkat Terpilih:</span>
                    <span className="text-slate-200 font-sans">{activeLinksys.name.split(' - ')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tegangan Baterai:</span>
                    <span className="text-emerald-400">{activeRtc.batteryVoltage} V ({activeRtc.batteryStatus})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Suhu Internal TCXO:</span>
                    <span className="text-slate-300">{activeRtc.rtcTempC} °C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Akurasi / Drift:</span>
                    <span className="text-cyan-300 font-bold">±{activeRtc.timeDriftPpm} ppm</span>
                  </div>
                </div>
              </div>

              {/* Linux System Clock */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg relative">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    Jam Sistem Linux (date)
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeRtc.isSimulated1970Bug ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {activeRtc.isSimulated1970Bug ? 'EPOCH 1970' : 'Normal'}
                  </span>
                </div>
                <div className={`text-lg font-bold font-mono tracking-tight mt-1 ${
                  activeRtc.isSimulated1970Bug ? 'text-rose-400 animate-pulse' : 'text-white'
                }`}>
                  {activeRtc.systemTimeString}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Waktu:</span>
                    <span className={activeRtc.isSimulated1970Bug ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {activeRtc.isSimulated1970Bug ? 'RUSAK (1 Jan 1970)' : 'Akurat & Tersinkron'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sinkron Terakhir:</span>
                    <span className="text-slate-300">{activeRtc.lastHwclockSync}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uptime Linksys:</span>
                    <span className="text-slate-300 font-mono">{activeLinksys.uptime}</span>
                  </div>
                </div>
              </div>

              {/* Network NTP Service */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    Network NTP Daemon
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeRtc.ntpSyncStatus === 'synced' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {activeRtc.ntpSyncStatus === 'synced' ? 'NTP Online' : 'NTP Offline'}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-white tracking-tight mt-1 truncate">
                  {activeRtc.ntpServer}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stratum Server:</span>
                    <span className="text-slate-300">Stratum 2 (Public Pool ID)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ketergantungan:</span>
                    <span className="text-amber-300">Perlu Akses WAN Internet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Protokol:</span>
                    <span className="text-slate-300">UDP Port 123 (chrony/sysntpd)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive RTC CLI & Synchronization Commands */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>Perintah Pengendalian Jam Perangkat Keras Linux (hwclock) - {activeLinksys.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Operasi pembacaan dan penulisan register RTC melalui driver kernel Linux {activeRtc.driverModule}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleRtcModule}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors border ${
                      activeRtc.installed
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-emerald-950 border-emerald-700 text-emerald-300'
                    }`}
                  >
                    {activeRtc.installed ? 'Simulasi Cabut Modul RTC' : 'Simulasi Pasang Modul RTC'}
                  </button>

                  <button
                    onClick={onRestoreNormalTime}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors border border-slate-700"
                    title="Paksa sinkronisasi ulang NTP"
                  >
                    Sinkronkan NTP
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-400">hwclock -s (--hctosys)</span>
                    <button
                      onClick={() => onSyncHwclock('rtc_to_sys')}
                      className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded transition-colors"
                    >
                      Jalankan hwclock -s
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Membaca waktu dari chip Hardware RTC {activeRtc.chipModel} dan menyetel jam sistem Linux. Dijalankan otomatis saat booting OpenWrt melalui <code className="text-cyan-300">/etc/rc.local</code>.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-400">hwclock -w (--systohc)</span>
                    <button
                      onClick={() => onSyncHwclock('sys_to_rtc')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded transition-colors"
                    >
                      Jalankan hwclock -w
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Menyimpan waktu jam sistem Linux ke dalam register RTC {activeRtc.chipModel}. Dijalankan setiap kali router berhasil melakukan sinkronisasi NTP via skrip hotplug.
                  </p>
                </div>
              </div>
            </div>

            {/* I2C Bus Detection Register Map (i2cdetect) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-200 font-mono">
                  Peta Register Bus I2C: i2cdetect -y 0 ({activeLinksys.name})
                </span>
                <span className="text-slate-500 text-[11px]">Bus: {activeLinksys.i2cBus}</span>
              </div>
              <div className="mt-3 font-mono text-xs overflow-x-auto text-slate-400 bg-slate-900 p-3 rounded border border-slate-800/80">
                <div className="text-slate-500 pb-1">     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f</div>
                <div>00:          -- -- -- -- -- -- -- -- -- -- -- -- --</div>
                <div>10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --</div>
                <div>20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --</div>
                <div>30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --</div>
                <div>40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --</div>
                <div className={activeRtc.i2cAddress.startsWith('0x5') ? 'text-cyan-400 font-bold' : ''}>
                  50: --{' '}
                  {activeRtc.i2cAddress === '0x51' ? (
                    <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1 py-0.5 rounded border border-cyan-500/40">
                      {activeRtc.installed ? 'UU' : '51'}
                    </span>
                  ) : (
                    '--'
                  )}{' '}
                  -- -- -- -- -- -- -- -- -- -- -- -- -- --
                </div>
                <div className={activeRtc.i2cAddress.startsWith('0x6') ? 'text-cyan-400 font-bold' : ''}>
                  60: -- -- -- -- -- -- -- --{' '}
                  {activeRtc.i2cAddress === '0x68' ? (
                    <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1 py-0.5 rounded border border-cyan-500/40">
                      {activeRtc.installed ? 'UU' : '68'}
                    </span>
                  ) : activeRtc.i2cAddress === '0x6f' ? (
                    <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1 py-0.5 rounded border border-cyan-500/40">
                      {activeRtc.installed ? 'UU' : '6f'}
                    </span>
                  ) : (
                    '--'
                  )}{' '}
                  -- -- -- -- -- -- --
                </div>
                <div>70: -- -- -- -- -- -- -- --</div>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-cyan-300 font-bold">Keterangan:</span>
                <span>
                  Alamat <code className="text-cyan-300 font-mono">{activeRtc.i2cAddress}</code> adalah alamat I2C chip {activeRtc.chipModel.split(' ')[0]}.{' '}
                  {activeRtc.installed
                    ? `Nilai "UU" menunjukkan chip telah berhasil diklaim oleh driver kernel Linux (${activeRtc.driverModule}).`
                    : 'Nilai heksadesimal menunjukkan chip terdeteksi namun belum terhubung ke modul driver kernel.'}
                </span>
              </div>
            </div>

            {/* DS3231 Hex Register Dump Table */}
            {rtcRegisters && rtcRegisters.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-tight">
                        Dump Register Heksadesimal DS3231 Real-Time (i2cdump -y -r 0x00-0x12 0 0x68)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Pembacaan bit per bit dari alamat memori chip Maxim DS3231 I2C RTC
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    19 Register BCD & Kontrol
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border border-slate-800">Alamat Register</th>
                        <th className="p-2 border border-slate-800">Nama Register</th>
                        <th className="p-2 border border-slate-800">Nilai Hex (Raw)</th>
                        <th className="p-2 border border-slate-800">Nilai Biner (8-bit)</th>
                        <th className="p-2 border border-slate-800">Hasil Dekode</th>
                        <th className="p-2 border border-slate-800 font-sans">Deskripsi Fungsi Hardware</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                      {rtcRegisters.map((reg) => (
                        <tr key={reg.address} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-2 border border-slate-800 font-bold text-cyan-400">{reg.address}</td>
                          <td className="p-2 border border-slate-800 font-semibold text-white">{reg.name}</td>
                          <td className="p-2 border border-slate-800 font-bold text-emerald-400">{reg.hexValue}</td>
                          <td className="p-2 border border-slate-800 text-slate-400">{reg.binaryValue}</td>
                          <td className="p-2 border border-slate-800 text-cyan-300 font-semibold">{reg.decodedValue}</td>
                          <td className="p-2 border border-slate-800 text-slate-400 font-sans text-[11px]">{reg.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOOTING EXPERIMENT (WITH VS WITHOUT RTC) */}
        {activeSubTab === 'boot_experiment' && (
          <div className="space-y-4 pt-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-tight mb-1">
                  Eksperimen Bukti Empiris Skripsi: Mengapa Router Membutuhkan Hardware RTC?
                </h3>
                <span className="text-xs text-slate-400 font-mono">Target: {activeLinksys.name}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Router konsumen Linksys secara bawaan tidak memiliki baterai RTC di dalam SoC. Jika router mengalami pemadaman listrik dan menyala kembali saat semua koneksi WAN/Internet sedang down, apa yang terjadi?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Condition A: Boot WITH RTC */}
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/60 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kondisi A: Booting DENGAN Hardware RTC ({activeRtc.chipModel.split(' ')[0]})</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                      <li>
                        <span className="font-semibold text-emerald-300">Jam Langsung Valid:</span> Skrip <code className="text-cyan-300">hwclock -s</code> di <code className="text-cyan-300">/etc/rc.local</code> langsung menyinkronkan jam Linux tanpa menunggu internet.
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-300">Sertifikat TLS / SSL Valid:</span> API HTTPS ke MikroTik dan server telemetri berjalan mulus tanpa penolakan sertifikat masa berlaku.
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-300">Forensik Multi-WAN Akurat:</span> Catatan failover memiliki cap waktu detik yang presisi untuk audit forensik telemetri.
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-300">DNSSEC Berfungsi Normal:</span> Tanda tangan kriptografi domain dapat diverifikasi.
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={onSimulateColdBootWithRtc}
                    className="mt-4 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Uji Booting DENGAN RTC</span>
                  </button>
                </div>

                {/* Condition B: Boot WITHOUT RTC */}
                <div className="p-4 bg-rose-950/20 border border-rose-800/60 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-2">
                      <XCircle className="w-4 h-4" />
                      <span>Kondisi B: Booting TANPA Hardware RTC (WAN Down)</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                      <li>
                        <span className="font-semibold text-rose-400">Jam Reset ke Epoch 1970:</span> Waktu sistem Linux kembali ke <code className="text-rose-300">1 Januari 1970 00:00:00 UTC</code> karena tidak ada baterai CMOS.
                      </li>
                      <li>
                        <span className="font-semibold text-rose-400">Gagal Validasi SSL / TLS:</span> Panggilan REST API HTTPS ditolak karena sertifikat digital dianggap "belum berlaku" (dibuat setelah 1970).
                      </li>
                      <li>
                        <span className="font-semibold text-rose-400">Log Kejadian Rusak:</span> Riwayat failover Multi-WAN tidak berurutan dan kacau (audit trail tidak valid).
                      </li>
                      <li>
                        <span className="font-semibold text-rose-400">Cron & Kuota Bandwidth Gagal:</span> Penjadwalan periodik dan limitasi bandwidth pengguna tidak tereksekusi.
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={onSimulateColdBootWithoutRtc}
                    className="mt-4 w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Uji Booting TANPA RTC (Simulasi Error)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Current System Impact Status */}
            <div className={`p-4 rounded-lg border text-xs ${
              activeRtc.isSimulated1970Bug
                ? 'bg-rose-950/30 border-rose-700 text-rose-200'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  {activeRtc.isSimulated1970Bug ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Status Audit Integritas Waktu Saat Ini ({activeLinksys.name}):</span>
                </span>
                <span className="font-mono text-cyan-300">
                  {activeRtc.isSimulated1970Bug ? 'ANOMALI TERDETEKSI' : 'KONDISI NOMINAL (AMAN)'}
                </span>
              </div>
              <p className="mt-2 leading-relaxed">
                {activeRtc.isSimulated1970Bug
                  ? 'PERINGATAN KRITIS: Router Linksys saat ini berada dalam kondisi bug 1970! Jam sistem tidak sinkron. Klik tombol "Jalankan hwclock -s" atau "Sinkronkan NTP" di atas untuk memulihkan jam sistem.'
                  : `Sistem waktu router beroperasi dengan presisi tinggi. Modul ${activeRtc.chipModel} menjaga kontinuitas penanggalan bahkan ketika tautan WAN terputus total.`}
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: INSTALLATION & CONFIGURATION GUIDE */}
        {activeSubTab === 'guide' && (
          <div className="space-y-4 pt-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Panduan Lengkap Implementasi Hardware RTC pada Router Linksys OpenWrt</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Langkah-langkah teknis pengkabelan I2C (wiring), instalasi paket driver kernel, dan konfigurasi otomatisasi startup untuk kebutuhan penulisan bab perancangan dan implementasi skripsi.
              </p>
            </div>

            {/* Step 1: Pinout & Wiring */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-xs">Langkah 1: Skema Pengkabelan Header I2C Linksys WRT</span>
                <span className="text-cyan-400 font-mono text-[11px]">Header J1 / GPIO SoC Armada 385</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3 font-mono text-center">
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-rose-400 font-bold">VCC (3.3V)</div>
                  <div className="text-slate-400 text-[10px] mt-1">Pin 1 Header I2C</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-slate-200 font-bold">GND (Ground)</div>
                  <div className="text-slate-400 text-[10px] mt-1">Pin 2 Header I2C</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-cyan-400 font-bold">SDA (Data)</div>
                  <div className="text-slate-400 text-[10px] mt-1">Pin 3 / GPIO 34</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-amber-400 font-bold">SCL (Clock)</div>
                  <div className="text-slate-400 text-[10px] mt-1">Pin 4 / GPIO 35</div>
                </div>
              </div>
            </div>

            {/* Step 2: OpenWrt Packages */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-xs">Langkah 2: Instalasi Driver Kernel & Paket OpenWrt</span>
                <button
                  onClick={() => handleCopy('opkg update && opkg install kmod-i2c-core kmod-i2c-gpio-custom kmod-rtc-ds1307 i2c-tools hwclock', 'cmd1')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 font-mono"
                >
                  {copiedCode === 'cmd1' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'cmd1' ? 'Tersalin' : 'Salin Perintah'}</span>
                </button>
              </div>
              <pre className="mt-2.5 p-3 bg-slate-900 rounded border border-slate-800 font-mono text-cyan-300 text-xs overflow-x-auto">
                opkg update && opkg install kmod-i2c-core kmod-i2c-gpio-custom kmod-rtc-ds1307 i2c-tools hwclock
              </pre>
            </div>

            {/* Step 3: Startup script /etc/rc.local */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-xs">Langkah 3: Konfigurasi Otomatisasi Booting (/etc/rc.local)</span>
                <button
                  onClick={() => handleCopy(`# Register DS3231 to I2C Bus 0\necho ds1307 0x68 > /sys/class/i2c-adapter/i2c-0/new_device\n# Sync system clock from Hardware RTC\n/sbin/hwclock -s\nexit 0`, 'cmd2')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 font-mono"
                >
                  {copiedCode === 'cmd2' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'cmd2' ? 'Tersalin' : 'Salin Skrip'}</span>
                </button>
              </div>
              <pre className="mt-2.5 p-3 bg-slate-900 rounded border border-slate-800 font-mono text-slate-300 text-xs overflow-x-auto">
{`# 1. Daftarkan chip DS3231 ke bus I2C nomor 0 pada alamat 0x68
echo ds1307 0x68 > /sys/class/i2c-adapter/i2c-0/new_device

# 2. Sinkronkan jam Linux dari Hardware RTC seketika saat kernel selesai boot
/sbin/hwclock -s

exit 0`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 5: OPENWRT UBUS JSON-RPC CONSOLE */}
        {activeSubTab === 'ubus_rpc' && (
          <div className="space-y-4 pt-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>Konsol Eksekusi OpenWrt ubus JSON-RPC - {activeLinksys.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Protokol IPC resmi OpenWrt untuk membaca informasi sistem, status RTC ({activeRtc.chipModel}), dan antarmuka Multi-WAN (mwan3)
                  </p>
                </div>

                <button
                  onClick={handleRunUbus}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Jalankan ubus call</span>
                </button>
              </div>

              {/* Endpoint Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <button
                  onClick={() => {
                    setSelectedUbusPath('rtc');
                    setSelectedUbusMethod('status');
                    setUbusResponse(null);
                  }}
                  className={`p-2 rounded border text-left font-mono transition-colors ${
                    selectedUbusPath === 'rtc' ? 'bg-slate-800 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold">rtc status</div>
                  <div className="text-[10px] text-slate-500 font-sans">Status modul {activeRtc.chipModel.split(' ')[0]}</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedUbusPath('system');
                    setSelectedUbusMethod('info');
                    setUbusResponse(null);
                  }}
                  className={`p-2 rounded border text-left font-mono transition-colors ${
                    selectedUbusPath === 'system' && selectedUbusMethod === 'info' ? 'bg-slate-800 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold">system info</div>
                  <div className="text-[10px] text-slate-500 font-sans">Hardware, RAM, Kernel</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedUbusPath('system');
                    setSelectedUbusMethod('get_time');
                    setUbusResponse(null);
                  }}
                  className={`p-2 rounded border text-left font-mono transition-colors ${
                    selectedUbusMethod === 'get_time' ? 'bg-slate-800 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold">system get_time</div>
                  <div className="text-[10px] text-slate-500 font-sans">Waktu UTC & status NTP</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedUbusPath('mwan3');
                    setSelectedUbusMethod('status');
                    setUbusResponse(null);
                  }}
                  className={`p-2 rounded border text-left font-mono transition-colors ${
                    selectedUbusPath === 'mwan3' ? 'bg-slate-800 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold">mwan3 status</div>
                  <div className="text-[10px] text-slate-500 font-sans">OpenWrt Multi-WAN manager</div>
                </button>
              </div>

              {/* Terminal Code Execution Output */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 font-mono">
                  <span>
                    Perintah: <code className="text-cyan-300">ubus call {selectedUbusPath} {selectedUbusMethod}</code>
                  </span>
                  {ubusResponse && (
                    <span className="text-emerald-400">Durasi: {ubusResponse.durationMs} ms</span>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded p-3 h-64 overflow-y-auto text-xs font-mono text-cyan-300">
                  {ubusResponse ? (
                    <pre className="whitespace-pre-wrap">{ubusResponse.response}</pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center">
                      <Terminal className="w-8 h-8 mb-2 opacity-50" />
                      <p>Pilih method dan klik "Jalankan ubus call" untuk menginspeksi respon JSON</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: TAMBAH / EDIT ROUTER LINKSYS DENGAN KATEGORI OPSIONAL LENGKAP */}
      {(showAddModal || editingDevice) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
                  {editingDevice ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {editingDevice ? `Edit Konfigurasi: ${editingDevice.name}` : 'Tambah Perangkat Router Linksys OpenWrt Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Konfigurasi spesifikasi perangkat terdistribusi dengan 6 kategori pengaturan opsional.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingDevice(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {/* Presets Quick-Select Banner */}
            <div className="px-4 sm:px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Preset Cepat Model Router Linksys (Autofill):
                </span>
                <span className="text-[10px] text-slate-500">Klik untuk mengisi konfigurasi dasar</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(idx)}
                    className="p-2 text-left bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 rounded-lg transition-all group"
                  >
                    <div className="font-semibold text-slate-200 text-[11px] truncate group-hover:text-cyan-300">
                      {preset.label.split(' (')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {preset.chipModel.split(' ')[0]} ({preset.i2cAddress})
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="px-4 sm:px-5 pt-3 border-b border-slate-800/80 bg-slate-900/50 shrink-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 min-w-max pb-3 text-xs">
                {[
                  { id: 'identitas', label: '1. Identitas & Peran', badge: 'Wajib & Pilihan', icon: Tag },
                  { id: 'soc', label: '2. SoC & Kernel', badge: 'Opsional', icon: Cpu },
                  { id: 'jaringan', label: '3. Jaringan LAN & Remote', badge: 'Opsional', icon: Network },
                  { id: 'rtc', label: '4. Hardware RTC DS3231', badge: 'Opsional', icon: Clock },
                  { id: 'wifi', label: '5. Wi-Fi Dual-Band', badge: 'Opsional', icon: Wifi },
                  { id: 'monitoring', label: '6. Monitoring & Forensik', badge: 'Opsional', icon: ShieldCheck }
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = modalCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setModalCategory(cat.id as FormCategory)}
                      className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 border text-[11px] ${
                        isActive
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span>{cat.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        cat.badge.includes('Wajib')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {cat.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Form Body by Active Category */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* KATEGORI 1: IDENTITAS & PERAN NODE */}
              {modalCategory === 'identitas' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Identitas dasar perangkat node Linksys. Kolom nama dan model diperlukan sebagai pengenal node di topologi gateway.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Nama / Label Node:</span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Wajib</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.name}
                        onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-sans focus:border-cyan-400 focus:outline-none"
                        placeholder="Linksys WRT3200ACM - Node 4"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Model Hardware:</span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Wajib</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.model}
                        onChange={e => setDeviceForm({ ...deviceForm, model: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-sans focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Peran Node (Device Role):</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <select
                        value={deviceForm.deviceRole}
                        onChange={e => setDeviceForm({ ...deviceForm, deviceRole: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="gateway">Multi-WAN Edge Gateway (Primer)</option>
                        <option value="access_point">High-Density Access Point (Dual-Band)</option>
                        <option value="backup_node">Standby Failover Node (Hot-Spare)</option>
                        <option value="forensic_probe">RTC Timestamping & Forensic Probe</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Hostname OpenWrt:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.hostname}
                        onChange={e => setDeviceForm({ ...deviceForm, hostname: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="OpenWrt-WRT3200-Node"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Lokasi / Ruangan:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.location}
                        onChange={e => setDeviceForm({ ...deviceForm, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-sans focus:border-cyan-400 focus:outline-none"
                        placeholder="Lab Jaringan Komputer Lt. 3"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Status Awal Operasional:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <select
                        value={deviceForm.status}
                        onChange={e => setDeviceForm({ ...deviceForm, status: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="online">Online (Aktif Normal)</option>
                        <option value="warning">Warning (Peringatan)</option>
                        <option value="offline">Offline (Standby)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                      <span>Catatan / Keterangan Node:</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                    </label>
                    <textarea
                      value={deviceForm.notes}
                      onChange={e => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-sans focus:border-cyan-400 focus:outline-none resize-none"
                      placeholder="Contoh: Node dilengkapi baterai cadangan CR2032 baru, terhubung ke switch core VLAN 10."
                    />
                  </div>
                </div>
              )}

              {/* KATEGORI 2: SPESIFIKASI SOC & KERNEL */}
              {modalCategory === 'soc' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Spesifikasi hardware SoC, arsitektur CPU target, dan versi kernel OpenWrt untuk benchmarking daya tampung throughput Multi-WAN.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Target Arsitektur OpenWrt:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.target}
                        onChange={e => setDeviceForm({ ...deviceForm, target: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="mvebu/cortexa9 (Linksys Rango)"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Processor SoC Model:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.soc}
                        onChange={e => setDeviceForm({ ...deviceForm, soc: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-sans focus:border-cyan-400 focus:outline-none"
                        placeholder="Marvell Armada 388 Dual-Core @ 1.8 GHz"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Versi Rilis OpenWrt:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.openwrtVersion}
                        onChange={e => setDeviceForm({ ...deviceForm, openwrtVersion: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Versi Linux Kernel:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.kernelVersion}
                        onChange={e => setDeviceForm({ ...deviceForm, kernelVersion: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>RAM Total (MB):</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.memoryTotalMb}
                          onChange={e => setDeviceForm({ ...deviceForm, memoryTotalMb: Number(e.target.value) || 512 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>RAM Free (MB):</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.memoryFreeMb}
                          onChange={e => setDeviceForm({ ...deviceForm, memoryFreeMb: Number(e.target.value) || 390 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>Flash Storage (MB):</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.flashSizeMb}
                          onChange={e => setDeviceForm({ ...deviceForm, flashSizeMb: Number(e.target.value) || 256 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>Suhu CPU Awal (°C):</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.cpuTempC}
                          onChange={e => setDeviceForm({ ...deviceForm, cpuTempC: Number(e.target.value) || 45 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KATEGORI 3: JARINGAN LAN & PORT REMOTE */}
              {modalCategory === 'jaringan' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Network className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Parameter addressing IP lokal, gateway subnet, DNS resolver, dan port service remote SSH/LuCI HTTP.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Alamat IP LAN Node:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional (Default)</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.lanIp}
                        onChange={e => setDeviceForm({ ...deviceForm, lanIp: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="192.168.1.10"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Subnet Mask:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.subnetMask}
                        onChange={e => setDeviceForm({ ...deviceForm, subnetMask: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="255.255.255.0"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Default Gateway IP:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.gatewayIp}
                        onChange={e => setDeviceForm({ ...deviceForm, gatewayIp: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="192.168.1.1"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>DNS Server:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.dnsServer}
                        onChange={e => setDeviceForm({ ...deviceForm, dnsServer: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="1.1.1.1, 8.8.8.8"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>MAC Address Hardware:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.macAddress}
                        onChange={e => setDeviceForm({ ...deviceForm, macAddress: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="60:38:E0:F4:2A:90"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>Port SSH:</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.remoteSshPort}
                          onChange={e => setDeviceForm({ ...deviceForm, remoteSshPort: Number(e.target.value) || 22 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>Port LuCI HTTP:</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.remoteHttpPort}
                          onChange={e => setDeviceForm({ ...deviceForm, remoteHttpPort: Number(e.target.value) || 80 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold text-[11px] flex items-center justify-between">
                          <span>VLAN ID Trunk:</span>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">Opsional</span>
                        </label>
                        <input
                          type="number"
                          value={deviceForm.vlanId}
                          onChange={e => setDeviceForm({ ...deviceForm, vlanId: Number(e.target.value) || 10 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col justify-end pb-1">
                        <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deviceForm.dhcpEnabled}
                            onChange={e => setDeviceForm({ ...deviceForm, dhcpEnabled: e.target.checked })}
                            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span className="text-[11px] text-slate-300 font-medium">DHCP Server Aktif</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KATEGORI 4: HARDWARE RTC DS3231 & I2C */}
              {modalCategory === 'rtc' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Subsistem Hardware Real-Time Clock I2C (DS3231/DS1307) untuk persistensi waktu offline tanpa internet, mencegah loncatan timestamp UNIX epoch 1970 saat router cold boot.
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-xs">Status Pemasangan Modul Hardware RTC:</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {deviceForm.rtcInstalled ? 'Modul fisik terpasang di header pin I2C motherboard' : 'Modul dinonaktifkan (Simulasi tanpa RTC)'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deviceForm.rtcInstalled}
                        onChange={e => setDeviceForm({ ...deviceForm, rtcInstalled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Model Chip RTC Hardware:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <select
                        value={deviceForm.rtcChipModel}
                        onChange={e => setDeviceForm({ ...deviceForm, rtcChipModel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-400 focus:outline-none text-xs"
                      >
                        <option value="Maxim DS3231 (Extremely Accurate I2C RTC with TCXO)">Maxim DS3231 (Presisi Tinggi TCXO 2ppm)</option>
                        <option value="Dallas DS1307 (Standard Serial I2C RTC)">Dallas DS1307 (Standard 32.768kHz)</option>
                        <option value="NXP PCF8563 (Low-Power CMOS Real-Time Clock)">NXP PCF8563 (Ultra Low Power)</option>
                        <option value="Microchip MCP79410 (I2C RTC with Battery Switchover)">Microchip MCP79410 (EEPROM + SRAM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Alamat Bus I2C (Hex):</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.i2cAddress}
                        onChange={e => setDeviceForm({ ...deviceForm, i2cAddress: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="0x68"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Bus Controller I2C SoC:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.i2cBus}
                        onChange={e => setDeviceForm({ ...deviceForm, i2cBus: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="i2c-0 (SoC I2C Controller)"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Kernel Driver Linux Module:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.driverModule}
                        onChange={e => setDeviceForm({ ...deviceForm, driverModule: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="rtc-ds1307"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Tegangan Baterai Coin Cell (V):</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={deviceForm.batteryVoltage}
                        onChange={e => setDeviceForm({ ...deviceForm, batteryVoltage: parseFloat(e.target.value) || 3.0 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="3.05"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Fallback NTP Server:</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <input
                        type="text"
                        value={deviceForm.ntpServer}
                        onChange={e => setDeviceForm({ ...deviceForm, ntpServer: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="0.id.pool.ntp.org"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                        <span>Interval Auto-Sync Hwclock (sys_to_rtc):</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                      </label>
                      <select
                        value={deviceForm.autoHwclockSyncMinutes}
                        onChange={e => setDeviceForm({ ...deviceForm, autoHwclockSyncMinutes: Number(e.target.value) || 30 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-400 focus:outline-none text-xs"
                      >
                        <option value={15}>Tiap 15 Menit (Presisi Maksimal)</option>
                        <option value={30}>Tiap 30 Menit (Direkomendasikan Skripsi)</option>
                        <option value={60}>Tiap 60 Menit (Hemat Baterai)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* KATEGORI 5: ANTARMUKA WI-FI DUAL-BAND */}
              {modalCategory === 'wifi' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Wifi className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Pengaturan radio nirkabel dual-band 2.4 GHz dan 5 GHz (SSID, channel, tx power, dan mode enkripsi keamanan).
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-xs">Master Wi-Fi Power Switch:</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {deviceForm.wifiMasterEnabled ? 'Semua radio Wi-Fi aktif memancarkan sinyal' : 'Wi-Fi dimatikan (Hanya kabel LAN/WAN)'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deviceForm.wifiMasterEnabled}
                        onChange={e => setDeviceForm({ ...deviceForm, wifiMasterEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                    <span className="text-xs font-semibold text-cyan-300 block">Radio 1: 2.4 GHz (Long Range)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-300 block mb-1 font-medium text-[11px]">SSID 2.4 GHz:</label>
                        <input
                          type="text"
                          value={deviceForm.ssid2g}
                          onChange={e => setDeviceForm({ ...deviceForm, ssid2g: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-medium text-[11px]">Channel:</label>
                        <select
                          value={deviceForm.channel2g}
                          onChange={e => setDeviceForm({ ...deviceForm, channel2g: Number(e.target.value) || 6 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        >
                          <option value={1}>Ch 1 (2412 MHz)</option>
                          <option value={6}>Ch 6 (2437 MHz)</option>
                          <option value={11}>Ch 11 (2462 MHz)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-medium text-[11px]">Tx Power (dBm):</label>
                        <input
                          type="number"
                          value={deviceForm.txPower2g}
                          onChange={e => setDeviceForm({ ...deviceForm, txPower2g: Number(e.target.value) || 20 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                    <span className="text-xs font-semibold text-cyan-300 block">Radio 2: 5 GHz (High Throughput AC/AX)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-slate-300 block mb-1 font-medium text-[11px]">SSID 5 GHz:</label>
                        <input
                          type="text"
                          value={deviceForm.ssid5g}
                          onChange={e => setDeviceForm({ ...deviceForm, ssid5g: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-medium text-[11px]">Channel 5G:</label>
                        <select
                          value={deviceForm.channel5g}
                          onChange={e => setDeviceForm({ ...deviceForm, channel5g: Number(e.target.value) || 36 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        >
                          <option value={36}>Ch 36 (5180 MHz)</option>
                          <option value={40}>Ch 40 (5200 MHz)</option>
                          <option value={44}>Ch 44 (5220 MHz)</option>
                          <option value={48}>Ch 48 (5240 MHz)</option>
                          <option value={149}>Ch 149 (5745 MHz)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-300 block mb-1 font-medium text-[11px]">Bandwidth:</label>
                        <select
                          value={deviceForm.width5g}
                          onChange={e => setDeviceForm({ ...deviceForm, width5g: Number(e.target.value) || 80 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        >
                          <option value={20}>20 MHz</option>
                          <option value={40}>40 MHz</option>
                          <option value={80}>80 MHz (VHT80)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                      <span>Protokol Keamanan Enkripsi Wi-Fi:</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Opsional</span>
                    </label>
                    <select
                      value={deviceForm.encryption}
                      onChange={e => setDeviceForm({ ...deviceForm, encryption: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-400 focus:outline-none text-xs"
                    >
                      <option value="WPA2-PSK (AES)">WPA2-PSK (AES) - Kompatibilitas Luas</option>
                      <option value="WPA3-SAE / WPA2-PSK Mixed">WPA3-SAE / WPA2-PSK Mixed - Modern & Aman</option>
                      <option value="WPA3-SAE">WPA3-SAE Only - Keamanan Tertinggi</option>
                      <option value="none">Open (Tanpa Sandi - Testing Lab)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* KATEGORI 6: MONITORING & FORENSIK SKRIPSI */}
              {modalCategory === 'monitoring' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Integrasi pengawasan telemetri khusus riset skripsi: forward syslog terpusat, deteksi anomali drift waktu, dan sinkronisasi failover mwan3.
                    </span>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                      <div>
                        <div className="font-semibold text-white text-xs">Pengiriman Log Forensik Syslog Terpusat</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Mengirimkan log audit timestamp RTC dan status antarmuka ke router primer MikroTik
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={deviceForm.enableSyslog}
                        onChange={e => setDeviceForm({ ...deviceForm, enableSyslog: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                      <div>
                        <div className="font-semibold text-white text-xs">Alarm Peringatan Time-Drift (&gt; 1000ms)</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Picu notifikasi alarm jika selisih waktu RTC dan jam sistem melewati batas toleransi
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={deviceForm.enableTimeDriftAlarm}
                        onChange={e => setDeviceForm({ ...deviceForm, enableTimeDriftAlarm: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                      <div>
                        <div className="font-semibold text-white text-xs">Kompensasi Termal Kristal TCXO RTC</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Koreksi frekuensi osilator kristal DS3231 berdasarkan telemetri sensor suhu onboard
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={deviceForm.enableRtcThermalSync}
                        onChange={e => setDeviceForm({ ...deviceForm, enableRtcThermalSync: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                      <div>
                        <div className="font-semibold text-white text-xs">Sinkronisasi Hook Multi-WAN mwan3</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Catat transisi status antarmuka gateway (UP, DOWN, FAILOVER) dengan timestamp presisi RTC
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={deviceForm.enableMwan3Sync}
                        onChange={e => setDeviceForm({ ...deviceForm, enableMwan3Sync: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Navigation & Submit Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {modalCategory !== 'identitas' && (
                  <button
                    type="button"
                    onClick={() => {
                      const order: FormCategory[] = ['identitas', 'soc', 'jaringan', 'rtc', 'wifi', 'monitoring'];
                      const curIdx = order.indexOf(modalCategory);
                      if (curIdx > 0) setModalCategory(order[curIdx - 1]);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>
                )}

                {modalCategory !== 'monitoring' && (
                  <button
                    type="button"
                    onClick={() => {
                      const order: FormCategory[] = ['identitas', 'soc', 'jaringan', 'rtc', 'wifi', 'monitoring'];
                      const curIdx = order.indexOf(modalCategory);
                      if (curIdx < order.length - 1) setModalCategory(order[curIdx + 1]);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>Lanjut Kategori</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDevice(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={editingDevice ? handleSaveEdit : handleSaveAdd}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/40 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingDevice ? 'Simpan Perubahan Node' : 'Simpan Perangkat Baru'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS */}
      {deletingDeviceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full shadow-2xl p-5">
            <div className="flex items-center gap-2 text-rose-400 pb-2 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Konfirmasi Hapus Perangkat</h3>
            </div>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Apakah Anda yakin ingin menghapus router Linksys ini dari daftar pemantauan? Konfigurasi dan data telemetri terkait akan dihapus dari sistem monitoring.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeletingDeviceId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors"
              >
                Ya, Hapus Router
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI RESET PABRIK (FIRSTBOOT) */}
      {confirmResetPabrik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full shadow-2xl p-5">
            <div className="flex items-center gap-2 text-rose-400 pb-2 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Reset Pengaturan Pabrik (Firstboot)</h3>
            </div>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Apakah Anda yakin ingin mereset seluruh konfigurasi router <span className="text-white font-bold">{activeLinksys.name}</span> ke setelan awal pabrik OpenWrt?
            </p>
            <div className="text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded border border-rose-900/60 mt-2.5 font-mono space-y-1">
              <div>Perintah: <code className="text-white font-bold">firstboot -y && reboot</code></div>
              <div className="text-[11px] text-rose-400">Partisi /overlay (jffs2) akan dihapus total. SSID dan setelan Wi-Fi nirkabel akan dikembalikan ke default OpenWrt.</div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setConfirmResetPabrik(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onFactoryResetDevice(activeLinksys.id);
                  setConfirmResetPabrik(false);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors"
              >
                Ya, Reset Pabrik
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
