import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import OfficialMinistryReportDocument from './OfficialMinistryReportDocument';
import OfficialMinistrySummaryDocument from './OfficialMinistrySummaryDocument';
import A4SheetScaler from './A4SheetScaler';
import TelegramSendMenu from './TelegramSendMenu';
import {
  buildAdminReportDisplayModel,
  synthesizeMultiMonthAdminReport,
  importAdminReportFile,
  syncMonthlyDropoutChallengeLine
} from '../utils/adminReportBuilder';
import {
  buildMinistryReportModel,
  MINISTRY_SEM1_MONTHS,
  MINISTRY_SEM2_MONTHS
} from '../utils/ministryReportBuilder';
import { exportElementToPdf } from '../utils/pdfExporter';
import {
  exportAdminReportToWord,
  exportMinistryReportToWord,
  exportMinistrySummaryToWord
} from '../utils/wordExporter';
import {
  exportAdminReportToExcel,
  exportMinistryReportToExcel,
  exportMinistrySummaryToExcel
} from '../utils/excelExporter';
import { toKhmerDigits } from '../utils/khmerNumerals';

/**
 * HangingBulletEditor: Renders each bullet item (❖ or -) with a true hanging indent
 * matching the A4 document layout so wrapped 2nd/3rd lines align cleanly under the text,
 * never flush-left under the bullet symbol.
 */
