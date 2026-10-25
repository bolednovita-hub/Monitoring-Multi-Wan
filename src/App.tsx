/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { KpiOverview } from './components/KpiOverview';
import { WanCardGrid } from './components/WanCardGrid';
import { TrafficChartSection } from './components/TrafficChartSection';
import { TopologyMap } from './components/TopologyMap';
import { RouterApiInspector } from './components/RouterApiInspector';
import { TiphonQosEvaluation } from './components/TiphonQosEvaluation';
import { LinksysRtcExplorer } from './components/LinksysRtcExplorer';
import { ChaosLabModal } from './components/ChaosLabModal';
import { EventLogSection } from './components/EventLogSection';
import { PccConnectionTracker } from './components/PccConnectionTracker';
import { RouterCliTerminal } from './components/RouterCliTerminal';
import { DefensePresentationModal } from './components/DefensePresentationModal';
import { MultiWanStrategyPanel } from './components/MultiWanStrategyPanel';
import { LoginModal } from './components/LoginModal';
import { AccessDeniedModal } from './components/AccessDeniedModal';
import { networkEngine } from './services/networkEngine';
import { authService } from './services/authService';
import { WanId } from './types/network';
import { FlaskConical, CheckCircle2, AlertTriangle, ShieldCheck, GraduationCap, Bell, Terminal, Lock, User } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showChaosModal, setShowChaosModal] = useState<boolean>(false);
  const [showDefenseModal, setShowDefenseModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState<{ isOpen: boolean; actionTitle: string }>({
    isOpen: false,
    actionTitle: '',
  });
  const [authUser, setAuthUser] = useState(authService.getCurrentUser());
  const [telegramToast, setTelegramToast] = useState<string | null>(null);

  // Engine state synchronizer
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = networkEngine.subscribe(() => {
      setTick(t => t + 1);
    });
    const unsubAuth = authService.subscribe(() => {
      setAuthUser(authService.getCurrentUser());
    });
    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, []);

  const wans = networkEngine.getWans();
  const router = networkEngine.getRouter();
  const linksysDevices = networkEngine.getLinksysDevices();
  const activeLinksysId = networkEngine.getActiveLinksysId();
  const activeLinksys = networkEngine.getActiveLinksys();
  const activeRtc = networkEngine.getActiveRtc();
  const routes = networkEngine.getRoutes();
  const events = networkEngine.getEvents();
  const apiLogs = networkEngine.getApiLogs();
  const apiConfig = networkEngine.getApiConfig();
  const chaosState = networkEngine.getChaosState();
  const aggregate = networkEngine.getAggregateMetrics();
  const crossLayerSync = networkEngine.getCrossLayerSyncStatus();
  const benchmarks = networkEngine.getBenchmarks();
  const pccConnections = networkEngine.getPccConnections();
  const netwatchTargets = networkEngine.getNetwatchTargets();
  const rtcRegisters = networkEngine.getRtcRegisterMap();
  const telegramConfig = networkEngine.getTelegramAlertConfig();
  const loadBalancingConfig = networkEngine.getLoadBalancingConfig();
  const trafficCategories = networkEngine.getTrafficCategoryStats();
  const wifiScans = {
    '2.4GHz': networkEngine.getWifiScanResults('2.4GHz'),
    '5GHz': networkEngine.getWifiScanResults('5GHz')
  };

  const handleToggleLink = (wanId: WanId) => {
    if (!authService.checkPermission('canInjectChaos')) {
      setAccessDenied({
        isOpen: true,
        actionTitle: 'Memutuskan / Mengaktifkan Antarmuka WAN (Simulasi Kabel Putus)'
      });
      return;
    }
    networkEngine.toggleLinkStatus(wanId);
  };

  const handleSetLatency = (wanId: WanId, latency: number) => {
    if (!authService.checkPermission('canInjectChaos')) {
      setAccessDenied({
        isOpen: true,
        actionTitle: 'Injeksi Lonjakan Latensi WAN'
      });
      return;
    }
    networkEngine.setLatencySpike(wanId, latency);
  };

  const handleSetLoss = (wanId: WanId, loss: number) => {
    if (!authService.checkPermission('canInjectChaos')) {
      setAccessDenied({
        isOpen: true,
        actionTitle: 'Injeksi Packet Loss WAN'
      });
      return;
    }
    networkEngine.setPacketLossSpike(wanId, loss);
  };

  const handleResetChaos = () => {
    if (!authService.checkPermission('canInjectChaos')) {
      setAccessDenied({
        isOpen: true,
        actionTitle: 'Mereset Skenario Pengujian'
      });
      return;
    }
    networkEngine.resetAllChaos();
  };

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csv = networkEngine.exportTelemetryCsv();
    downloadBlob(csv, `telemetri-multi-wan-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJson = () => {
    const json = networkEngine.exportTelemetryJson();
    downloadBlob(json, `telemetri-multi-wan-${Date.now()}.json`, 'application/json');
  };

  const handleExportBenchmarkCsv = () => {
    const csv = networkEngine.exportFailoverLogCsv();
    downloadBlob(csv, `benchmark-failover-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleTogglePause = () => {
    if (isPaused) {
      networkEngine.startLoop();
      setIsPaused(false);
    } else {
      networkEngine.stopLoop();
      setIsPaused(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Vertical Navigation Sidebar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        pollInterval={apiConfig.pollIntervalMs}
        onChangePollInterval={(interval) => networkEngine.setPollInterval(interval)}
        onOpenChaosModal={() => setShowChaosModal(true)}
        onOpenDefenseModal={() => setShowDefenseModal(true)}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Main Content Viewport Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast Alert Notification */}
        {telegramToast && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-950 border border-emerald-700 text-emerald-200 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{telegramToast}</span>
          </div>
        )}

        {/* NOC Performance Kicker Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE NOC MONITORING
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-cyan-400 font-mono">RouterOS v7 REST API Engine</span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-slate-400 font-medium">OpenWrt Hardware RTC Subsystem</span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white mt-0.5 tracking-tight">
              SISTEM MONITORING KINERJA MULTI-WAN BERBASIS WEB REAL TIME
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDefenseModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm border border-cyan-400/40"
            >
              <GraduationCap className="w-3.5 h-3.5 text-cyan-200" />
              <span>Presentasi Arsitektur NOC</span>
            </button>
            <button
              onClick={() => setShowChaosModal(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Lab Simulasi Failover</span>
            </button>
            {/* Aesthetic Icon-Only Admin Login Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className={`p-2 rounded-lg transition-all flex items-center justify-center relative group border shadow-sm ${
                authUser?.role === 'admin'
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border-slate-700'
              }`}
              title={authUser?.role === 'admin' ? `Administrator Aktif: ${authUser.fullName}` : 'Login Administrator (Hanya Admin)'}
              aria-label="Login Administrator"
            >
              {authUser?.role === 'admin' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                </>
              ) : (
                <Lock className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>
        </div>

        {/* Global KPI Telemetry Ribbon (Always Visible on Dashboard & Main Views) */}
        <KpiOverview
          totalRx={aggregate.totalRx}
          totalTx={aggregate.totalTx}
          totalBandwidth={aggregate.totalBandwidth}
          activeCount={aggregate.activeCount}
          standbyCount={aggregate.standbyCount}
          downCount={aggregate.downCount}
          avgLatency={aggregate.avgLatency}
          avgJitter={aggregate.avgJitter}
          avgLoss={aggregate.avgLoss}
          router={router}
          qos={aggregate.qos}
          overallHealthScore={aggregate.overallHealthScore}
          overallMosScore={aggregate.overallMosScore}
          failoverSwitchSpeedMs={aggregate.failoverSwitchSpeedMs}
        />

        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Multi-WAN Interface Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Status Antarmuka Multi-WAN & Kinerja Real-Time
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  3 Gerbang Terkonfigurasi (IndiHome · Biznet · Telkomsel Orbit)
                </span>
              </div>
              <WanCardGrid
                wans={wans}
                onToggleLink={handleToggleLink}
                onSetLatency={handleSetLatency}
                onSetLoss={handleSetLoss}
                chaosState={chaosState}
              />
            </div>

            {/* Multi-WAN Strategy, Load Balancing Engine & Traffic Classifier Panel */}
            <MultiWanStrategyPanel
              config={loadBalancingConfig}
              trafficCategories={trafficCategories}
              wans={wans}
              onChangeMode={(mode) => networkEngine.setLoadBalancingMode(mode)}
              onChangePccClassifier={(classifier) => networkEngine.setPccClassifier(classifier)}
              onChangeCheckInterval={(sec) => networkEngine.setCheckGatewayInterval(sec)}
            />

            {/* Traffic History Multi-Series Chart */}
            <TrafficChartSection
              wans={wans}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
            />

            {/* Event & Failover Audit Logs */}
            <EventLogSection events={events} />
          </div>
        )}

        {/* Tab 2: Network Topology & Failover Route Map */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            <TopologyMap
              wans={wans}
              routes={routes}
              onToggleLink={handleToggleLink}
              linksysDevice={activeLinksys}
              crossLayerSync={crossLayerSync}
              onToggleLocalMasterNtp={() => networkEngine.toggleLocalMasterNtp()}
              topologyMode={networkEngine.getTopologyMode()}
              onSelectTopologyMode={(mode) => networkEngine.setTopologyMode(mode)}
              vrrpMaster={networkEngine.getVrrpMasterRouter()}
              onToggleVrrpMaster={() => networkEngine.toggleVrrpMaster()}
            />
            <EventLogSection events={events} />
          </div>
        )}

        {/* Tab: PCC Connection Tracker & Session Hashing */}
        {activeTab === 'pcc' && (
          <div className="space-y-6">
            <PccConnectionTracker
              connections={pccConnections}
              wans={wans}
              onSimulateNewSession={(params) => networkEngine.simulateNewPccConnection(params)}
              onTerminateConnection={(id) => networkEngine.terminatePccConnection(id)}
              onResetConnections={() => networkEngine.resetPccConnections()}
            />
          </div>
        )}

        {/* Tab: MikroTik CLI Terminal & Netwatch */}
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            <RouterCliTerminal
              onExecuteCommand={(cmd) => networkEngine.executeCliCommand(cmd)}
              netwatchTargets={netwatchTargets}
              onPingTarget={(targetId) => networkEngine.pingNetwatchTarget(targetId)}
            />
          </div>
        )}

        {/* Tab 3: RouterOS REST API Inspector */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <RouterApiInspector
              apiConfig={apiConfig}
              apiLogs={apiLogs}
              onUpdateConfig={(cfg) => networkEngine.updateApiConfig(cfg)}
              onExecuteTest={(endpoint) => networkEngine.executeApiTest(endpoint)}
            />
          </div>
        )}

        {/* Tab 4: TIPHON QoS Evaluation */}
        {activeTab === 'tiphon' && (
          <div className="space-y-6">
            <TiphonQosEvaluation
              qos={aggregate.qos}
              wans={wans}
              onExportCsv={handleExportCsv}
              onExportJson={handleExportJson}
            />
          </div>
        )}

        {/* Tab: Linksys Router & OpenWrt RTC Subsystem */}
        {activeTab === 'linksys' && (
          <div className="space-y-6">
            <LinksysRtcExplorer
              linksysDevices={linksysDevices}
              activeLinksysId={activeLinksysId}
              activeLinksys={activeLinksys}
              activeRtc={activeRtc}
              rtcRegisters={rtcRegisters}
              wifiScans={wifiScans}
              onRunWifiScan={(band) => networkEngine.runWifiSiteSurvey(band)}
              crossLayerSync={crossLayerSync}
              onToggleLocalMasterNtp={() => networkEngine.toggleLocalMasterNtp()}
              onSelectDevice={(id) => networkEngine.setActiveLinksys(id)}
              onAddDevice={(data) => networkEngine.addLinksysDevice(data)}
              onUpdateDevice={(id, updates) => networkEngine.updateLinksysDevice(id, updates)}
              onDeleteDevice={(id) => networkEngine.deleteLinksysDevice(id)}
              onSyncHwclock={(dir) => networkEngine.syncHwclock(dir)}
              onToggleRtcModule={() => networkEngine.toggleRtcModule()}
              onSimulateColdBootWithRtc={() => networkEngine.simulateColdBootWithRtc()}
              onSimulateColdBootWithoutRtc={() => networkEngine.simulateColdBootWithoutRtc()}
              onRestoreNormalTime={() => networkEngine.restoreNormalTime()}
              onExecuteUbus={(path, method) => networkEngine.executeUbusCall(path, method)}
              onSetWifiMasterPower={(enabled, id) => networkEngine.setWifiMasterPower(enabled, id)}
              onToggleWifiRadio={(radioId, id) => networkEngine.toggleWifiRadio(radioId, id)}
              onUpdateWifiRadio={(radioId, updates, id) => networkEngine.updateWifiRadio(radioId, updates, id)}
              onRebootDevice={(id) => networkEngine.rebootLinksysDevice(id)}
              onPowerOffDevice={(id) => networkEngine.powerOffLinksysDevice(id)}
              onPowerOnDevice={(id) => networkEngine.powerOnLinksysDevice(id)}
              onFactoryResetDevice={(id) => networkEngine.factoryResetLinksysDevice(id)}
              onExecuteRemoteSsh={(command, id) => networkEngine.executeRemoteSshCommand(command, id)}
            />
          </div>
        )}

        {/* Tab 5: Chaos Lab & Testing Suite */}
        {activeTab === 'chaos' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Lab Pengujian & Simulasi Failover Multi-WAN
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Uji ketangguhan Multi-WAN dengan simulasi pemutusan serat optik, lonjakan latensi, dan packet loss
                  </p>
                </div>
                <button
                  onClick={() => setShowChaosModal(true)}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors"
                >
                  Buka Panel Skenario Interaktif
                </button>
              </div>

              <div className="mt-4">
                <WanCardGrid
                  wans={wans}
                  onToggleLink={handleToggleLink}
                  onSetLatency={handleSetLatency}
                  onSetLoss={handleSetLoss}
                  chaosState={chaosState}
                />
              </div>
            </div>

            <EventLogSection events={events} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 mt-12 py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Sistem Monitoring Kinerja Multi-WAN</span>
            <span>·</span>
            <span>Integrasi MikroTik RouterOS API</span>
            <span>·</span>
            <span>Linksys OpenWrt (DS3231 RTC)</span>
            <span>·</span>
            <span className="font-mono">Standar TIPHON ETSI</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            NOC Telemetry & Multi-WAN Monitoring System © 2026
          </div>
        </div>
      </footer>
      </div>

      {/* Modals */}
      <ChaosLabModal
        isOpen={showChaosModal}
        onClose={() => setShowChaosModal(false)}
        onToggleLink={handleToggleLink}
        onSetLatency={handleSetLatency}
        onSetLoss={handleSetLoss}
        onResetAll={handleResetChaos}
        chaosState={chaosState}
        benchmarks={benchmarks}
        onRunBenchmark={(targetWanId) => networkEngine.runAutomatedFailoverBenchmark(targetWanId)}
        onExportBenchmarkCsv={handleExportBenchmarkCsv}
      />

      <DefensePresentationModal
        isOpen={showDefenseModal}
        onClose={() => setShowDefenseModal(false)}
        wans={wans}
        router={router}
        qos={aggregate.qos}
        benchmarks={benchmarks}
        crossLayerSync={crossLayerSync}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <AccessDeniedModal
        isOpen={accessDenied.isOpen}
        onClose={() => setAccessDenied({ isOpen: false, actionTitle: '' })}
        actionTitle={accessDenied.actionTitle}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />
    </div>
  );
}
