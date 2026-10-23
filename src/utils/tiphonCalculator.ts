import { QoSEvaluation, TiphonCategory, TiphonMetric } from '../types/network';

/**
 * Standar Standar Telekomunikasi ITU-T / TIPHON (Telecommunications and Internet Protocol Harmonization Over Networks)
 * ETSI TR 101 329
 */

export function calculateTiphonDelay(latencyMs: number): TiphonMetric {
  if (latencyMs < 150) {
    return {
      value: latencyMs,
      unit: 'ms',
      category: 'Sangat Baik',
      indexScore: 4,
      thresholdReference: '< 150 ms (Standar TIPHON)'
    };
  } else if (latencyMs <= 300) {
    return {
      value: latencyMs,
      unit: 'ms',
      category: 'Baik',
      indexScore: 3,
      thresholdReference: '150 - 300 ms (Standar TIPHON)'
    };
  } else if (latencyMs <= 450) {
    return {
      value: latencyMs,
      unit: 'ms',
      category: 'Sedang',
      indexScore: 2,
      thresholdReference: '300 - 450 ms (Standar TIPHON)'
    };
  } else {
    return {
      value: latencyMs,
      unit: 'ms',
      category: 'Buruk',
      indexScore: 1,
      thresholdReference: '> 450 ms (Standar TIPHON)'
    };
  }
}

export function calculateTiphonJitter(jitterMs: number): TiphonMetric {
  if (jitterMs <= 20) {
    return {
      value: jitterMs,
      unit: 'ms',
      category: 'Sangat Baik',
      indexScore: 4,
      thresholdReference: '0 - 20 ms (Standar TIPHON)'
    };
  } else if (jitterMs <= 50) {
    return {
      value: jitterMs,
      unit: 'ms',
      category: 'Baik',
      indexScore: 3,
      thresholdReference: '20 - 50 ms (Standar TIPHON)'
    };
  } else if (jitterMs <= 75) {
    return {
      value: jitterMs,
      unit: 'ms',
      category: 'Sedang',
      indexScore: 2,
      thresholdReference: '50 - 75 ms (Standar TIPHON)'
    };
  } else {
    return {
      value: jitterMs,
      unit: 'ms',
      category: 'Buruk',
      indexScore: 1,
      thresholdReference: '> 75 ms (Standar TIPHON)'
    };
  }
}

export function calculateTiphonPacketLoss(lossPct: number): TiphonMetric {
  if (lossPct <= 0.5) {
    return {
      value: lossPct,
      unit: '%',
      category: 'Sangat Baik',
      indexScore: 4,
      thresholdReference: '0% - 0.5% (Standar TIPHON)'
    };
  } else if (lossPct <= 3) {
    return {
      value: lossPct,
      unit: '%',
      category: 'Baik',
      indexScore: 3,
      thresholdReference: '0.6% - 3% (Standar TIPHON)'
    };
  } else if (lossPct <= 15) {
    return {
      value: lossPct,
      unit: '%',
      category: 'Sedang',
      indexScore: 2,
      thresholdReference: '4% - 15% (Standar TIPHON)'
    };
  } else {
    return {
      value: lossPct,
      unit: '%',
      category: 'Buruk',
      indexScore: 1,
      thresholdReference: '> 15% (Standar TIPHON)'
    };
  }
}

export function calculateTiphonThroughput(throughputMbps: number): TiphonMetric {
  // TIPHON: > 2.1 Mbps Sangat Baik, 1.2 - 2.1 Baik, 0.7 - 1.2 Sedang, < 0.7 Buruk
  if (throughputMbps >= 2.1) {
    return {
      value: throughputMbps,
      unit: 'Mbps',
      category: 'Sangat Baik',
      indexScore: 4,
      thresholdReference: '> 2.1 Mbps (Standar TIPHON)'
    };
  } else if (throughputMbps >= 1.2) {
    return {
      value: throughputMbps,
      unit: 'Mbps',
      category: 'Baik',
      indexScore: 3,
      thresholdReference: '1.2 - 2.1 Mbps (Standar TIPHON)'
    };
  } else if (throughputMbps >= 0.7) {
    return {
      value: throughputMbps,
      unit: 'Mbps',
      category: 'Sedang',
      indexScore: 2,
      thresholdReference: '0.7 - 1.2 Mbps (Standar TIPHON)'
    };
  } else {
    return {
      value: throughputMbps,
      unit: 'Mbps',
      category: 'Buruk',
      indexScore: 1,
      thresholdReference: '< 0.7 Mbps (Standar TIPHON)'
    };
  }
}

export function evaluateQoS(
  throughputMbps: number,
  latencyMs: number,
  jitterMs: number,
  packetLossPct: number
): QoSEvaluation {
  const throughput = calculateTiphonThroughput(throughputMbps);
  const delay = calculateTiphonDelay(latencyMs);
  const jitter = calculateTiphonJitter(jitterMs);
  const packetLoss = calculateTiphonPacketLoss(packetLossPct);

  // Mean Opinion Score / Indeks Rata-Rata TIPHON
  const overallScore = Number(
    ((throughput.indexScore + delay.indexScore + jitter.indexScore + packetLoss.indexScore) / 4).toFixed(2)
  );

  let overallCategory: TiphonCategory = 'Sangat Baik';
  if (overallScore >= 3.75) {
    overallCategory = 'Sangat Baik';
  } else if (overallScore >= 3.0) {
    overallCategory = 'Baik';
  } else if (overallScore >= 2.0) {
    overallCategory = 'Sedang';
  } else {
    overallCategory = 'Buruk';
  }

  return {
    throughput,
    delay,
    jitter,
    packetLoss,
    overallScore,
    overallCategory
  };
}