function HangingBulletEditor({ value = '', onChange, bullet = '-', rows = 5 }) {
  const rowRefs = useRef([]);
  const [isFocused, setIsFocused] = useState(false);

  const items = useMemo(() => {
    const raw = String(value ?? '');
    if (!raw.trim()) return [''];
    return raw
      .split('\n')
      .map(line => line.replace(/^[-•❖▪◦]+\s*/, ''));
  }, [value]);

  const commitItems = (nextItems) => {
    const safeItems = nextItems.length > 0 ? nextItems : [''];
    const serialized = safeItems.map(line => `${bullet} ${line}`).join('\n');
    if (onChange) onChange(serialized);
  };

  useEffect(() => {
    rowRefs.current.forEach(el => {
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.max(23, el.scrollHeight)}px`;
      }
    });
  }, [items]);

  const focusRowAt = (targetIdx, cursorPos = null) => {
    requestAnimationFrame(() => {
      const el = rowRefs.current[targetIdx];
      if (el) {
        el.focus();
        const pos = cursorPos !== null ? cursorPos : el.value.length;
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          // ignore
        }
      }
    });
  };

  const handleRowChange = (idx, rawText, targetEl) => {
    if (targetEl) {
      targetEl.style.height = 'auto';
      targetEl.style.height = `${Math.max(23, targetEl.scrollHeight)}px`;
    }
    if (rawText.includes('\n')) {
      const pastedLines = rawText
        .split('\n')
        .map(l => l.replace(/^[-•❖▪◦]+\s*/, ''));
      const next = [...items];
      next.splice(idx, 1, ...pastedLines);
      commitItems(next);
      focusRowAt(idx + pastedLines.length - 1);
      return;
    }
    const next = [...items];
    next[idx] = rawText;
    commitItems(next);
  };

  const handleRowKeyDown = (e, idx) => {
    if (e.nativeEvent?.isComposing) return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const curText = items[idx] ?? '';

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const before = curText.slice(0, start);
      const after = curText.slice(end).replace(/^[-•❖▪◦]+\s*/, '');
      const next = [...items];
      next.splice(idx, 1, before, after);
      commitItems(next);
      focusRowAt(idx + 1, 0);
      return;
    }

    if (e.key === 'Backspace' && start === 0 && end === 0) {
      if (idx > 0) {
        e.preventDefault();
        const prevText = items[idx - 1] ?? '';
        const joinPos = prevText.length;
        const merged = prevText + curText;
        const next = [...items];
        next.splice(idx - 1, 2, merged);
        commitItems(next);
        focusRowAt(idx - 1, joinPos);
      } else if (idx === 0 && items.length > 1 && !curText.trim()) {
        e.preventDefault();
        const next = items.slice(1);
        commitItems(next);
        focusRowAt(0, 0);
      }
      return;
    }

    if (e.key === 'ArrowUp' && idx > 0 && start === 0) {
      e.preventDefault();
      focusRowAt(idx - 1);
      return;
    }

    if (e.key === 'ArrowDown' && idx < items.length - 1 && start === curText.length) {
      e.preventDefault();
      focusRowAt(idx + 1, 0);
    }
  };

  const minHeightPx = Math.max(115, rows * 25 + 16);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          focusRowAt(items.length - 1);
        }
      }}
      style={{
        width: '100%',
        minHeight: minHeightPx,
        maxHeight: 280,
        overflowY: 'auto',
        padding: '8px 10px',
        borderRadius: 8,
        border: isFocused ? '1.5px solid #d97706' : '1px solid #cbd5e1',
        background: '#ffffff',
        boxSizing: 'border-box',
        cursor: 'text',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}
    >
      {items.map((lineText, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            width: '100%'
          }}
        >
          <span
            style={{
              width: bullet === '❖' ? 16 : 12,
              flexShrink: 0,
              fontSize: 13,
              lineHeight: '23px',
              color: '#0f172a',
              userSelect: 'none'
            }}
          >
            {bullet}
          </span>
          <textarea
            ref={el => {
              rowRefs.current[idx] = el;
            }}
            rows={1}
            value={lineText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={e => handleRowChange(idx, e.target.value, e.currentTarget)}
            onKeyDown={e => handleRowKeyDown(e, idx)}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              fontSize: 13,
              lineHeight: '23px',
              color: '#0f172a',
              fontFamily: 'inherit',
              overflow: 'hidden'
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminReportView({
  currentMonthKey = '2026-07',
  activeYear = '2026',
  adminReports = {},
  studentMaster = [],
  allFinance = {},
  metadata = {},
  useKhmerNumerals = true,
  isMobile = false,
  mobilePreviewA4 = false,
  canEdit: canEditMonth = true,
  canEditSummary,
  canDownloadPdf = true,
  canExportOffice = true,
  onUpdateAdminReport,
  onResetSynthesizedReport
}) {
  const [periodType, setPeriodType] = useState('month'); // 'month' | 'sem1' | 'sem2' | 'year'
  const [annualTemplate, setAnnualTemplate] = useState('anukon'); // 'anukon' | 'ministry'
  const [ministryDocType, setMinistryDocType] = useState('full'); // 'full' | 'summary'
  const isMinistryActive = periodType === 'year' && annualTemplate === 'ministry';
  const canEdit = periodType === 'month' ? canEditMonth : (canEditSummary ?? canEditMonth);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [ministryEditDraft, setMinistryEditDraft] = useState(null);
  const fileInputRef = useRef(null);

  // Close inline editor automatically whenever user switches month or year in top bar
  useEffect(() => {
    setIsEditing(false);
  }, [currentMonthKey, activeYear]);

  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));

  const displayModel = useMemo(
    () =>
      buildAdminReportDisplayModel({
        periodType,
        monthKey: currentMonthKey,
        year: activeYear,
        adminReports,
        studentMaster,
        useKhmerNumerals
      }),
    [periodType, currentMonthKey, activeYear, adminReports, studentMaster, useKhmerNumerals]
  );

  const ministryModel = useMemo(
    () =>
      buildMinistryReportModel({
        year: activeYear,
        adminReports,
        studentMaster,
        allFinance,
        useKhmerNumerals
      }),
    [activeYear, adminReports, studentMaster, allFinance, useKhmerNumerals]
  );

  const hasCustomMultiMonthOverride = isMinistryActive
    ? Boolean(adminReports && adminReports[ministryModel.storageKey])
    : periodType !== 'month' && Boolean(adminReports && adminReports[displayModel.storageKey]);

  const formatLinesWithBullet = (items = [], bullet = '❖') =>
    (items || [])
      .map(s => String(s || '').replace(/^[-•❖▪◦\s]+/, '').trim())
      .filter(Boolean)
      .map(s => `${bullet} ${s}`)
      .join('\n');

  // Keep open editDraft challengesText synchronized with dropout calculation (including during live HMR)
  useEffect(() => {
    if (!isEditing || periodType !== 'month') return;
    setEditDraft(prev => {
      if (!prev) return prev;
      const sumGrades =
        (Number(prev.gradeKindergarten) || 0) +
        (Number(prev.grade1) || 0) +
        (Number(prev.grade2) || 0) +
        (Number(prev.grade3) || 0);
      const effectiveTotal = sumGrades > 0 ? sumGrades : (Number(prev.totalStudents) || 0);
      const currentChallengeLines = String(prev.challengesText || '')
        .split('\n')
        .map(s => s.replace(/^[-•❖▪◦\s]+/, '').trim())
        .filter(Boolean);
      const nextChallenges = syncMonthlyDropoutChallengeLine({
        monthKey: currentMonthKey,
        prevTotal: displayModel.prevMonthTotalStudents,
        currTotal: effectiveTotal,
        challenges: currentChallengeLines,
        useKhmerNumerals
      });
      const nextChallengesText = formatLinesWithBullet(nextChallenges, '-');
      if (nextChallengesText === prev.challengesText && Number(prev.totalStudents) === effectiveTotal) {
        return prev;
      }
      return {
        ...prev,
        totalStudents: effectiveTotal,
        challengesText: nextChallengesText
      };
    });
  }, [isEditing, periodType, currentMonthKey, displayModel.prevMonthTotalStudents, useKhmerNumerals]);

  const handleOpenEditor = () => {
    if (isMinistryActive) {
      const st = ministryModel.stats || {};
      const hourlyMap = {};
      [...MINISTRY_SEM1_MONTHS, ...MINISTRY_SEM2_MONTHS].forEach(m => {
        const raw = st.hourlyIncomeByMonth?.[m.num];
        hourlyMap[m.num] = raw !== undefined && raw !== null ? String(raw) : '';
      });
      setMinistryEditDraft({
        docNumber: ministryModel.docNumber || '.....................................',
        lunarDateLine: ministryModel.lunarDateLine || '',
        solarDateLine: ministryModel.solarDateLine || '',
        signerTitle: ministryModel.signerTitle || 'ព្រះនាយក',
        reporterTitle: ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍',
        appliedStudents: st.appliedStudents ?? 101,
        permanentStudents: st.permanentStudents ?? 101,
        oldStudents: st.oldStudents ?? 66,
        newStudents: st.newStudents ?? 35,
        dropoutStudents: st.dropoutStudents ?? 20,
        remainingStudents: st.remainingStudents ?? 81,
        remainingGrade3: st.remainingGrade3 ?? 21,
        offCampusStudents: st.offCampusStudents ?? 8,
        teacherTotal: st.teacherTotal ?? 10,
        teacherFramework: st.teacherFramework ?? 2,
        teacherContract: st.teacherContract ?? 2,
        teacherHourly: st.teacherHourly ?? 6,
        paliExamTotal: st.paliExamTotal ?? 21,
        paliExamPassed: st.paliExamPassed ?? 21,
        paliExamFailed: st.paliExamFailed ?? 0,
        dhammaExamTotal: st.dhammaExamTotal ?? 66,
        dhammaExamTri: st.dhammaExamTri ?? 15,
        dhammaExamTo: st.dhammaExamTo ?? 30,
        dhammaExamEk: st.dhammaExamEk ?? 21,
        dhammaExamNote: st.dhammaExamNote ?? 'មិនទាន់ប្រឡង',
        computerCountText: st.computerCountText ?? '១០គ្រឿង',
        computerNoteText: st.computerNoteText ?? 'ប្រើប្រាស់បាន៨គ្រឿងខូច២គ្រឿង',
        awardCeremonyIncome1: st.awardCeremonyIncome1 ?? 0,
        awardCeremonyIncome2: st.awardCeremonyIncome2 ?? 0,
        awardCeremonyExpense: st.awardCeremonyExpense ?? 0,
        hourlyIncomeByMonth: hourlyMap,
        teacherActivitiesText: formatLinesWithBullet(ministryModel.teacherActivities, '-'),
        studentActivitiesText: formatLinesWithBullet(ministryModel.studentActivities, '-'),
        outsideActivitiesText: formatLinesWithBullet(ministryModel.outsideActivities, '-'),
        abbotResponsibilitiesText: formatLinesWithBullet(ministryModel.abbotResponsibilities, '-'),
        managementActivitiesText: formatLinesWithBullet(ministryModel.managementActivities, '-'),
        libraryLinesText: formatLinesWithBullet(ministryModel.libraryLines, '-'),
        donationLinesText: formatLinesWithBullet(ministryModel.donationLines, '-'),
        teacherRelationsText: formatLinesWithBullet(ministryModel.teacherRelations, '-'),
        challengesText: formatLinesWithBullet(ministryModel.challenges, '-'),
        solutionsText: formatLinesWithBullet(ministryModel.solutions, '-'),
        conclusionParasText: (ministryModel.conclusionParas || []).join('\n\n'),
        requestsText: formatLinesWithBullet(ministryModel.requests, '-'),
        ccListText: formatLinesWithBullet(ministryModel.ccList, '-')
      });
      setIsEditing(true);
      return;
    }

    const raw = displayModel.rawReport || {};
    const st = displayModel.studentStats || {};
    const ad = displayModel.adminDocs || {};
    setEditDraft({
      docNumber: displayModel.docNumber || '......................',
      recipientTitle: displayModel.recipientTitle || '',
      customSubjectText: raw.customSubjectText || '',
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
      activitiesText: formatLinesWithBullet(displayModel.activities, '❖'),
      appendixText: formatLinesWithBullet(displayModel.appendixItems, '-'),
      challengesText: formatLinesWithBullet(displayModel.challenges, '-'),
      solutionsText: formatLinesWithBullet(displayModel.solutions, '-'),
      requestsText: formatLinesWithBullet(displayModel.requests, '-'),
      directionsText: formatLinesWithBullet(displayModel.directions, '-'),
      conclusionText: displayModel.conclusionText || '',
      lunarDateLine: displayModel.lunarDateLine || '',
      solarDateLine: displayModel.solarDateLine || '',
      signerTitle: displayModel.signerTitle || 'ព្រះនាយក'
    });
    setIsEditing(true);
  };

  const handleBulletFocus = (fieldKey, bullet = '❖') => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const currentVal = String(prev[fieldKey] ?? '');
      if (!currentVal.trim()) {
        return { ...prev, [fieldKey]: `${bullet} ` };
      }
      return prev;
    });
  };

  const handleBulletChange = (e, fieldKey, bullet = '❖') => {
    let nextVal = e.target.value;
    const prevVal = String(editDraft?.[fieldKey] ?? '');
    if (prevVal === '' && nextVal.length > 0 && !/^[-•❖▪◦]/.test(nextVal.trim())) {
      nextVal = `${bullet} ${nextVal}`;
    }
    setEditDraft(prev => ({ ...prev, [fieldKey]: nextVal }));
  };

  const handleBulletKeyDown = (e, fieldKey, bullet = '❖') => {
    if (e.key !== 'Enter' || e.nativeEvent?.isComposing) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const val = String(editDraft?.[fieldKey] ?? '');

    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = val.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
    const currentLine = val.slice(lineStart, lineEnd);

    const strippedCurrentLine = currentLine.replace(/^[-•❖▪◦\s]+/, '').trim();
    if (!strippedCurrentLine && currentLine.trim().length > 0) {
      const beforeLine = val.slice(0, lineStart);
      const afterLine = val.slice(lineEnd);
      const nextVal = beforeLine + afterLine.replace(/^\n/, '');
      const nextCursor = beforeLine.length;
      setEditDraft(prev => ({ ...prev, [fieldKey]: nextVal }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }

    const insertStr = `\n${bullet} `;
    const nextVal = val.slice(0, start) + insertStr + val.slice(end);
    const nextCursor = start + insertStr.length;
    setEditDraft(prev => ({ ...prev, [fieldKey]: nextVal }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleMinistryBulletFocus = (fieldKey, bullet = '-') => {
    setMinistryEditDraft(prev => {
      if (!prev) return prev;
      const currentVal = String(prev[fieldKey] ?? '');
      if (!currentVal.trim()) {
        return { ...prev, [fieldKey]: `${bullet} ` };
      }
      return prev;
    });
  };

  const handleMinistryBulletChange = (e, fieldKey, bullet = '-') => {
    let nextVal = e.target.value;
    const prevVal = String(ministryEditDraft?.[fieldKey] ?? '');
    if (prevVal === '' && nextVal.length > 0 && !/^[-•❖▪◦]/.test(nextVal.trim())) {
      nextVal = `${bullet} ${nextVal}`;
    }
    setMinistryEditDraft(prev => ({ ...prev, [fieldKey]: nextVal }));
  };

  const handleMinistryBulletKeyDown = (e, fieldKey, bullet = '-') => {
    if (e.key !== 'Enter' || e.nativeEvent?.isComposing) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const val = String(ministryEditDraft?.[fieldKey] ?? '');

    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = val.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
    const currentLine = val.slice(lineStart, lineEnd);

    const strippedCurrentLine = currentLine.replace(/^[-•❖▪◦\s]+/, '').trim();
    if (!strippedCurrentLine && currentLine.trim().length > 0) {
      const beforeLine = val.slice(0, lineStart);
      const afterLine = val.slice(lineEnd);
      const nextVal = beforeLine + afterLine.replace(/^\n/, '');
      const nextCursor = beforeLine.length;
      setMinistryEditDraft(prev => ({ ...prev, [fieldKey]: nextVal }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }

    const insertStr = `\n${bullet} `;
    const nextVal = val.slice(0, start) + insertStr + val.slice(end);
    const nextCursor = start + insertStr.length;
    setMinistryEditDraft(prev => ({ ...prev, [fieldKey]: nextVal }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleTotalStudentsChange = (rawVal) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      if (periodType !== 'month') {
        return { ...prev, totalStudents: rawVal };
      }
      const currentChallengeLines = String(prev.challengesText || '')
        .split('\n')
        .map(s => s.replace(/^[-•❖▪◦\s]+/, '').trim())
        .filter(Boolean);
      const nextChallenges = syncMonthlyDropoutChallengeLine({
        monthKey: currentMonthKey,
        prevTotal: displayModel.prevMonthTotalStudents,
        currTotal: Number(rawVal),
        challenges: currentChallengeLines,
        useKhmerNumerals
      });
      return {
        ...prev,
        totalStudents: rawVal,
        challengesText: formatLinesWithBullet(nextChallenges, '-')
      };
    });
  };

  const handleGradeCountChange = (gradeField, rawVal) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const nextDraft = { ...prev, [gradeField]: rawVal };
      const sumTotal =
        (Number(nextDraft.gradeKindergarten) || 0) +
        (Number(nextDraft.grade1) || 0) +
        (Number(nextDraft.grade2) || 0) +
        (Number(nextDraft.grade3) || 0);
      nextDraft.totalStudents = sumTotal;
      if (periodType === 'month') {
        const currentChallengeLines = String(prev.challengesText || '')
          .split('\n')
          .map(s => s.replace(/^[-•❖▪◦\s]+/, '').trim())
          .filter(Boolean);
        const nextChallenges = syncMonthlyDropoutChallengeLine({
          monthKey: currentMonthKey,
          prevTotal: displayModel.prevMonthTotalStudents,
          currTotal: sumTotal,
          challenges: currentChallengeLines,
          useKhmerNumerals
        });
        nextDraft.challengesText = formatLinesWithBullet(nextChallenges, '-');
      }
      return nextDraft;
    });
  };

  const handleSaveEditor = (e) => {
    e.preventDefault();
    if (!editDraft || !onUpdateAdminReport) return;

    const splitClean = (txt) =>
      String(txt || '')
        .split('\n')
        .map(s => s.replace(/^[-•❖▪◦\s]+/, '').trim())
        .filter(Boolean);

    const prevSt = displayModel.studentStats || {};
    const didManuallyChangeStudentStats =
      Number(editDraft.totalStudents) !== Number(prevSt.totalStudents) ||
      Number(editDraft.gradeKindergarten) !== Number(prevSt.gradeKindergarten) ||
      Number(editDraft.grade1) !== Number(prevSt.grade1) ||
      Number(editDraft.grade2) !== Number(prevSt.grade2) ||
      Number(editDraft.grade3) !== Number(prevSt.grade3);

    const cleanedChallenges = splitClean(editDraft.challengesText);
    const autoSyncedChallenges = periodType === 'month'
      ? syncMonthlyDropoutChallengeLine({
          monthKey: currentMonthKey,
          prevTotal: displayModel.prevMonthTotalStudents,
          currTotal: Number(editDraft.totalStudents) || 0,
          challenges: cleanedChallenges,
          useKhmerNumerals
        })
      : cleanedChallenges;
    const didUserCustomEditChallengeText =
      JSON.stringify(cleanedChallenges) !== JSON.stringify(autoSyncedChallenges);

    const updatedReport = {
      ...displayModel.rawReport,
      id: `admin-${displayModel.storageKey}`,
      periodType,
      monthKey: periodType === 'month' ? currentMonthKey : undefined,
      year: activeYear,
      docNumber: String(editDraft.docNumber || '').trim() || '......................',
      recipientTitle: String(editDraft.recipientTitle || '').trim(),
      customSubjectText: String(editDraft.customSubjectText || '').trim(),
      manualStudentStatsOverride: didManuallyChangeStudentStats
        ? true
        : Boolean(displayModel.rawReport?.manualStudentStatsOverride),
      manualChallengesOverride: didUserCustomEditChallengeText,
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
      challenges: cleanedChallenges,
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

  const handleSaveMinistryEditor = (e) => {
    e.preventDefault();
    if (!ministryEditDraft || !onUpdateAdminReport) return;

    const splitClean = (txt) =>
      String(txt || '')
        .split('\n')
        .map(s => s.replace(/^[-•❖▪◦\s]+/, '').trim())
        .filter(Boolean);

    const cleanedHourlyMap = {};
    Object.entries(ministryEditDraft.hourlyIncomeByMonth || {}).forEach(([mNum, val]) => {
      const trimmed = String(val ?? '').trim();
      if (trimmed !== '') {
        cleanedHourlyMap[mNum] = Number(trimmed) || 0;
      }
    });

    const updatedMinistry = {
      ...(ministryModel.rawOverride || {}),
      id: `admin-${ministryModel.storageKey}`,
      year: activeYear,
      docNumber: String(ministryEditDraft.docNumber || '').trim() || '.....................................',
      lunarDateLine: String(ministryEditDraft.lunarDateLine || '').trim(),
      solarDateLine: String(ministryEditDraft.solarDateLine || '').trim(),
      signerTitle: String(ministryEditDraft.signerTitle || 'ព្រះនាយក').trim(),
      reporterTitle: String(ministryEditDraft.reporterTitle || 'អ្នកធ្វើរបាយការណ៍').trim(),
      appliedStudents: Number(ministryEditDraft.appliedStudents) || 0,
      permanentStudents: Number(ministryEditDraft.permanentStudents) || 0,
      oldStudents: Number(ministryEditDraft.oldStudents) || 0,
      newStudents: Number(ministryEditDraft.newStudents) || 0,
      dropoutStudents: Number(ministryEditDraft.dropoutStudents) || 0,
      remainingStudents: Number(ministryEditDraft.remainingStudents) || 0,
      remainingGrade3: Number(ministryEditDraft.remainingGrade3) || 0,
      offCampusStudents: Number(ministryEditDraft.offCampusStudents) || 0,
      teacherTotal: Number(ministryEditDraft.teacherTotal) || 0,
      teacherFramework: Number(ministryEditDraft.teacherFramework) || 0,
      teacherContract: Number(ministryEditDraft.teacherContract) || 0,
      teacherHourly: Number(ministryEditDraft.teacherHourly) || 0,
      paliExamTotal: Number(ministryEditDraft.paliExamTotal) || 0,
      paliExamPassed: Number(ministryEditDraft.paliExamPassed) || 0,
      paliExamFailed: Number(ministryEditDraft.paliExamFailed) || 0,
      dhammaExamTotal: Number(ministryEditDraft.dhammaExamTotal) || 0,
      dhammaExamTri: Number(ministryEditDraft.dhammaExamTri) || 0,
      dhammaExamTo: Number(ministryEditDraft.dhammaExamTo) || 0,
      dhammaExamEk: Number(ministryEditDraft.dhammaExamEk) || 0,
      dhammaExamNote: String(ministryEditDraft.dhammaExamNote || '').trim(),
      computerCountText: String(ministryEditDraft.computerCountText || '').trim(),
      computerNoteText: String(ministryEditDraft.computerNoteText || '').trim(),
      awardCeremonyIncome1: Number(ministryEditDraft.awardCeremonyIncome1) || 0,
      awardCeremonyIncome2: Number(ministryEditDraft.awardCeremonyIncome2) || 0,
      awardCeremonyExpense: Number(ministryEditDraft.awardCeremonyExpense) || 0,
      hourlyIncomeByMonth: cleanedHourlyMap,
      teacherActivities: splitClean(ministryEditDraft.teacherActivitiesText),
      studentActivities: splitClean(ministryEditDraft.studentActivitiesText),
      outsideActivities: splitClean(ministryEditDraft.outsideActivitiesText),
      abbotResponsibilities: splitClean(ministryEditDraft.abbotResponsibilitiesText),
      managementActivities: splitClean(ministryEditDraft.managementActivitiesText),
      libraryLines: splitClean(ministryEditDraft.libraryLinesText),
      donationLines: splitClean(ministryEditDraft.donationLinesText),
      teacherRelations: splitClean(ministryEditDraft.teacherRelationsText),
      challenges: splitClean(ministryEditDraft.challengesText),
      solutions: splitClean(ministryEditDraft.solutionsText),
      conclusionParas: String(ministryEditDraft.conclusionParasText || '')
        .split(/\n+/)
        .map(s => s.trim())
        .filter(Boolean),
      requests: splitClean(ministryEditDraft.requestsText),
      ccList: splitClean(ministryEditDraft.ccListText)
    };

    onUpdateAdminReport(ministryModel.storageKey, updatedMinistry);
    setIsEditing(false);
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      if (isMinistryActive) {
        if (ministryDocType === 'summary') {
          const targetId = isMobile
            ? '#printable-ministry-summary-mobile-hidden'
            : '#printable-ministry-summary-document';
          await exportElementToPdf(targetId, `របាយការណ៍_${ministryModel.shortSummaryFileNameTag}.pdf`);
        } else {
          const targetId = isMobile
            ? '#printable-ministry-report-mobile-hidden'
            : '#printable-ministry-report-document';
          await exportElementToPdf(targetId, `របាយការណ៍_${ministryModel.shortFullFileNameTag}.pdf`);
        }
      } else {
        const targetId = isMobile
          ? '#printable-admin-report-mobile-hidden'
          : '#printable-admin-report-document';
        await exportElementToPdf(targetId, `របាយការណ៍_${displayModel.shortFileNameTag}.pdf`);
      }
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយក PDF: ' + (err?.message || err));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      if (isMinistryActive) {
        if (ministryDocType === 'summary') {
          await exportMinistrySummaryToWord(ministryModel);
        } else {
          await exportMinistryReportToWord(ministryModel);
        }
      } else {
        await exportAdminReportToWord(displayModel, metadata);
      }
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយក Word: ' + (err?.message || err));
    }
  };

  const handleDownloadExcel = async () => {
    try {
      if (isMinistryActive) {
        if (ministryDocType === 'summary') {
          await exportMinistrySummaryToExcel(ministryModel, metadata);
        } else {
          await exportMinistryReportToExcel(ministryModel, metadata);
        }
      } else {
        await exportAdminReportToExcel(displayModel, metadata);
      }
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
    const keyToReset = isMinistryActive ? ministryModel.storageKey : displayModel.storageKey;
    if (onResetSynthesizedReport) {
      onResetSynthesizedReport(keyToReset);
    } else if (onUpdateAdminReport && !isMinistryActive) {
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
              {isMinistryActive ? (
                <span>
                  <strong>ប្រព័ន្ធសំយោគស្វ័យប្រវត្តិ (ទម្រង់មន្ទីរ — ប្រចាំឆ្នាំសិក្សា {ministryModel.yearKhmer})៖</strong>{' '}
                  បានរៀបចំផ្នែក <strong>ក ដល់ ដ, តារាងហិរញ្ញវត្ថុទាំង {fmtNum(7)} ផ្នែក និងតារាងសង្ខេប {fmtNum(10)} ជួរ</strong> ដោយភ្ជាប់ទិន្នន័យស្វ័យប្រវត្តិពីរបាយការណ៍ប្រចាំខែ និងផ្ទាំងចំណូល-ចំណាយ។
                </span>
              ) : (
                <span>
                  <strong>ប្រព័ន្ធសំយោគស្វ័យប្រវត្តិ ({displayModel.periodTitlePhrase})៖</strong>{' '}
                  បានរៀបចំ និងច្រោះបន្ទាត់ស្ទួនត្រង់ <strong>III.វឌ្ឍនភាព, IV.បញ្ហាប្រឈម, V.ទិសដៅ និង VI.សេចក្ដីសន្និដ្ឋាន</strong> ឱ្យត្រូវតាមបទដ្ឋានរដ្ឋបាល។
                </span>
              )}
            </div>
            {hasCustomMultiMonthOverride && canEdit && (
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
          (canEdit || canDownloadPdf) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  canEdit && canDownloadPdf
                    ? 'repeat(3, 1fr)'
                    : canDownloadPdf
                      ? 'repeat(2, 1fr)'
                      : '1fr',
                gap: 6
              }}
            >
              {canEdit && (
                <button
                  type="button"
                  onClick={() => (isEditing ? setIsEditing(false) : handleOpenEditor())}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    background: isEditing ? '#0f172a' : '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: isEditing ? '#ffffff' : '#1e293b',
                    padding: '9px 6px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Edit3 size={14} />
                  <span>{isEditing ? 'បិទកែប្រែ' : 'កែប្រែអត្ថបទ'}</span>
                </button>
              )}

              {canDownloadPdf && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '9px 6px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isExportingPdf ? 'wait' : 'pointer',
                      boxShadow: '0 2px 6px rgba(185, 28, 28, 0.28)',
                      width: '100%',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <FileText size={14} />
                    <span>{isExportingPdf ? 'កំពុងផលិត...' : 'Download PDF'}</span>
                  </button>

                  <TelegramSendMenu
                    compact
                    fullWidth
                    onExportPdf={handleDownloadPdf}
                    onExportWord={handleDownloadWord}
                    onExportExcel={handleDownloadExcel}
                    reportTitle={
                      isMinistryActive
                        ? `របាយការណ៍មន្ទីរ (${ministryDocType === 'summary' ? 'សង្ខេប' : 'ពេញ'}) ឆ្នាំ${ministryModel.yearKhmer}`
                        : `របាយការណ៍រដ្ឋបាល (${displayModel.periodTitlePhrase})`
                    }
                    buttonStyle={{ padding: '9px 6px', fontSize: 12 }}
                  />
                </>
              )}
            </div>
          )
        ) : (
          (canEdit || canExportOffice || canDownloadPdf) && (
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
                {canEdit && (
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
                )}

                {canEdit && canExportOffice && (
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
                )}
              </div>

              {/* Right group: Download buttons (PC: Excel + Word + PDF) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {canExportOffice && (
                  <>
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
                  </>
                )}

                {canDownloadPdf && (
                  <>
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

                    <TelegramSendMenu
                      onExportPdf={handleDownloadPdf}
                      onExportWord={handleDownloadWord}
                      onExportExcel={handleDownloadExcel}
                      reportTitle={
                        isMinistryActive
                          ? `របាយការណ៍មន្ទីរ (${ministryDocType === 'summary' ? 'សង្ខេប' : 'ពេញ'}) ឆ្នាំ${ministryModel.yearKhmer}`
                          : `របាយការណ៍រដ្ឋបាល (${displayModel.periodTitlePhrase})`
                      }
                      buttonStyle={{ padding: '8px 14px', borderRadius: 8 }}
                    />
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* ================================================================== */}
      {/* INLINE EDITOR PANEL (When user clicks "កែប្រែអត្ថបទ")               */}
      {/* ================================================================== */}
      {canEdit && isEditing && !isMinistryActive && editDraft && (
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
                onChange={e => handleTotalStudentsChange(e.target.value)}
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
                onChange={e => handleGradeCountChange('gradeKindergarten', e.target.value)}
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
                onChange={e => handleGradeCountChange('grade1', e.target.value)}
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
                onChange={e => handleGradeCountChange('grade2', e.target.value)}
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
                onChange={e => handleGradeCountChange('grade3', e.target.value)}
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
                III. ក. សកម្មភាពការងារ (❖ ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              <HangingBulletEditor
                rows={6}
                bullet="❖"
                value={editDraft.activitiesText}
                onChange={nextVal => setEditDraft(prev => ({ ...prev, activitiesText: nextVal }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                IV. ១-បញ្ហាប្រឈម (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              <HangingBulletEditor
                rows={6}
                bullet="-"
                value={editDraft.challengesText}
                onChange={nextVal => setEditDraft(prev => ({ ...prev, challengesText: nextVal }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                IV. ២-ដំណោះស្រាយ (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              <HangingBulletEditor
                rows={5}
                bullet="-"
                value={editDraft.solutionsText}
                onChange={nextVal => setEditDraft(prev => ({ ...prev, solutionsText: nextVal }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                IV. ៣-សំណូមពរ (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              <HangingBulletEditor
                rows={5}
                bullet="-"
                value={editDraft.requestsText}
                onChange={nextVal => setEditDraft(prev => ({ ...prev, requestsText: nextVal }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                V. ទិសដៅបន្ត (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              <HangingBulletEditor
                rows={5}
                bullet="-"
                value={editDraft.directionsText}
                onChange={nextVal => setEditDraft(prev => ({ ...prev, directionsText: nextVal }))}
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
        </form>
      )}

      {/* ================================================================== */}
      {/* MINISTRY TEMPLATE INLINE EDITOR PANEL                              */}
      {/* ================================================================== */}
      {canEdit && isEditing && isMinistryActive && ministryEditDraft && (
        <form
          onSubmit={handleSaveMinistryEditor}
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
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: '1px solid #fde68a'
            }}
          >
            <h3 className="font-moul" style={{ margin: 0, fontSize: 15, color: '#92400e' }}>
              កែសម្រួលរបាយការណ៍ប្រចាំឆ្នាំ — ទម្រង់មន្ទីរ ({ministryModel.yearKhmer})
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

          {/* 1. Student, Teacher & Exam Statistics Grid */}
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: '#92400e',
              marginBottom: 6
            }}
          >
            ១. ស្ថិតិសិស្ស គ្រូបង្រៀន ការប្រឡង និងកុំព្យូទ័រ (សម្រាប់ទាំងទម្រង់ពេញ និងតារាងសង្ខេប ១០ ជួរ)
          </div>
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
            {[
              { key: 'appliedStudents', label: 'សិស្សដាក់ពាក្យចូលរៀន', type: 'number' },
              { key: 'permanentStudents', label: 'សិស្សសិក្សាអចិន្ត្រៃយ៍', type: 'number' },
              { key: 'oldStudents', label: 'សិស្សចាស់ (សង្ខេប)', type: 'number' },
              { key: 'newStudents', label: 'សិស្សថ្មី (សង្ខេប)', type: 'number' },
              { key: 'dropoutStudents', label: 'សិស្សបោះបង់ការសិក្សា', type: 'number' },
              { key: 'remainingStudents', label: 'សិស្សនៅសល់ចុងឆ្នាំ', type: 'number' },
              { key: 'remainingGrade3', label: 'សិស្សនៅសល់ថ្នាក់ទី៣', type: 'number' },
              { key: 'offCampusStudents', label: 'សិស្សស្នាក់នៅក្រៅសាលា', type: 'number' },
              { key: 'teacherTotal', label: 'គ្រូបង្រៀនសរុប', type: 'number' },
              { key: 'teacherFramework', label: 'គ្រូក្របខណ្ឌ', type: 'number' },
              { key: 'teacherContract', label: 'គ្រូកិច្ចសន្យា', type: 'number' },
              { key: 'teacherHourly', label: 'គ្រូប្រាក់ម៉ោង', type: 'number' },
              { key: 'paliExamTotal', label: 'ប្រឡងបាលីរង (សរុប)', type: 'number' },
              { key: 'paliExamPassed', label: 'ប្រឡងបាលីរង (ជាប់)', type: 'number' },
              { key: 'paliExamFailed', label: 'ប្រឡងបាលីរង (ធ្លាក់)', type: 'number' },
              { key: 'dhammaExamTotal', label: 'ប្រឡងធម្មវិន័យ (សរុប)', type: 'number' },
              { key: 'dhammaExamTri', label: 'ធម្មវិន័យ ថ្នាក់ត្រី', type: 'number' },
              { key: 'dhammaExamTo', label: 'ធម្មវិន័យ ថ្នាក់ទោ', type: 'number' },
              { key: 'dhammaExamEk', label: 'ធម្មវិន័យ ថ្នាក់ឯក', type: 'number' },
              { key: 'dhammaExamNote', label: 'សម្គាល់ប្រឡងធម្មវិន័យ', type: 'text' },
              { key: 'computerCountText', label: 'ចំនួនកុំព្យូទ័រ (ឧ. ១០គ្រឿង)', type: 'text' },
              { key: 'computerNoteText', label: 'សម្គាល់កុំព្យូទ័រ', type: 'text' },
              { key: 'awardCeremonyIncome1', label: 'ចំណូលចែកបណ្ណសរសើរ (៛)', type: 'number' },
              { key: 'awardCeremonyIncome2', label: 'ចំណូលពីវត្ត-បណ្ណសរសើរ (៛)', type: 'number' },
              { key: 'awardCeremonyExpense', label: 'ចំណាយចែកបណ្ណសរសើរ (៛)', type: 'number' }
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={ministryEditDraft[f.key] ?? ''}
                  onChange={e => setMinistryEditDraft({ ...ministryEditDraft, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>
            ))}
          </div>

          {/* 2. Monthly Hourly-Pay Income Inputs (ច, ច.១, ច.២) */}
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: '#92400e',
              marginBottom: 6
            }}
          >
            ២. ចំណូលប្រាក់ម៉ោងតាមខែ (៛) — ទុកទទេ ឬដាក់ 0 បើគ្មាន (ចំណាយ និងចំនួនម៉ោងទាញស្វ័យប្រវត្តិពីផ្ទាំងចំណូលចំណាយ)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: 8,
              marginBottom: 14,
              background: '#fffbeb',
              padding: 12,
              borderRadius: 10,
              border: '1px solid #fde68a'
            }}
          >
            {[...MINISTRY_SEM1_MONTHS, ...MINISTRY_SEM2_MONTHS].map(m => (
              <div key={m.num}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#78350f', display: 'block', marginBottom: 3 }}>
                  {m.fullLabel || m.name} (៛)
                </label>
                <input
                  type="number"
                  placeholder="គ្មាន (0)"
                  value={ministryEditDraft.hourlyIncomeByMonth?.[m.num] ?? ''}
                  onChange={e =>
                    setMinistryEditDraft({
                      ...ministryEditDraft,
                      hourlyIncomeByMonth: {
                        ...(ministryEditDraft.hourlyIncomeByMonth || {}),
                        [m.num]: e.target.value
                      }
                    })
                  }
                  style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #fcd34d', fontSize: 12.5 }}
                />
              </div>
            ))}
          </div>

          {/* 3. Dates & Signers */}
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: '#92400e',
              marginBottom: 6
            }}
          >
            ៣. កាលបរិច្ឆេទ លេខលិខិត និងតួនាទីហត្ថលេខា
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)',
              gap: 10,
              marginBottom: 14
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                កាលបរិច្ឆេទច័ន្ទគតិ
              </label>
              <input
                type="text"
                value={ministryEditDraft.lunarDateLine}
                onChange={e => setMinistryEditDraft({ ...ministryEditDraft, lunarDateLine: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                កាលបរិច្ឆេទសុរិយគតិ
              </label>
              <input
                type="text"
                value={ministryEditDraft.solarDateLine}
                onChange={e => setMinistryEditDraft({ ...ministryEditDraft, solarDateLine: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                លេខលិខិត
              </label>
              <input
                type="text"
                value={ministryEditDraft.docNumber}
                onChange={e => setMinistryEditDraft({ ...ministryEditDraft, docNumber: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                តួនាទីអ្នកធ្វើរបាយការណ៍
              </label>
              <input
                type="text"
                value={ministryEditDraft.reporterTitle}
                onChange={e => setMinistryEditDraft({ ...ministryEditDraft, reporterTitle: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                តួនាទីអ្នកចុះហត្ថលេខា (ព្រះនាយក)
              </label>
              <input
                type="text"
                value={ministryEditDraft.signerTitle}
                onChange={e => setMinistryEditDraft({ ...ministryEditDraft, signerTitle: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* 4. Narrative Textareas */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            {[
              { key: 'teacherActivitiesText', label: 'ខ.១. សកម្មភាពរបស់គ្រូ (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 5, bullet: true },
              { key: 'studentActivitiesText', label: 'ខ.២. សកម្មភាពសមណសិស្ស សិស្ស (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 5, bullet: true },
              { key: 'outsideActivitiesText', label: 'គ. សកម្មភាពនៅក្រៅសាលា (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 5, bullet: true },
              { key: 'abbotResponsibilitiesText', label: 'ឃ.១. ការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 5, bullet: true },
              { key: 'managementActivitiesText', label: 'ង. សកម្មភាពគណៈគ្រប់គ្រង (រួមទាំងព្រឹត្តិការណ៍ពិសេស)', rows: 7, bullet: true },
              { key: 'libraryLinesText', label: 'ង.១. ពុទ្ធិកបណ្ណាល័យ (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 5, bullet: true },
              { key: 'donationLinesText', label: 'ង.២. ការទទួលជំនួយពីសប្បុរសជន (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 3, bullet: true },
              { key: 'teacherRelationsText', label: 'ឆ. សកម្មភាពគ្រូបង្រៀនជាមួយសមណសិស្ស (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 4, bullet: true },
              { key: 'challengesText', label: 'ជ. បញ្ហាប្រឈម (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 4, bullet: true },
              { key: 'solutionsText', label: 'ឈ. ដំណោះស្រាយ (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 4, bullet: true },
              { key: 'conclusionParasText', label: 'ញ. សេចក្ដីសន្និដ្ឋាន', rows: 5, bullet: false },
              { key: 'requestsText', label: 'ដ. សំណូមពរ (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 4, bullet: true },
              { key: 'ccListText', label: 'ចម្លងប្រគេនជូន (CC) (- ចុច Enter ចុះបន្ទាត់ថ្មី)', rows: 4, bullet: true }
            ].map(sec => (
              <div key={sec.key}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                  {sec.label}
                </label>
                {sec.bullet ? (
                  <HangingBulletEditor
                    rows={sec.rows}
                    bullet="-"
                    value={ministryEditDraft[sec.key] || ''}
                    onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, [sec.key]: nextVal }))}
                  />
                ) : (
                  <textarea
                    rows={sec.rows}
                    value={ministryEditDraft[sec.key] || ''}
                    onChange={e => setMinistryEditDraft({ ...ministryEditDraft, [sec.key]: e.target.value })}
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, lineHeight: 1.7 }}
                  />
                )}
              </div>
            ))}
          </div>
        </form>
      )}

      {/* ================================================================== */}
      {/* VIEW RENDERER:                                                     */}
      {/* - PC -> Official A4/Letter Document inside .paper-sheet-wrapper    */}
      {/* - Mobile with A4 Preview toggled ON -> Auto-Scaled A4SheetScaler   */}
      {/* - Mobile Card Mode -> Clean Mobile Cards                           */}
      {/* ================================================================== */}
      {!isMobile ? (
        <div
          className="paper-sheet-wrapper"
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'visible'
          }}
        >
          {/* Floating Top-Left Summary/Full Switcher (សង្ខេប / ពេញ) when Ministry Template is active on Annual Tab */}
          {periodType === 'year' && annualTemplate === 'ministry' && (
            <button
              type="button"
              className="no-print"
              onClick={() => setMinistryDocType(prev => (prev === 'full' ? 'summary' : 'full'))}
              style={{
                position: 'absolute',
                top: 12,
                left: 14,
                zIndex: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                border: '1.5px solid #d97706',
                background: ministryDocType === 'summary' ? '#b45309' : '#fffbeb',
                color: ministryDocType === 'summary' ? '#ffffff' : '#b45309',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(180,83,9,0.18)',
                transition: 'all 0.15s'
              }}
              title={ministryDocType === 'full' ? 'ប្ដូរមើលរបាយការណ៍សង្ខេប (Letter)' : 'ប្ដូរមើលរបាយការណ៍ពេញ (A4)'}
            >
              <FileText size={14} />
              <span>{ministryDocType === 'full' ? 'សង្ខេប' : 'ពេញ'}</span>
            </button>
          )}

          {/* Floating Top-Right Template Switcher (មន្ទីរ / អនុគណ) on Annual Tab */}
          {periodType === 'year' && (
            <button
              type="button"
              className="no-print"
              onClick={() => {
                setAnnualTemplate(prev => (prev === 'anukon' ? 'ministry' : 'anukon'));
                setIsEditing(false);
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 14,
                zIndex: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                border: '1.5px solid #d97706',
                background: annualTemplate === 'ministry' ? '#b45309' : '#fffbeb',
                color: annualTemplate === 'ministry' ? '#ffffff' : '#b45309',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(180,83,9,0.18)',
                transition: 'all 0.15s'
              }}
              title={annualTemplate === 'anukon' ? 'ប្ដូរមើលទម្រង់មន្ទីរ' : 'ប្ដូរមើលទម្រង់អនុគណ'}
            >
              <FileText size={14} />
              <span>{annualTemplate === 'anukon' ? 'មន្ទីរ' : 'អនុគណ'}</span>
            </button>
          )}

          <div style={{ margin: '0 auto' }}>
            {isMinistryActive ? (
              ministryDocType === 'summary' ? (
                <OfficialMinistrySummaryDocument
                  id="printable-ministry-summary-document"
                  ministryModel={ministryModel}
                />
              ) : (
                <OfficialMinistryReportDocument
                  id="printable-ministry-report-document"
                  ministryModel={ministryModel}
                  useKhmerNumerals={useKhmerNumerals}
                />
              )
            ) : (
              <OfficialAdminReportDocument
                id="printable-admin-report-document"
                displayModel={displayModel}
                useKhmerNumerals={useKhmerNumerals}
              />
            )}
          </div>
        </div>
      ) : mobilePreviewA4 ? (
        <div style={{ position: 'relative' }}>
          {periodType === 'year' && (
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: annualTemplate === 'ministry' ? 'space-between' : 'flex-end',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                padding: '0 4px'
              }}
            >
              {annualTemplate === 'ministry' && (
                <button
                  type="button"
                  onClick={() => setMinistryDocType(prev => (prev === 'full' ? 'summary' : 'full'))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1.5px solid #d97706',
                    background: ministryDocType === 'summary' ? '#b45309' : '#fffbeb',
                    color: ministryDocType === 'summary' ? '#ffffff' : '#b45309',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(180,83,9,0.18)'
                  }}
                >
                  <FileText size={13} />
                  <span>{ministryDocType === 'full' ? 'សង្ខេប' : 'ពេញ'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setAnnualTemplate(prev => (prev === 'anukon' ? 'ministry' : 'anukon'));
                  setIsEditing(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: '1.5px solid #d97706',
                  background: annualTemplate === 'ministry' ? '#b45309' : '#fffbeb',
                  color: annualTemplate === 'ministry' ? '#ffffff' : '#b45309',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(180,83,9,0.18)'
                }}
              >
                <FileText size={13} />
                <span>{annualTemplate === 'anukon' ? 'មន្ទីរ' : 'អនុគណ'}</span>
              </button>
            </div>
          )}

          <A4SheetScaler>
            {isMinistryActive ? (
              ministryDocType === 'summary' ? (
                <OfficialMinistrySummaryDocument
                  id="printable-ministry-summary-document"
                  ministryModel={ministryModel}
                />
              ) : (
                <OfficialMinistryReportDocument
                  id="printable-ministry-report-document"
                  ministryModel={ministryModel}
                  useKhmerNumerals={useKhmerNumerals}
                />
              )
            ) : (
              <OfficialAdminReportDocument
                id="printable-admin-report-document"
                displayModel={displayModel}
                useKhmerNumerals={useKhmerNumerals}
              />
            )}
          </A4SheetScaler>
        </div>
      ) : (
        <>
          {/* Mobile Structured Card View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
            {periodType === 'year' && (
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  justifyContent: annualTemplate === 'ministry' ? 'space-between' : 'flex-end',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: -4
                }}
              >
                {annualTemplate === 'ministry' && (
                  <button
                    type="button"
                    onClick={() => setMinistryDocType(prev => (prev === 'full' ? 'summary' : 'full'))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      border: '1.5px solid #d97706',
                      background: ministryDocType === 'summary' ? '#b45309' : '#fffbeb',
                      color: ministryDocType === 'summary' ? '#ffffff' : '#b45309',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(180,83,9,0.18)'
                    }}
                  >
                    <FileText size={14} />
                    <span>{ministryDocType === 'full' ? 'សង្ខេប' : 'ពេញ'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAnnualTemplate(prev => (prev === 'anukon' ? 'ministry' : 'anukon'));
                    setIsEditing(false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: '1.5px solid #d97706',
                    background: annualTemplate === 'ministry' ? '#b45309' : '#fffbeb',
                    color: annualTemplate === 'ministry' ? '#ffffff' : '#b45309',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(180,83,9,0.18)'
                  }}
                >
                  <FileText size={14} />
                  <span>{annualTemplate === 'anukon' ? 'មន្ទីរ' : 'អនុគណ'}</span>
                </button>
              </div>
            )}

            {isMinistryActive ? (
              ministryDocType === 'summary' ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 14,
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                  }}
                >
                  <div className="font-moul" style={{ fontSize: 13.5, color: '#92400e', textAlign: 'center', marginBottom: 10 }}>
                    {ministryModel.summaryReportTitle} (មន្ទីរធម្មការ និងសាសនា)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(ministryModel.summaryRows || []).map((row, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: 12.5
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {row.no}. {row.desc}
                          </div>
                          {(row.subDescLines || []).map((s, si) => (
                            <div key={si} style={{ paddingLeft: 14, color: '#475569', fontSize: 12 }}>
                              {s}: {(row.subCountLines || [])[si]}
                            </div>
                          ))}
                          {row.note && (
                            <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 2 }}>
                              សម្គាល់៖ {row.note}
                            </div>
                          )}
                        </div>
                        <div style={{ fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap', marginLeft: 8 }}>
                          {row.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
                      color: '#ffffff',
                      borderRadius: 14,
                      padding: 14
                    }}
                  >
                    <div className="font-moul" style={{ fontSize: 12.5, marginBottom: 4 }}>
                      មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម
                    </div>
                    <div className="font-moul" style={{ fontSize: 13.5, marginBottom: 4 }}>
                      របាយការណ៍ ស្តីពី {ministryModel.fullReportTitle}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                    <div className="font-moul" style={{ fontSize: 13, color: '#92400e', marginBottom: 8 }}>
                      ក. ព័ត៌មានទូទៅ
                    </div>
                    {(ministryModel.generalInfoLines || []).map((r, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: '#334155', marginBottom: 4 }}>
                        - {r.label} {r.value ? <strong>({r.value})</strong> : ''}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                    <div className="font-moul" style={{ fontSize: 13, color: '#0369a1', marginBottom: 8 }}>
                      ច. សង្ខេបហិរញ្ញវត្ថុប្រចាំឆ្នាំ ({ministryModel.yearKhmer})
                    </div>
                    <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7 }}>
                      <div>• ចំណាយប្រាក់ម៉ោងសរុប៖ <strong>{ministryModel.hourlyAnnual?.sumExpenseText}</strong> ({ministryModel.hourlyAnnual?.sumHoursText})</div>
                      <div>• ចំណាយសម្ភារៈការិយាល័យសរុប៖ <strong>{ministryModel.officeAnnual?.totalExpenseText}</strong></div>
                      <div>• ចំណូលរួមប្រចាំឆ្នាំ៖ <strong style={{ color: '#15803d' }}>{ministryModel.grandAnnualTable?.incomeKHRText}</strong></div>
                      <div>• ចំណាយរួមប្រចាំឆ្នាំ៖ <strong style={{ color: '#b91c1c' }}>{ministryModel.grandAnnualTable?.expenseKHRText}</strong></div>
                      <div>• សមតុល្យប្រចាំឆ្នាំ៖ <strong>{ministryModel.grandAnnualTable?.balanceKHRText}</strong></div>
                    </div>
                  </div>
                </>
              )
            ) : (
              <>
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
                  <div key={i} style={{ marginBottom: 3 }}>- {line}</div>
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
                  <div key={i} style={{ marginBottom: 4 }}>❖ {line}</div>
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
                  <div key={i} style={{ marginBottom: 3 }}>- {line}</div>
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
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
                ))}
              </div>

              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#15803d', marginBottom: 4 }}>
                ២-ដំណោះស្រាយ
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, lineHeight: 1.6 }}>
                {(displayModel.solutions || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
                ))}
              </div>

              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#b45309', marginBottom: 4 }}>
                ៣-សំណូមពរ
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                {(displayModel.requests || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
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
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
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
              </>
            )}
          </div>
        </>
      )}

      {/* Off-screen Unscaled A4/Letter Document for Mobile High-Res PDF Generation */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '794px',
            minWidth: '794px',
            maxWidth: '794px',
            zIndex: -1,
            pointerEvents: 'none',
            WebkitTextSizeAdjust: '100%',
            textSizeAdjust: '100%'
          }}
          aria-hidden="true"
        >
          {isMinistryActive ? (
            ministryDocType === 'summary' ? (
              <OfficialMinistrySummaryDocument
                id="printable-ministry-summary-mobile-hidden"
                ministryModel={ministryModel}
              />
            ) : (
              <OfficialMinistryReportDocument
                id="printable-ministry-report-mobile-hidden"
                ministryModel={ministryModel}
                useKhmerNumerals={useKhmerNumerals}
              />
            )
          ) : (
            <OfficialAdminReportDocument
              id="printable-admin-report-mobile-hidden"
              displayModel={displayModel}
              useKhmerNumerals={useKhmerNumerals}
            />
          )}
        </div>
      )}
    </div>
  );
}
