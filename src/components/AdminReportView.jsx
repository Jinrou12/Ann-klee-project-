import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Upload,
  Edit3,
  Check,
  X,
  RotateCcw,
  BookOpen,
  Award,
  AlertTriangle,
  Compass,
  CheckCircle2
} from 'lucide-react';
import OfficialAdminReportDocument from './OfficialAdminReportDocument';
import A4SheetScaler from './A4SheetScaler';
import {
  buildAdminReportDisplayModel,
  synthesizeMultiMonthAdminReport,
  importAdminReportFile
} from '../utils/adminReportBuilder';
import { exportElementToPdf } from '../utils/pdfExporter';
import { exportAdminReportToWord } from '../utils/wordExporter';
import { exportAdminReportToExcel } from '../utils/excelExporter';
import { toKhmerDigits } from '../utils/khmerNumerals';

export default function AdminReportView({
  currentMonthKey = '2026-07',
  activeYear = '2026',
  adminReports = {},
  metadata = {},
  useKhmerNumerals = true,
  isMobile = false,
  mobilePreviewA4 = false,
  onUpdateAdminReport,
  onResetSynthesizedReport
}) {
  const [periodType, setPeriodType] = useState('month'); // 'month' | 'sem1' | 'sem2' | 'year'
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const fileInputRef = useRef(null);

  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));

  const displayModel = useMemo(
    () =>
      buildAdminReportDisplayModel({
        periodType,
        monthKey: currentMonthKey,
        year: activeYear,
        adminReports,
        useKhmerNumerals
      }),
    [periodType, currentMonthKey, activeYear, adminReports, useKhmerNumerals]
  );

  const hasCustomMultiMonthOverride =
    periodType !== 'month' && Boolean(adminReports && adminReports[displayModel.storageKey]);

  const handleOpenEditor = () => {
    const raw = displayModel.rawReport || {};
    const st = displayModel.studentStats || {};
    const ad = displayModel.adminDocs || {};
    setEditDraft({
      docNumber: displayModel.docNumber || '......................',
      recipientTitle: displayModel.recipientTitle || '',
      customSubjectText: raw.customSubjectText || displayModel.subjectText || '',
      totalStudents: st.totalStudents ?? 81,
      gradeKindergarten: st.gradeKindergarten ?? 15,
      grade1: st.grade1 ?? 15,
      grade2: st.grade2 ?? 30,
      grade3: st.grade3 ?? 21,
      outgoingLetters: ad.outgoingLetters ?? 1,
      incomingLetters: ad.incomingLetters ?? 0,
      schoolMinutes: ad.schoolMinutes ?? 1,
      schoolReportsToMinistry: ad.schoolReportsToMinistry ?? 0,
      ministryMeetings: ad.ministryMeetings ?? 0,
      activitiesText: (displayModel.activities || []).join('\n'),
      appendixText: (displayModel.appendixItems || []).join('\n'),
      challengesText: (displayModel.challenges || []).join('\n'),
      solutionsText: (displayModel.solutions || []).join('\n'),
      requestsText: (displayModel.requests || []).join('\n'),
      directionsText: (displayModel.directions || []).join('\n'),
      conclusionText: displayModel.conclusionText || '',
      lunarDateLine: displayModel.lunarDateLine || '',
      solarDateLine: displayModel.solarDateLine || '',
      signerTitle: displayModel.signerTitle || 'ព្រះនាយក'
    });
    setIsEditing(true);
  };

  const handleSaveEditor = (e) => {
    e.preventDefault();
    if (!editDraft || !onUpdateAdminReport) return;

    const splitClean = (txt) =>
      String(txt || '')
        .split('\n')
        .map(s => s.replace(/^[-•❖▪◦\d+.)]+\s*/, '').trim())
        .filter(Boolean);

    const updatedReport = {
      ...displayModel.rawReport,
      id: `admin-${displayModel.storageKey}`,
      periodType,
      monthKey: periodType === 'month' ? currentMonthKey : undefined,
      year: activeYear,
      docNumber: String(editDraft.docNumber || '').trim() || '......................',
      recipientTitle: String(editDraft.recipientTitle || '').trim(),
      customSubjectText: String(editDraft.customSubjectText || '').trim(),
      studentStats: {
        ...(displayModel.studentStats || {}),
        classCount: 4,
        totalStudents: Number(editDraft.totalStudents) || 0,
        gradeKindergarten: Number(editDraft.gradeKindergarten) || 0,
        grade1: Number(editDraft.grade1) || 0,
        grade2: Number(editDraft.grade2) || 0,
        grade3: Number(editDraft.grade3) || 0
      },
      adminDocs: {
        outgoingLetters: Number(editDraft.outgoingLetters) || 0,
        incomingLetters: Number(editDraft.incomingLetters) || 0,
        schoolMinutes: Number(editDraft.schoolMinutes) || 0,
        schoolReportsToMinistry: Number(editDraft.schoolReportsToMinistry) || 0,
        ministryMeetings: Number(editDraft.ministryMeetings) || 0
      },
      activities: splitClean(editDraft.activitiesText),
      appendixItems: splitClean(editDraft.appendixText),
      challenges: splitClean(editDraft.challengesText),
      solutions: splitClean(editDraft.solutionsText),
      requests: splitClean(editDraft.requestsText),
      directions: splitClean(editDraft.directionsText),
      conclusionText: String(editDraft.conclusionText || '').trim(),
      lunarDateLine: String(editDraft.lunarDateLine || '').trim(),
      solarDateLine: String(editDraft.solarDateLine || '').trim(),
      signerTitle: String(editDraft.signerTitle || 'ព្រះនាយក').trim()
    };

    onUpdateAdminReport(displayModel.storageKey, updatedReport);
    setIsEditing(false);
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const targetId = isMobile
        ? '#printable-admin-report-mobile-hidden'
        : '#printable-admin-report-document';
      await exportElementToPdf(targetId, `របាយការណ៍_${displayModel.shortFileNameTag}.pdf`);
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយក PDF: ' + (err?.message || err));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      await exportAdminReportToWord(displayModel, metadata);
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយក Word: ' + (err?.message || err));
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await exportAdminReportToExcel(displayModel, metadata);
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយក Excel: ' + (err?.message || err));
    }
  };

  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const parsedReport = await importAdminReportFile(file, displayModel.rawReport);
      if (onUpdateAdminReport) {
        onUpdateAdminReport(displayModel.storageKey, {
          ...parsedReport,
          id: `admin-${displayModel.storageKey}`,
          periodType
        });
      }
      alert(`បានបញ្ចូលទិន្នន័យពីឯកសារ "${file.name}" ចូលទៅក្នុងរបាយការណ៍${displayModel.periodTitlePhrase} ដោយជោគជ័យ!`);
    } catch (err) {
      alert('មិនអាចអានឯកសារនេះបានទេ៖ ' + (err?.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetToAutoSynthesis = () => {
    if (periodType === 'month') return;
    if (onResetSynthesizedReport) {
      onResetSynthesizedReport(displayModel.storageKey);
    } else if (onUpdateAdminReport) {
      const fresh = synthesizeMultiMonthAdminReport({
        periodType,
        year: activeYear,
        adminReports
      });
      onUpdateAdminReport(displayModel.storageKey, fresh);
    }
  };

  const periodTabs = [
    { id: 'month', label: 'ប្រចាំខែ', sub: displayModel.inPeriodPhrase.replace(/^ក្នុង/, '') },
    { id: 'sem1', label: 'ឆមាសទី ១', sub: 'ឧសភា - កញ្ញា' },
    { id: 'sem2', label: 'ឆមាសទី ២', sub: 'តុលា - កុម្ភៈ' },
    { id: 'year', label: 'ប្រចាំឆ្នាំ', sub: `ឆ្នាំ ${fmtNum(activeYear)}` }
  ];

  return (
    <div className="admin-report-workspace" style={{ paddingBottom: isMobile ? 90 : 32 }}>
      {/* Hidden File Input for Word (.docx) & Excel (.xlsx) Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.xlsx,.xls"
        onChange={handleFileImportChange}
        style={{ display: 'none' }}
      />

      {/* ================================================================== */}
      {/* TOP CONTROL BAR: Period Selector (ខែ / ឆមាសទី១ / ឆមាសទី២ / ឆ្នាំ) +  */}
      {/* Side-by-Side Download & Import Buttons                             */}
      {/* ================================================================== */}
      <div
        className="no-print"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: isMobile ? '12px' : '16px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
        }}
      >
        {/* Row 1: Period Scope Selector Pills (Single 4-Column Row on both Mobile & PC) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: isMobile ? 5 : 10,
            marginBottom: isMobile ? 10 : 14
          }}
        >
          {periodTabs.map(tab => {
            const active = periodType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setPeriodType(tab.id);
                  setIsEditing(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '7px 3px' : '10px 12px',
                  borderRadius: isMobile ? 8 : 10,
                  border: active ? '2px solid #b45309' : '1px solid #cbd5e1',
                  background: active
                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                    : '#f8fafc',
                  color: active ? '#78350f' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: active ? '0 2px 6px rgba(180, 83, 9, 0.15)' : 'none',
                  minWidth: 0
                }}
              >
                <span
                  style={{
                    fontSize: isMobile ? 11.5 : 14,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3
                  }}
                >
                  {tab.label}
                </span>
                <span
                  style={{
                    fontSize: isMobile ? 9.5 : 11,
                    color: active ? '#b45309' : '#64748b',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.25
                  }}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Smart Synthesis Notice Banner when viewing Semester 1, Semester 2, or Annual */}
        {periodType !== 'month' && (
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 10,
              padding: '8px 12px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 12.5,
              color: '#0369a1'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>
                <strong>ប្រព័ន្ធសំយោគស្វ័យប្រវត្តិ ({displayModel.periodTitlePhrase})៖</strong>{' '}
                បានរៀបចំ និងច្រោះបន្ទាត់ស្ទួនត្រង់ <strong>III.វឌ្ឍនភាព, IV.បញ្ហាប្រឈម, V.ទិសដៅ និង VI.សេចក្ដីសន្និដ្ឋាន</strong> ឱ្យត្រូវតាមបទដ្ឋានរដ្ឋបាល។
              </span>
            </div>
            {hasCustomMultiMonthOverride && (
              <button
                type="button"
                onClick={handleResetToAutoSynthesis}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#ffffff',
                  border: '1px solid #0284c7',
                  color: '#0284c7',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={13} />
                <span>បូកសរុបស្វ័យប្រវត្តិឡើងវិញ</span>
              </button>
            )}
          </div>
        )}

        {/* Row 2: Side-by-Side Action Buttons */}
        {isMobile ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8
            }}
          >
            <button
              type="button"
              onClick={() => (isEditing ? setIsEditing(false) : handleOpenEditor())}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: isEditing ? '#0f172a' : '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: isEditing ? '#ffffff' : '#1e293b',
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <Edit3 size={15} />
              <span>{isEditing ? 'បិទផ្ទាំងកែប្រែ' : 'កែប្រែអត្ថបទ'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isExportingPdf ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(185, 28, 28, 0.28)',
                width: '100%'
              }}
            >
              <FileText size={15} />
              <span>{isExportingPdf ? 'កំពុងផលិត PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            {/* Left group: Edit button & Import Word/Excel button side-by-side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => (isEditing ? setIsEditing(false) : handleOpenEditor())}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isEditing ? '#0f172a' : '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: isEditing ? '#ffffff' : '#1e293b',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={15} />
                <span>{isEditing ? 'បិទផ្ទាំងកែប្រែ' : 'កែប្រែអត្ថបទ'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerImport}
                disabled={isImporting}
                title="បញ្ចូលឯកសាររបាយការណ៍ប្រភេទ Word (.docx) ឬ Excel (.xlsx)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isImporting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Upload size={15} />
                <span>{isImporting ? 'កំពុងអាន...' : 'Import Word / Excel'}</span>
              </button>
            </div>

            {/* Right group: Download buttons (PC: Excel + Word + PDF) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleDownloadExcel}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#15803d',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(21, 128, 61, 0.22)'
                }}
              >
                <FileSpreadsheet size={16} />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#1d4ed8',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(29, 78, 216, 0.22)'
                }}
              >
                <FileText size={16} />
                <span>Download Word</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 15px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isExportingPdf ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(185, 28, 28, 0.28)'
                }}
              >
                <FileText size={15} />
                <span>{isExportingPdf ? 'កំពុងផលិត PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* INLINE EDITOR PANEL (When user clicks "កែប្រែអត្ថបទ")               */}
      {/* ================================================================== */}
      {isEditing && editDraft && (
        <form
          onSubmit={handleSaveEditor}
          className="no-print"
          style={{
            background: '#ffffff',
            border: '2px solid #f59e0b',
            borderRadius: 14,
            padding: isMobile ? 14 : 20,
            marginBottom: 18,
            boxShadow: '0 6px 20px rgba(180, 83, 9, 0.12)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: '1px solid #fde68a'
            }}
          >
            <h3 className="font-moul" style={{ margin: 0, fontSize: 15, color: '#92400e' }}>
              កែសម្រួលរបាយការណ៍រដ្ឋបាល ({displayModel.periodTitlePhrase})
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Check size={15} />
                <span>រក្សាទុក</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
                <span>បោះបង់</span>
              </button>
            </div>
          </div>

          {/* Grid for Student Counts & Admin Doc Counts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: 10,
              marginBottom: 14,
              background: '#f8fafc',
              padding: 12,
              borderRadius: 10,
              border: '1px solid #e2e8f0'
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                សមណសិស្សសរុប
              </label>
              <input
                type="number"
                value={editDraft.totalStudents}
                onChange={e => setEditDraft({ ...editDraft, totalStudents: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                ថ្នាក់មត្តេយ្យ
              </label>
              <input
                type="number"
                value={editDraft.gradeKindergarten}
                onChange={e => setEditDraft({ ...editDraft, gradeKindergarten: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                ថ្នាក់ទី១
              </label>
              <input
                type="number"
                value={editDraft.grade1}
                onChange={e => setEditDraft({ ...editDraft, grade1: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                ថ្នាក់ទី២
              </label>
              <input
                type="number"
                value={editDraft.grade2}
                onChange={e => setEditDraft({ ...editDraft, grade2: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                ថ្នាក់ទី៣
              </label>
              <input
                type="number"
                value={editDraft.grade3}
                onChange={e => setEditDraft({ ...editDraft, grade3: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                លិខិតចេញ (ច្បាប់)
              </label>
              <input
                type="number"
                value={editDraft.outgoingLetters}
                onChange={e => setEditDraft({ ...editDraft, outgoingLetters: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                លិខិតចូល (ច្បាប់)
              </label>
              <input
                type="number"
                value={editDraft.incomingLetters}
                onChange={e => setEditDraft({ ...editDraft, incomingLetters: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                កំណត់ហេតុប្រជុំ (ច្បាប់)
              </label>
              <input
                type="number"
                value={editDraft.schoolMinutes}
                onChange={e => setEditDraft({ ...editDraft, schoolMinutes: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                របាយការណ៍ទៅមន្ទីរ
              </label>
              <input
                type="number"
                value={editDraft.schoolReportsToMinistry}
                onChange={e => setEditDraft({ ...editDraft, schoolReportsToMinistry: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                ប្រជុំក្នុងមន្ទីរ (លើក)
              </label>
              <input
                type="number"
                value={editDraft.ministryMeetings}
                onChange={e => setEditDraft({ ...editDraft, ministryMeetings: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {/* Textareas for Sections III, IV, V, VI */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                III. ក. សកម្មភាពការងារ (១ បន្ទាត់ = ១ ចំណុច)
              </label>
              <textarea
                rows={6}
                value={editDraft.activitiesText}
                onChange={e => setEditDraft({ ...editDraft, activitiesText: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                IV. ១-បញ្ហាប្រឈម (១ បន្ទាត់ = ១ ចំណុច)
              </label>
              <textarea
                rows={6}
                value={editDraft.challengesText}
                onChange={e => setEditDraft({ ...editDraft, challengesText: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                IV. ២-ដំណោះស្រាយ (១ បន្ទាត់ = ១ ចំណុច)
              </label>
              <textarea
                rows={5}
                value={editDraft.solutionsText}
                onChange={e => setEditDraft({ ...editDraft, solutionsText: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                IV. ៣-សំណូមពរ (១ បន្ទាត់ = ១ ចំណុច)
              </label>
              <textarea
                rows={5}
                value={editDraft.requestsText}
                onChange={e => setEditDraft({ ...editDraft, requestsText: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                V. ទិសដៅបន្ត (១ បន្ទាត់ = ១ ចំណុច)
              </label>
              <textarea
                rows={5}
                value={editDraft.directionsText}
                onChange={e => setEditDraft({ ...editDraft, directionsText: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                VI. សេចក្ដីសន្និដ្ឋាន
              </label>
              <textarea
                rows={5}
                value={editDraft.conclusionText}
                onChange={e => setEditDraft({ ...editDraft, conclusionText: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Dates & Signer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 180px',
              gap: 10,
              marginTop: 12
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                កាលបរិច្ឆេទចន្ទគតិ
              </label>
              <input
                type="text"
                value={editDraft.lunarDateLine}
                onChange={e => setEditDraft({ ...editDraft, lunarDateLine: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                កាលបរិច្ឆេទសុរិយគតិ
              </label>
              <input
                type="text"
                value={editDraft.solarDateLine}
                onChange={e => setEditDraft({ ...editDraft, solarDateLine: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                តួនាទីចុះហត្ថលេខា
              </label>
              <input
                type="text"
                value={editDraft.signerTitle}
                onChange={e => setEditDraft({ ...editDraft, signerTitle: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </form>
      )}

      {/* ================================================================== */}
      {/* VIEW RENDERER:                                                     */}
      {/* - PC -> Official A4 Document inside .paper-sheet-wrapper           */}
      {/* - Mobile with A4 Preview toggled ON -> Auto-Scaled A4SheetScaler   */}
      {/* - Mobile Card Mode -> Clean Mobile Cards                           */}
      {/* ================================================================== */}
      {!isMobile ? (
        <div
          className="paper-sheet-wrapper"
          style={{
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'visible'
          }}
        >
          <div style={{ margin: '0 auto' }}>
            <OfficialAdminReportDocument
              id="printable-admin-report-document"
              displayModel={displayModel}
              useKhmerNumerals={useKhmerNumerals}
            />
          </div>
        </div>
      ) : mobilePreviewA4 ? (
        <A4SheetScaler>
          <OfficialAdminReportDocument
            id="printable-admin-report-document"
            displayModel={displayModel}
            useKhmerNumerals={useKhmerNumerals}
          />
        </A4SheetScaler>
      ) : (
        <>
          {/* Mobile Structured Card View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Card 0: Subject & Header Summary */}
            <div
              style={{
                background: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
                color: '#ffffff',
                borderRadius: 14,
                padding: 14,
                boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <img
                  src="/logo.png?v=nobg1"
                  alt="Logo"
                  style={{
                    width: 42,
                    height: 42,
                    objectFit: 'contain',
                    background: '#ffffff',
                    borderRadius: '50%',
                    padding: 2,
                    flexShrink: 0
                  }}
                />
                <div style={{ lineHeight: 1.45 }}>
                  <div className="font-moul" style={{ fontSize: 12 }}>
                    សាលាអនុគណក្រុងកំពង់ចាម
                  </div>
                  <div className="font-moul" style={{ fontSize: 12 }}>
                    ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.9, marginBottom: 4 }}>
                គោរពប្រគេន៖ {displayModel.recipientTitle}
              </div>
              <div className="font-moul" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 6 }}>
                របាយការណ៍បូកសរុបលទ្ធផលការងារ{displayModel.periodTitlePhrase}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.95, lineHeight: 1.5 }}>
                {displayModel.subjectText}
              </div>
            </div>

            {/* Card I & II: គណៈគ្រប់គ្រង និងស្ថិតិសមណសិស្ស */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14
              }}
            >
              <div
                className="font-moul"
                style={{ fontSize: 13, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <BookOpen size={16} />
                <span>I & II. គណៈគ្រប់គ្រង និងស្ថិតិសមណសិស្ស</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8 }}>
                {(displayModel.managementRoles || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <strong>{fmtNum(i + 1)}. {m.name}</strong> — {m.role}
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12.5,
                  color: '#78350f'
                }}
              >
                {(displayModel.studentStatLines || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 3 }}>❖ {line}</div>
                ))}
              </div>
            </div>

            {/* Card III: វឌ្ឍនភាពការងារ */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14
              }}
            >
              <div
                className="font-moul"
                style={{ fontSize: 13, color: '#0369a1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Award size={16} />
                <span>{displayModel.section3Heading}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginBottom: 6 }}>
                {displayModel.section3SubAHeading}
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 10, lineHeight: 1.6 }}>
                {(displayModel.activities || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>• {line}</div>
                ))}
              </div>

              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginBottom: 6 }}>
                ខ. ការងារគ្រប់គ្រង លិខិតរដ្ឋបាល និងរបាយការណ៍
              </div>
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12.5,
                  color: '#0c4a6e'
                }}
              >
                {(displayModel.adminDocLines || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 3 }}>• {line}</div>
                ))}
              </div>
            </div>

            {/* Card IV: បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14
              }}
            >
              <div
                className="font-moul"
                style={{ fontSize: 13, color: '#b91c1c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <AlertTriangle size={16} />
                <span>IV. បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ</span>
              </div>

              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#991b1b', marginBottom: 4 }}>
                ១-បញ្ហាប្រឈម
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, lineHeight: 1.6 }}>
                {(displayModel.challenges || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>• {line}</div>
                ))}
              </div>

              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#15803d', marginBottom: 4 }}>
                ២-ដំណោះស្រាយ
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, lineHeight: 1.6 }}>
                {(displayModel.solutions || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>• {line}</div>
                ))}
              </div>

              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#b45309', marginBottom: 4 }}>
                ៣-សំណូមពរ
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                {(displayModel.requests || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>• {line}</div>
                ))}
              </div>
            </div>

            {/* Card V & VI: ទិសដៅបន្ត និងសេចក្ដីសន្និដ្ឋាន */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14
              }}
            >
              <div
                className="font-moul"
                style={{ fontSize: 13, color: '#15803d', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Compass size={16} />
                <span>V. ទិសដៅបន្ត</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 12, lineHeight: 1.6 }}>
                {(displayModel.directions || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>• {line}</div>
                ))}
              </div>

              <div className="font-moul" style={{ fontSize: 13, color: '#78350f', marginBottom: 6 }}>
                VI. សន្និដ្ឋាន
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, marginBottom: 8 }}>
                {displayModel.conclusionText}
              </div>
              <div
                style={{
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: 8,
                  textAlign: 'right',
                  fontSize: 12,
                  color: '#475569'
                }}
              >
                <div>{displayModel.lunarDateLine}</div>
                <div>{displayModel.solarDateLine}</div>
                <div className="font-moul" style={{ marginTop: 4, color: '#0f172a' }}>
                  {displayModel.signerTitle}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Off-screen Unscaled A4 Document for Mobile High-Res PDF Generation */}
      {isMobile && (
        <div
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '794px',
            zIndex: -1,
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        >
          <OfficialAdminReportDocument
            id="printable-admin-report-mobile-hidden"
            displayModel={displayModel}
            useKhmerNumerals={useKhmerNumerals}
          />
        </div>
      )}
    </div>
  );
}
