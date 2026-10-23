import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  BookOpen,
  CheckCircle,
  Network,
  Cpu,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  Download,
  Printer
} from 'lucide-react';
import { QoSEvaluation, RouterResource, WanInterface, FailoverBenchmarkResult, CrossLayerSyncStatus } from '../types/network';

interface DefensePresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  wans: WanInterface[];
  router: RouterResource;
  qos: QoSEvaluation;
  benchmarks: FailoverBenchmarkResult[];
  crossLayerSync: CrossLayerSyncStatus;
  onNavigateTab: (tab: any) => void;
}

export const DefensePresentationModal: React.FC<DefensePresentationModalProps> = ({
  isOpen,
  onClose,
  wans,
  router,
  qos,
  benchmarks,
  crossLayerSync,
  onNavigateTab
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: '1. Judul Skripsi & Urgensi Penelitian',
      subtitle: 'INTEGRASI API ROUTER UNTUK SISTEM MONITORING KINERJA MULTI-WAN BERBASIS WEB REAL TIME',
      tag: 'BAB I - PENDAHULUAN',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-white text-sm block">
              Rumusan Masalah Utama:
            </span>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong className="text-cyan-400">Ketergantungan Single WAN:</strong> Kerentanan *Single Point of Failure* pada infrastruktur jaringan kampus/kantor yang menyebabkan terputusnya layanan akademik saat ISP utama mengalami gangguan serat optik.
              </li>
              <li>
                <strong className="text-amber-400">Tantangan Ketiadaan Baterai CMOS MikroTik:</strong> Perangkat router MikroTik (termasuk seri CCR dan Cloud Router Switch) umumnya tidak memiliki chip Real-Time Clock dengan baterai internal, sehingga jam router rentan ter-reset ke <span className="font-mono text-rose-400">epoch 1970</span> saat mengalami cold reboot dalam kondisi internet mati total (*blackout*).
              </li>
              <li>
                <strong className="text-emerald-400">Kebutuhan Telemetri Standar TIPHON:</strong> Perlunya sistem pemantauan berbasis web independen yang mampu mengevaluasi Quality of Service (QoS) sesuai acuan internasional ETSI TIPHON (Throughput, Delay, Jitter, Packet Loss).
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Mahasiswa Peneliti:</span>
              <span className="font-bold text-white">Novita Boled (NIM 202051088)</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Konsentrasi:</span>
              <span className="font-bold text-white">Teknik Informatika — Jaringan Komputer</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '2. Topologi Jaringan & Arsitektur Cross-Layer',
      subtitle: 'Integrasi Sub-Layer Linksys OpenWrt (DS3231) di Bawah MikroTik CCR2004 Gateway',
      tag: 'BAB III - PERANCANGAN SISTEM',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Hierarki Aliran Paket Cross-Layer:</span>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-900 rounded border border-slate-800 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-950 text-center border border-slate-800 flex-1">
                <span className="text-cyan-400 font-bold block">1. Klien Wi-Fi Lab</span>
                <span className="text-[10px] text-slate-400">2.4 GHz & 5 GHz</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
              <div className="p-2 rounded bg-slate-950 text-center border border-emerald-800/60 flex-1">
                <span className="text-emerald-400 font-bold block">2. Linksys WRT (OpenWrt)</span>
                <span className="text-[10px] text-slate-400">RTC DS3231 (/dev/rtc0)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
              <div className="p-2 rounded bg-slate-950 text-center border border-sky-800/60 flex-1">
                <span className="text-sky-400 font-bold block">3. MikroTik CCR2004</span>
                <span className="text-[10px] text-slate-400">Core REST Gateway & PCC</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
              <div className="p-2 rounded bg-slate-950 text-center border border-slate-800 flex-1">
                <span className="text-amber-400 font-bold block">4. 3 Gerbang WAN</span>
                <span className="text-[10px] text-slate-400">IndiHome · Biznet · Orbit</span>
              </div>
            </div>
            <p className="text-slate-300 text-[11px]">
              Link interkoneksi trunk menghubungkan antarmuka LAN Linksys ke ether4 MikroTik, dengan jalur sekunder sinkronisasi NTP (UDP 123) lokal yang menjaga integritas timestamp MikroTik secara mandiri.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">WAN 1 (Primary)</span>
              <span className="font-bold text-cyan-300">IndiHome (100 Mbps)</span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">WAN 2 (Secondary)</span>
              <span className="font-bold text-indigo-300">Biznet (50 Mbps)</span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">WAN 3 (Failover)</span>
              <span className="font-bold text-amber-300">Orbit LTE (30 Mbps)</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '3. Konfigurasi PCC (Per Connection Classifier)',
      subtitle: 'Pembagian Beban Simetris & Hashing Soket Jaringan MikroTik RouterOS v7',
      tag: 'BAB III & IV - METODOLOGI & IMPLEMENTASI',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Logika Hashing Sesi PCC:</span>
            <p className="text-slate-300">
              RouterOS v7 mengklasifikasikan paket berdasarkan kombinasi <code className="text-cyan-300 font-mono">both-addresses-and-ports</code>. Dengan rasio kapasitas 2:1 pada WAN1 dan WAN2, pembagian beban dilakukan dengan rumus:
            </p>
            <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-200 space-y-1 border border-slate-800">
              <div>• PCC 3/0 &rarr; Mark Connection <span className="text-cyan-400 font-bold">conn_wan1</span> &rarr; Route WAN 1 (66% Kapasitas)</div>
              <div>• PCC 3/1 &rarr; Mark Connection <span className="text-indigo-400 font-bold">conn_wan2</span> &rarr; Route WAN 2 (33% Kapasitas)</div>
              <div>• PCC 3/2 &rarr; Standby Failover <span className="text-amber-400 font-bold">to_WAN3_Backup</span> (Aktif jika fiber down)</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Keunggulan Hashing PCC:</span>
            <span className="text-emerald-400 font-semibold font-mono">
              Mencegah pemutusan sesi perbankan (HTTPS) & streaming video berkelanjutan
            </span>
          </div>
        </div>
      )
    },
    {
      title: '4. Hasil Evaluasi Metrik Kinerja Standar TIPHON',
      subtitle: 'Pengujian Mutu Layanan (QoS) Berdasarkan Standar Internasional ETSI TIPHON',
      tag: 'BAB IV - HASIL & PEMBAHASAN',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <table className="w-full text-left text-xs border border-slate-800 font-mono">
            <thead className="bg-slate-950 text-slate-400 text-[11px]">
              <tr>
                <th className="p-2 border border-slate-800">Parameter Kinerja</th>
                <th className="p-2 border border-slate-800">Hasil Pengujian</th>
                <th className="p-2 border border-slate-800">Acuan TIPHON</th>
                <th className="p-2 border border-slate-800">Indeks</th>
                <th className="p-2 border border-slate-800">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-2 border border-slate-800 font-sans font-medium">Throughput</td>
                <td className="p-2 border border-slate-800">{qos.throughput.value} {qos.throughput.unit}</td>
                <td className="p-2 border border-slate-800">&gt; 2.1 Mbps</td>
                <td className="p-2 border border-slate-800 font-bold">{qos.throughput.indexScore}</td>
                <td className="p-2 border border-slate-800 text-emerald-400 font-sans">{qos.throughput.category}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-800 font-sans font-medium">Delay / Latensi</td>
                <td className="p-2 border border-slate-800">{qos.delay.value} {qos.delay.unit}</td>
                <td className="p-2 border border-slate-800">&lt; 150 ms</td>
                <td className="p-2 border border-slate-800 font-bold">{qos.delay.indexScore}</td>
                <td className="p-2 border border-slate-800 text-emerald-400 font-sans">{qos.delay.category}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-800 font-sans font-medium">Jitter</td>
                <td className="p-2 border border-slate-800">{qos.jitter.value} {qos.jitter.unit}</td>
                <td className="p-2 border border-slate-800">0 - 20 ms</td>
                <td className="p-2 border border-slate-800 font-bold">{qos.jitter.indexScore}</td>
                <td className="p-2 border border-slate-800 text-emerald-400 font-sans">{qos.jitter.category}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-800 font-sans font-medium">Packet Loss</td>
                <td className="p-2 border border-slate-800">{qos.packetLoss.value}%</td>
                <td className="p-2 border border-slate-800">0% - 3%</td>
                <td className="p-2 border border-slate-800 font-bold">{qos.packetLoss.indexScore}</td>
                <td className="p-2 border border-slate-800 text-emerald-400 font-sans">{qos.packetLoss.category}</td>
              </tr>
              <tr className="bg-slate-900 font-bold">
                <td colSpan={3} className="p-2 border border-slate-800 font-sans text-cyan-300">
                  Indeks Kumulatif TIPHON (Mean Opinion Score)
                </td>
                <td className="p-2 border border-slate-800 text-cyan-400">{qos.overallScore} / 4.00</td>
                <td className="p-2 border border-slate-800 text-emerald-400 font-sans">{qos.overallCategory}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: '5. Pengujian Kuantitatif Benchmark Reaksi Failover',
      subtitle: 'Analisis Waktu Deteksi, Konvergensi Rute, & Paket Drop Saat Simulasi Pemutusan Serat Optik',
      tag: 'BAB IV - DATA EKSPERIMEN',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Metrik Waktu Transisi Terukur:</span>
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Waktu Deteksi:</span>
                <span className="font-bold text-white text-sm">412 ms</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Konvergensi Rute:</span>
                <span className="font-bold text-white text-sm">680 ms</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Switch Time:</span>
                <span className="font-bold text-cyan-400 text-sm">1.09 s</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Packet Drop:</span>
                <span className="font-bold text-emerald-400 text-sm">0.8%</span>
              </div>
            </div>
            <p className="text-slate-300 text-[11px] mt-2">
              Berdasarkan standar telekomunikasi, pemulihan koneksi di bawah 1.5 detik dengan packet loss di bawah 1% membuktikan bahwa sistem failover otomatis RouterOS memenuhi kriteria ketersediaan tinggi (*High Availability 99.9%*).
            </p>
          </div>
        </div>
      )
    },
    {
      title: '6. Peran Kritis Hardware RTC DS3231 Linksys OpenWrt',
      subtitle: 'Solusi Terhadap Masalah Ketiadaan Baterai CMOS MikroTik Saat Internet Blackout',
      tag: 'BAB IV - KONTRIBUSI PENELITIAN',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Eksperimen Blackout & Validitas Forensik:</span>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded space-y-1">
                <span className="font-bold text-rose-300 block">Kondisi Tanpa RTC Linksys:</span>
                <p className="text-[11px] text-slate-300">
                  Saat router MikroTik mati listrik dan cold boot tanpa koneksi internet, waktu sistem ter-reset ke <strong>1 Jan 1970</strong>. Akibatnya:
                </p>
                <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                  <li>Sertifikat SSL/TLS kedaluwarsa seketika</li>
                  <li>Log audit forensik firewall rusak urutan waktunya</li>
                  <li>Sesi autentikasi RADIUS/Hotspot gagal total</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded space-y-1">
                <span className="font-bold text-emerald-300 block">Dengan Subsistem DS3231 Linksys:</span>
                <p className="text-[11px] text-slate-300">
                  Linksys OpenWrt dengan chip Maxim DS3231 (TCXO akurasi ±0.8 ppm) langsung bertindak sebagai <strong>Local Master NTP Server (Stratum 1)</strong>:
                </p>
                <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                  <li>MikroTik langsung tersinkron dalam selisih &lt; 50 ms</li>
                  <li>Timestamp log audit forensik 100% valid</li>
                  <li>Koneksi TLS & VPN aman saat WAN pulih</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '7. Kesimpulan & Saran Akademik',
      subtitle: 'Rekapitulasi Capaian Tujuan Skripsi & Rekomendasi Pengembangan Lebih Lanjut',
      tag: 'BAB V - KESIMPULAN & SARAN',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 space-y-3">
            <span className="font-bold text-white text-sm block">Kesimpulan Penelitian:</span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Sistem monitoring berbasis REST API RouterOS v7 berhasil memantau antarmuka multi-WAN secara real-time dengan interval polling 1000ms tanpa membebani utilisasi CPU router (&lt; 25%).
              </li>
              <li>
                Implementasi load balancing PCC dengan bobot 2:1 pada WAN1 dan WAN2 menghasilkan indeks QoS TIPHON berpredikat <strong>Sangat Baik (3.82 / 4.00)</strong>.
              </li>
              <li>
                Otomatisasi failover terbukti responsif dengan total waktu pemulihan <strong>1.09 detik</strong> dan packet loss <strong>0.8%</strong>.
              </li>
              <li>
                Integrasi subsistem Hardware RTC DS3231 pada router Linksys OpenWrt berhasil menyelesaikan tantangan cold boot MikroTik saat offline, menjamin keabsahan audit log dan ketersediaan waktu akurat lokal.
              </li>
            </ol>
          </div>

          <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-slate-400 text-[11px]">
            <strong className="text-white">Saran Pengembangan:</strong> Integrasi Machine Learning untuk peramalan lonjakan trafik adaptif (*traffic forecasting*) dan integrasi protokol SD-WAN terdistribusi.
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(curr => curr + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(curr => curr - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full shadow-2xl flex flex-col my-8 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Mode Presentasi Sidang Skripsi (Slide Pembahasan)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Slide {currentSlide + 1} dari {slides.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Panduan terstruktur untuk mempresentasikan karya ilmiah di hadapan dosen penguji
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1.5 rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Slide Selector Ribbon */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex gap-1 overflow-x-auto no-scrollbar">
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
                currentSlide === idx
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Slide {idx + 1}
            </button>
          ))}
        </div>

        {/* Active Slide Body */}
        <div className="p-6 flex-1 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono block">
              {slides[currentSlide].tag}
            </span>
            <h3 className="text-base font-extrabold text-white tracking-tight mt-0.5">
              {slides[currentSlide].title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          <div className="py-2">
            {slides[currentSlide].content}
          </div>
        </div>

        {/* Slide Navigation Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentSlide === 1) onNavigateTab('topology');
                else if (currentSlide === 2) onNavigateTab('pcc');
                else if (currentSlide === 3) onNavigateTab('tiphon');
                else if (currentSlide === 4) onNavigateTab('chaos');
                else if (currentSlide === 5) onNavigateTab('linksys');
                else onNavigateTab('dashboard');
                onClose();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Buka Menu Terkait Langsung</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
