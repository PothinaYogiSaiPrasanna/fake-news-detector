import { useCallback, useRef, useState } from 'react';
import type { AnalysisResult } from '../../engine/types';

interface DownloadPDFButtonProps {
  result: AnalysisResult;
}

export function DownloadPDFButton({ result }: DownloadPDFButtonProps) {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const reportEl = reportRef.current;
      if (!reportEl) return;

      reportEl.classList.remove('hidden');
      const canvas = await html2canvas.default(reportEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      reportEl.classList.add('hidden');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`TruthScope-Report-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  const getVerdictLabel = (v: string) => {
    const map: Record<string, string> = {
      real: 'Likely Real',
      likely_real: 'Likely Real',
      uncertain: 'Uncertain',
      likely_fake: 'Likely Fake',
      fake: 'Likely Fake',
    };
    return map[v] || v;
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={generating}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF Report
          </>
        )}
      </button>

      <div ref={reportRef} className="hidden">
        <div className="p-8 max-w-3xl mx-auto bg-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>TruthScope Report</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
              Generated: {new Date(result.analyzedAt).toLocaleString()}
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Overall Credibility Score</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#111827' }}>{result.overallScore}/100</div>
            <div style={{ fontSize: 16, color: '#6b7280', marginTop: 4 }}>{getVerdictLabel(result.verdict)}</div>
          </div>

          {result.signals.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Signal Analysis</h2>
              {result.signals.map((s, i) => (
                <div key={i} style={{ marginBottom: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: '#374151' }}>{s.name}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: s.score >= 60 ? '#16a34a' : '#d97706' }}>{Math.round(s.score)}%</span>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, marginBottom: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.score}%`, background: s.score >= 60 ? '#22c55e' : '#f59e0b', borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{s.details}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Analyzed Text</h2>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {result.originalText.length > 2000
                ? result.originalText.slice(0, 2000) + '...'
                : result.originalText}
            </p>
          </div>

          {result.suspiciousSpans.length > 0 && (
            <div style={{ marginTop: 24, padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>
                {result.suspiciousSpans.length} Suspicious Pattern{result.suspiciousSpans.length > 1 ? 's' : ''} Detected
              </h3>
              {result.suspiciousSpans.slice(0, 10).map((span, i) => (
                <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 4 }}>
                  <strong>"{span.text.slice(0, 60)}"</strong> — {span.reason}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
            Generated by TruthScope — All analysis performed locally in-browser.
            This is a screening tool, not a definitive truth oracle.
          </div>
        </div>
      </div>
    </>
  );
}
