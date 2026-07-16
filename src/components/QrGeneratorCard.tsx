import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrGeneratorCardProps {
  student: { id: string; name: string };
  assignedBracketId: string;
}

/**
 * Asset Token Provisioning Panel
 *
 * Generates a QR code containing session initialization parameters
 * that the Android app scans to auto-configure:
 *   - Student ID
 *   - Bracket calibration ID
 *   - GMAW operational limits (Vmax, WFSmax)
 *
 * Once scanned, the phone maps its telemetry to the correct
 * instructor dashboard panel.
 */
export function QrGeneratorCard({ student, assignedBracketId }: QrGeneratorCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Static GMAW operational limit configurations
  const targetLimits = { vmax: 24.5, wfsmax: 420 };

  useEffect(() => {
    if (!student || !assignedBracketId || !canvasRef.current) return;

    const payload =
      `weldvision://session-init` +
      `?sid=${student.id}` +
      `&bid=${assignedBracketId}` +
      `&vmax=${targetLimits.vmax}` +
      `&wfsmax=${targetLimits.wfsmax}`;

    QRCode.toCanvas(canvasRef.current, payload, {
      width: 130,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    }).catch((err) => console.error('QR generation failed:', err));
  }, [student, assignedBracketId]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
      <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
        Hardware Provisioning
      </h4>
      <div className="p-1.5 bg-white rounded-xl shadow-md">
        <canvas ref={canvasRef} />
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs font-bold text-slate-200">{student.name}</p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
          Asset Bind: {assignedBracketId}
        </p>
      </div>
    </div>
  );
}
