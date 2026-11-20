import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Upload,
  Edit3,
  RotateCcw,
  BookOpen,
  Award,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Landmark
} from 'lucide-react';
import OfficialAdminReportDocument from './OfficialAdminReportDocument';
import OfficialMinistryReportDocument from './OfficialMinistryReportDocument';
import OfficialMinistrySummaryDocument from './OfficialMinistrySummaryDocument';
import OfficialSchoolHistoryDocument from './OfficialSchoolHistoryDocument';
import KhmerJustifiedText from './KhmerJustifiedText';
import A4SheetScaler from './A4SheetScaler';
import TelegramSendMenu from './TelegramSendMenu';
import ReportEditableZone from './ReportEditableZone';
import ReportSectionDrawer, { ReportEditModeBar } from './ReportSectionDrawer';
import {
  AdminSectionEditorContent,
  HistorySectionEditorContent,
  MinistrySectionEditorContent
} from './ReportSectionEditors';
import {
  DEFAULT_STAFF_STATS,
  DEFAULT_MANAGEMENT_ROLES,
  DEFAULT_SECTION1_INTRO,
  buildAdminReportDisplayModel,
  buildAutoStudentStatLines,
  buildAutoAdminDocLines,
  synthesizeMultiMonthAdminReport,
  importAdminReportFile,
  syncMonthlyDropoutChallengeLine
} from '../utils/adminReportBuilder';
import {
  buildMinistryReportModel,
  MINISTRY_SEM1_MONTHS,
  MINISTRY_SEM2_MONTHS
} from '../utils/ministryReportBuilder';
import {
  buildSchoolHistoryModel,
  SCHOOL_HISTORY_STORAGE_KEY
} from '../utils/schoolHistoryBuilder';
import { exportElementToPdf } from '../utils/pdfExporter';
import {
  exportAdminReportToWord,
  exportMinistryReportToWord,
  exportMinistrySummaryToWord,
  exportSchoolHistoryToWord
} from '../utils/wordExporter';
import {
  exportAdminReportToExcel,
  exportMinistryReportToExcel,
  exportMinistrySummaryToExcel,
  exportSchoolHistoryToExcel
} from '../utils/excelExporter';
import { toKhmerDigits } from '../utils/khmerNumerals';

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
  const [sem1Mode, setSem1Mode] = useState('standard'); // 'standard' | 'combined' | 'history_only'
  const [annualTemplate, setAnnualTemplate] = useState('anukon'); // 'anukon' | 'ministry'
  const [ministryDocType, setMinistryDocType] = useState('full'); // 'full' | 'summary'
  const isMinistryActive = periodType === 'year' && annualTemplate === 'ministry';
  const isSem1Combined = periodType === 'sem1' && sem1Mode === 'combined';
  const isHistoryOnly = periodType === 'sem1' && sem1Mode === 'history_only';
  const canEdit = periodType === 'month' ? canEditMonth : (canEditSummary ?? canEditMonth);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState(null);
  const [savedToastText, setSavedToastText] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [ministryEditDraft, setMinistryEditDraft] = useState(null);
  const [historyEditDraft, setHistoryEditDraft] = useState(null);
  const fileInputRef = useRef(null);
  const savedToastTimerRef = useRef(null);

  const showSavedToast = (msg = 'បានរក្សាទុក!') => {
    setSavedToastText(msg);
    if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
    savedToastTimerRef.current = setTimeout(() => setSavedToastText(''), 2400);
  };

  useEffect(() => () => {
    if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
  }, []);

  const handleCloseEditMode = () => {
    setIsEditing(false);
    setActiveEditSection(null);
  };

  // Close edit mode automatically whenever user switches month or year in top bar
  useEffect(() => {
    setIsEditing(false);
    setActiveEditSection(null);
  }, [currentMonthKey, activeYear]);

  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));

  const schoolHistoryModel = useMemo(
    () =>
      buildSchoolHistoryModel({
        adminReports,
        year: activeYear,
        useKhmerNumerals
      }),
    [adminReports, activeYear, useKhmerNumerals]
  );

  const displayModel = useMemo(
    () =>
      buildAdminReportDisplayModel({
        periodType,
        monthKey: currentMonthKey,
        year: activeYear,
        adminReports,
        studentMaster,
        useKhmerNumerals,
        includeHistory: isSem1Combined,
        schoolHistory: schoolHistoryModel
      }),
    [periodType, currentMonthKey, activeYear, adminReports, studentMaster, useKhmerNumerals, isSem1Combined, schoolHistoryModel]
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
    : isHistoryOnly
      ? Boolean(schoolHistoryModel.hasCustomOverride)
      : periodType !== 'month' &&
        Boolean(
          adminReports &&
            (adminReports[displayModel.storageKey] ||
              (isSem1Combined && adminReports[SCHOOL_HISTORY_STORAGE_KEY]))
        );

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

  const normalizeParagraphArrayPreserveBlanks = (rawText) => {
    const lines = String(rawText || '')
      .replace(/\u200B/g, '')
      .split(/\r?\n/)
      .map(s => s.replace(/[ \t]+/g, ' ').trim());
    while (lines.length > 0 && lines[0] === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines;
  };

  const makeHistoryDraftFromModel = (hModel) => ({
    title: hModel.title || '',
    backgroundText: (hModel.backgroundParagraphs || []).join('\n'),
    tableIntro: hModel.tableIntro || '',
    rows: (hModel.rows || []).map(r => ({
      academicYear: r.academicYear,
      gradeKindergarten: r.gradeKindergarten,
      grade1: r.grade1,
      grade2: r.grade2,
      grade3: r.grade3,
      note: r.note || ''
    })),
    lunarDateLine: hModel.lunarDateLine || '',
    solarDateLine: hModel.solarDateLine || '',
    signerTitle: hModel.signerTitle || 'នាយកសាលា'
  });

  const serializeHistoryDraft = (draft) => {
    const cleanedTableIntro = normalizeParagraphArrayPreserveBlanks(draft.tableIntro).join('\n');

    return {
      ...(schoolHistoryModel.rawSaved || {}),
      id: `admin-${SCHOOL_HISTORY_STORAGE_KEY}`,
      title: String(draft.title || '').trim(),
      backgroundParagraphs: normalizeParagraphArrayPreserveBlanks(draft.backgroundText),
      tableIntro: cleanedTableIntro,
      rows: (draft.rows || []).map(r => ({
        academicYear: String(r.academicYear || '').trim(),
        gradeKindergarten: Math.max(0, Number(r.gradeKindergarten) || 0),
        grade1: Math.max(0, Number(r.grade1) || 0),
        grade2: Math.max(0, Number(r.grade2) || 0),
        grade3: Math.max(0, Number(r.grade3) || 0),
        note: String(r.note || '').trim()
      })),
      lunarDateLine: String(draft.lunarDateLine || '').trim(),
      solarDateLine: String(draft.solarDateLine || '').trim(),
      signerTitle: String(draft.signerTitle || 'នាយកសាលា').trim()
    };
  };

  const buildFreshAdminDraft = () => {
    const raw = displayModel.rawReport || {};
    const st = displayModel.studentStats || {};
    const ad = displayModel.adminDocs || {};
    return {
      docNumber: displayModel.docNumber || '......................',
      recipientTitle: displayModel.recipientTitle || '',
      subjectText:
        displayModel.subjectText || raw.customSubjectText || displayModel.defaultAutoSubject || '',
      introParagraph:
        displayModel.introParagraph || displayModel.defaultAutoIntroParagraph || '',
      section1Intro: displayModel.section1Intro || DEFAULT_SECTION1_INTRO,
      managementRoles: (displayModel.managementRoles || DEFAULT_MANAGEMENT_ROLES).map(m => ({
        name: m?.name || '',
        role: m?.role || ''
      })),
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
      staffStatsText: formatLinesWithBullet(displayModel.staffStats, '-'),
      studentStatLinesText: formatLinesWithBullet(displayModel.studentStatLines, '-'),
      adminDocLinesText: formatLinesWithBullet(displayModel.adminDocLines, '-'),
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
    };
  };

  const buildFreshMinistryDraft = () => {
    const st = ministryModel.stats || {};
    const hourlyMap = {};
    [...MINISTRY_SEM1_MONTHS, ...MINISTRY_SEM2_MONTHS].forEach(m => {
      const raw = st.hourlyIncomeByMonth?.[m.num];
      hourlyMap[m.num] = raw !== undefined && raw !== null ? String(raw) : '';
    });
    return {
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
      conclusionParasText: (ministryModel.conclusionParas || []).join('\n'),
      requestsText: formatLinesWithBullet(ministryModel.requests, '-'),
      ccListText: formatLinesWithBullet(ministryModel.ccList, '-')
    };
  };

  const initDraftsForCurrentMode = () => {
    if (isHistoryOnly) {
      setHistoryEditDraft(makeHistoryDraftFromModel(schoolHistoryModel));
      return;
    }
    if (isMinistryActive) {
      setMinistryEditDraft(buildFreshMinistryDraft());
      return;
    }
    setEditDraft(buildFreshAdminDraft());
    if (isSem1Combined) {
      setHistoryEditDraft(makeHistoryDraftFromModel(schoolHistoryModel));
    }
  };

  const handleOpenEditor = () => {
    initDraftsForCurrentMode();
    setActiveEditSection(null);
    setIsEditing(true);
  };

  const handleSelectEditSection = (sectionId) => {
    if (!sectionId) return;
    if (isHistoryOnly && !historyEditDraft) {
      setHistoryEditDraft(makeHistoryDraftFromModel(schoolHistoryModel));
    } else if (isMinistryActive && !ministryEditDraft) {
      setMinistryEditDraft(buildFreshMinistryDraft());
    } else if (!isHistoryOnly && !isMinistryActive) {
      if (!editDraft) setEditDraft(buildFreshAdminDraft());
      if (isSem1Combined && !historyEditDraft) {
        setHistoryEditDraft(makeHistoryDraftFromModel(schoolHistoryModel));
      }
    }
    setActiveEditSection(sectionId);
  };

  const handleCancelActiveDrawer = () => {
    initDraftsForCurrentMode();
    setActiveEditSection(null);
  };

  const activeEditSections = useMemo(() => {
    if (isHistoryOnly) {
      return [
        { id: 'hist_title', shortLabel: 'ចំណងជើង', label: 'ចំណងជើងរបាយការណ៍ប្រវត្តិសាលា' },
        { id: 'hist_bg', shortLabel: '១.១. សាវតារ', label: '១.១. សាវតារ' },
        { id: 'hist_table', shortLabel: 'តារាង ១៦ ឆ្នាំ', label: 'អត្ថបទណែនាំ & តារាងធនធានមនុស្ស ១៦ ឆ្នាំ', wide: true },
        { id: 'hist_signature', shortLabel: 'កាលបរិច្ឆេទ & ហត្ថលេខា', label: 'កាលបរិច្ឆេទ & ហត្ថលេខា' }
      ];
    }
    if (isMinistryActive) {
      if (ministryDocType === 'summary') {
        return [
          { id: 'min_stats', shortLabel: 'តារាងសង្ខេប ១០ ជួរ', label: 'តារាងសង្ខេប ១០ ជួរ (ស្ថិតិសិស្ស គ្រូ ប្រឡង)', wide: true },
          { id: 'min_signature', shortLabel: 'លេខលិខិត & ហត្ថលេខា', label: 'លេខលិខិត កាលបរិច្ឆេទ & ហត្ថលេខា' }
        ];
      }
      return [
        { id: 'min_stats', shortLabel: 'ក. ព័ត៌មានទូទៅ', label: 'ក. ព័ត៌មានទូទៅ & ស្ថិតិសិស្ស/គ្រូ/ប្រឡង', wide: true },
        { id: 'min_in_school', shortLabel: 'ខ. ក្នុងសាលា', label: 'ខ. សកម្មភាពក្នុងសាលា (ខ.១ គ្រូ & ខ.២ សមណសិស្ស)' },
        { id: 'min_outside', shortLabel: 'គ. ក្រៅសាលា', label: 'គ. សកម្មភាពនៅក្រៅសាលា' },
        { id: 'min_abbot', shortLabel: 'ឃ. ព្រះចៅអធិការ', label: 'ឃ.១. ការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ' },
        { id: 'min_management', shortLabel: 'ង. គណៈគ្រប់គ្រង', label: 'ង. គណៈគ្រប់គ្រង ង.១ បណ្ណាល័យ & ង.២ ជំនួយ' },
        { id: 'min_finance', shortLabel: 'ច. ហិរញ្ញវត្ថុ', label: 'ច. ចំណូលប្រាក់ម៉ោង & កម្មវិធីចែកបណ្ណសរសើរ', wide: true },
        { id: 'min_relations', shortLabel: 'ឆ. គ្រូ & សិស្ស', label: 'ឆ. សកម្មភាពគ្រូបង្រៀនជាមួយសមណសិស្ស' },
        { id: 'min_challenges', shortLabel: 'ជ-ឈ. បញ្ហា & ដំណោះស្រាយ', label: 'ជ. បញ្ហាប្រឈម & ឈ. ដំណោះស្រាយ' },
        { id: 'min_conclusion', shortLabel: 'ញ-ដ. សន្និដ្ឋាន & សំណូមពរ', label: 'ញ. សេចក្ដីសន្និដ្ឋាន & ដ. សំណូមពរ' },
        { id: 'min_signature', shortLabel: 'ហត្ថលេខា & CC', label: 'លេខលិខិត កាលបរិច្ឆេទ ហត្ថលេខា & ចម្លងប្រគេនជូន' }
      ];
    }

    const sn = displayModel.sectionNumbers || {
      management: 'I',
      stats: 'II',
      progress: 'III',
      challenges: 'IV',
      directions: 'V',
      conclusion: 'VI'
    };
    return [
      { id: 'header', shortLabel: 'លេខ/អ្នកទទួល', label: 'លេខលិខិត & ព្រះនាមអ្នកទទួល' },
      { id: 'subject_intro', shortLabel: 'កម្មវត្ថុ/ផ្ដើម', label: 'កម្មវត្ថុ & សេចក្ដីផ្ដើម' },
      ...(isSem1Combined ? [{ id: 'history_bg', shortLabel: 'I. សាវតារ', label: 'I. សាវតារ' }] : []),
      { id: 'management', shortLabel: `${sn.management}. តួនាទី`, label: `${sn.management}. តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា` },
      { id: 'stats', shortLabel: `${sn.stats}. ស្ថិតិ`, label: `${sn.stats}. ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស` },
      { id: 'activities', shortLabel: `${sn.progress}. ក. សកម្មភាព`, label: `${sn.progress}. ក. សកម្មភាពការងារ` },
      { id: 'admin_docs', shortLabel: `${sn.progress}. ខ. រដ្ឋបាល`, label: `${sn.progress}. ខ. ការងារគ្រប់គ្រង តាក់តែងលិខិតរដ្ឋបាល` },
      ...(isSem1Combined
        ? [{ id: 'history_table', shortLabel: 'គ. តារាង ១៦ ឆ្នាំ', label: 'គ. អត្ថបទណែនាំ & តារាងធនធានមនុស្ស ១៦ ឆ្នាំ', wide: true }]
        : []),
      { id: 'appendix', shortLabel: 'ឧបសម្ព័ន្ធ', label: displayModel.section3SubDHeading || 'ឧបសម្ព័ន្ធ (ចំណាយ)' },
      { id: 'challenges', shortLabel: `${sn.challenges}. ១-បញ្ហា`, label: `${sn.challenges}. ១-បញ្ហាប្រឈម` },
      { id: 'solutions', shortLabel: '២-ដំណោះស្រាយ', label: `${sn.challenges}. ២-ដំណោះស្រាយ` },
      { id: 'requests', shortLabel: '៣-សំណូមពរ', label: `${sn.challenges}. ៣-សំណូមពរ` },
      { id: 'directions', shortLabel: `${sn.directions}. ទិសដៅ`, label: `${sn.directions}. ទិសដៅបន្ត` },
      { id: 'conclusion', shortLabel: `${sn.conclusion}. សន្និដ្ឋាន`, label: `${sn.conclusion}. សេចក្ដីសន្និដ្ឋាន` },
      { id: 'signature', shortLabel: 'ហត្ថលេខា', label: 'កាលបរិច្ឆេទ & ហត្ថលេខា' }
    ];
  }, [isHistoryOnly, isMinistryActive, ministryDocType, isSem1Combined, displayModel.sectionNumbers, displayModel.section3SubDHeading]);

  const buildDraftStudentStatsObj = (draft) => ({
    ...(displayModel.studentStats || {}),
    classCount: displayModel.studentStats?.classCount || 4,
    totalStudents: Number(draft.totalStudents) || 0,
    gradeKindergarten: Number(draft.gradeKindergarten) || 0,
    grade1: Number(draft.grade1) || 0,
    grade2: Number(draft.grade2) || 0,
    grade3: Number(draft.grade3) || 0
  });

  const buildDraftAdminDocsObj = (draft) => ({
    outgoingLetters: Number(draft.outgoingLetters) || 0,
    incomingLetters: Number(draft.incomingLetters) || 0,
    schoolMinutes: Number(draft.schoolMinutes) || 0,
    schoolReportsToMinistry: Number(draft.schoolReportsToMinistry) || 0,
    ministryMeetings: Number(draft.ministryMeetings) || 0
  });

  const handleTotalStudentsChange = (rawVal) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const nextDraft = { ...prev, totalStudents: rawVal };
      nextDraft.studentStatLinesText = formatLinesWithBullet(
        buildAutoStudentStatLines({
          periodType,
          studentStats: buildDraftStudentStatsObj(nextDraft),
          useKhmerNumerals
        }),
        '-'
      );
      if (periodType !== 'month') {
        return nextDraft;
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
      nextDraft.challengesText = formatLinesWithBullet(nextChallenges, '-');
      return nextDraft;
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
      nextDraft.studentStatLinesText = formatLinesWithBullet(
        buildAutoStudentStatLines({
          periodType,
          studentStats: buildDraftStudentStatsObj(nextDraft),
          useKhmerNumerals
        }),
        '-'
      );
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

  const handleAdminDocCountChange = (docField, rawVal) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const nextDraft = { ...prev, [docField]: rawVal };
      nextDraft.adminDocLinesText = formatLinesWithBullet(
        buildAutoAdminDocLines({
          adminDocs: buildDraftAdminDocsObj(nextDraft),
          useKhmerNumerals
        }),
        '-'
      );
      return nextDraft;
    });
  };

  const handleSaveEditor = (e) => {
    if (e?.preventDefault) e.preventDefault();
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

    // Preserve explicit Enter (\n) line breaks inside BOTH កម្មវត្ថុ and សេចក្ដីផ្ដើម (and សន្និដ្ឋាន)
    const normalizeMultilinePreserveBreaks = (val) => {
      const rawLines = String(val || '')
        .replace(/\u200B/g, '')
        .split(/\r?\n/)
        .map(line => line.replace(/[ \t]+/g, ' ').trim());
      while (rawLines.length > 0 && rawLines[0] === '') rawLines.shift();
      while (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') rawLines.pop();
      return rawLines.join('\n');
    };

    const trimmedSubject = normalizeMultilinePreserveBreaks(editDraft.subjectText)
      .replace(/^កម្មវត្ថុ[៖:]\s*/, '')
      .trim();
    const trimmedIntro = normalizeMultilinePreserveBreaks(editDraft.introParagraph);
    const trimmedConclusion = normalizeMultilinePreserveBreaks(editDraft.conclusionText);
    const isCustomSubjectEdited = Boolean(
      trimmedSubject && trimmedSubject !== String(displayModel.defaultAutoSubject || '').trim()
    );
    const isCustomIntroEdited = Boolean(
      trimmedIntro && trimmedIntro !== String(displayModel.defaultAutoIntroParagraph || '').trim()
    );

    const nextStudentStats = buildDraftStudentStatsObj(editDraft);
    const nextAdminDocs = buildDraftAdminDocsObj(editDraft);

    const cleanedStaffStats = splitClean(editDraft.staffStatsText);
    const cleanedStudentLines = splitClean(editDraft.studentStatLinesText);
    const autoStudentLinesForDraft = buildAutoStudentStatLines({
      periodType,
      studentStats: nextStudentStats,
      useKhmerNumerals
    });
    const isCustomStudentLines =
      cleanedStudentLines.length > 0 &&
      JSON.stringify(cleanedStudentLines) !== JSON.stringify(autoStudentLinesForDraft);

    const cleanedAdminDocLines = splitClean(editDraft.adminDocLinesText);
    const autoAdminDocLinesForDraft = buildAutoAdminDocLines({
      adminDocs: nextAdminDocs,
      useKhmerNumerals
    });
    const isCustomAdminDocLines =
      cleanedAdminDocLines.length > 0 &&
      JSON.stringify(cleanedAdminDocLines) !== JSON.stringify(autoAdminDocLinesForDraft);

    const cleanedSection1Intro =
      normalizeMultilinePreserveBreaks(editDraft.section1Intro) || DEFAULT_SECTION1_INTRO;
    const cleanedManagementRoles = (editDraft.managementRoles || [])
      .map(m => ({
        name: String(m?.name || '').trim(),
        role: String(m?.role || '').trim()
      }))
      .filter(m => m.name || m.role);

    const updatedReport = {
      ...displayModel.rawReport,
      id: `admin-${displayModel.storageKey}`,
      periodType,
      monthKey: periodType === 'month' ? currentMonthKey : undefined,
      year: activeYear,
      docNumber: String(editDraft.docNumber || '').trim() || '......................',
      recipientTitle: String(editDraft.recipientTitle || '').trim(),
      customSubjectText: isCustomSubjectEdited ? trimmedSubject : '',
      manualSubjectOverride: isCustomSubjectEdited,
      customIntroParagraph: isCustomIntroEdited ? trimmedIntro : '',
      section1Intro: cleanedSection1Intro,
      managementRoles:
        cleanedManagementRoles.length > 0 ? cleanedManagementRoles : DEFAULT_MANAGEMENT_ROLES,
      manualStudentStatsOverride: (didManuallyChangeStudentStats || isCustomStudentLines)
        ? true
        : Boolean(displayModel.rawReport?.manualStudentStatsOverride),
      manualChallengesOverride: didUserCustomEditChallengeText,
      staffStats: cleanedStaffStats.length > 0 ? cleanedStaffStats : DEFAULT_STAFF_STATS,
      studentStats: nextStudentStats,
      customStudentLines: isCustomStudentLines ? cleanedStudentLines : [],
      adminDocs: nextAdminDocs,
      customAdminDocLines: isCustomAdminDocLines ? cleanedAdminDocLines : [],
      activities: splitClean(editDraft.activitiesText),
      appendixItems: splitClean(editDraft.appendixText),
      challenges: cleanedChallenges,
      solutions: splitClean(editDraft.solutionsText),
      requests: splitClean(editDraft.requestsText),
      directions: splitClean(editDraft.directionsText),
      conclusionText: trimmedConclusion,
      lunarDateLine: String(editDraft.lunarDateLine || '').trim(),
      solarDateLine: String(editDraft.solarDateLine || '').trim(),
      signerTitle: String(editDraft.signerTitle || 'ព្រះនាយក').trim()
    };

    onUpdateAdminReport(displayModel.storageKey, updatedReport);
    if (isSem1Combined && historyEditDraft) {
      onUpdateAdminReport(SCHOOL_HISTORY_STORAGE_KEY, serializeHistoryDraft(historyEditDraft));
    }
    setActiveEditSection(null);
    showSavedToast('បានរក្សាទុក!');
  };

  const handleSaveHistoryEditor = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!historyEditDraft || !onUpdateAdminReport) return;
    onUpdateAdminReport(SCHOOL_HISTORY_STORAGE_KEY, serializeHistoryDraft(historyEditDraft));
    setActiveEditSection(null);
    showSavedToast('បានរក្សាទុក!');
  };

  const handleSaveMinistryEditor = (e) => {
    if (e?.preventDefault) e.preventDefault();
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
      conclusionParas: normalizeParagraphArrayPreserveBlanks(ministryEditDraft.conclusionParasText),
      requests: splitClean(ministryEditDraft.requestsText),
      ccList: splitClean(ministryEditDraft.ccListText)
    };

    onUpdateAdminReport(ministryModel.storageKey, updatedMinistry);
    setActiveEditSection(null);
    showSavedToast('បានរក្សាទុក!');
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      if (isHistoryOnly) {
        const targetId = isMobile
          ? '#printable-school-history-mobile-hidden'
          : '#printable-school-history-document';
        await exportElementToPdf(targetId, `របាយការណ៍_${schoolHistoryModel.shortFileNameTag}.pdf`);
      } else if (isMinistryActive) {
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
      if (isHistoryOnly) {
        await exportSchoolHistoryToWord(schoolHistoryModel);
      } else if (isMinistryActive) {
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
      if (isHistoryOnly) {
        await exportSchoolHistoryToExcel(schoolHistoryModel, metadata);
      } else if (isMinistryActive) {
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
    if (isHistoryOnly) {
      if (onResetSynthesizedReport) {
        onResetSynthesizedReport(SCHOOL_HISTORY_STORAGE_KEY);
      }
      return;
    }
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
    { id: 'sem1', label: 'ឆមាសទី ១', sub: 'ឧសភា - តុលា' },
    { id: 'sem2', label: 'ឆមាសទី ២', sub: 'វិច្ឆិកា - កុម្ភៈ' },
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
                  handleCloseEditMode();
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

        {/* Choice A: 3-Button Segmented Template Selector (Visible ONLY in Semester 1 — PC & Mobile /mp) */}
        {periodType === 'sem1' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: isMobile ? 5 : 8,
              marginBottom: isMobile ? 10 : 12,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: isMobile ? 4 : 5
            }}
          >
            {[
              { id: 'standard', label: 'ធម្មតា', sub: 'របាយការណ៍ឆមាសទី ១', Icon: FileText },
              { id: 'combined', label: 'ឆមាសទី១ + ប្រវត្តិ', sub: 'លាយសាវតារ និងតារាង ១៦ ឆ្នាំ', Icon: BookOpen },
              { id: 'history_only', label: 'ប្រវត្តិសាលាសុទ្ធ', sub: 'ឯកសារប្រវត្តិសាលាដាច់ដោយឡែក', Icon: Landmark }
            ].map(opt => {
              const active = sem1Mode === opt.id;
              const IconComp = opt.Icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSem1Mode(opt.id);
                    handleCloseEditMode();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    padding: isMobile ? '7px 4px' : '8px 10px',
                    borderRadius: 8,
                    border: active ? '1.5px solid #0284c7' : '1px solid transparent',
                    background: active
                      ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'
                      : 'transparent',
                    color: active ? '#0c4a6e' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                    boxShadow: active ? '0 1px 4px rgba(2, 132, 199, 0.18)' : 'none',
                    minWidth: 0
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? 3 : 5,
                      fontSize: isMobile ? 11 : 13,
                      fontWeight: 800,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <IconComp size={isMobile ? 12 : 14} style={{ flexShrink: 0 }} />
                    <span>{opt.label}</span>
                  </span>
                  {!isMobile && (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: active ? '#0369a1' : '#64748b',
                        fontWeight: 600,
                        lineHeight: 1.2
                      }}
                    >
                      {opt.sub}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

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
              ) : isHistoryOnly ? (
                <span>
                  <strong>ឯកសារប្រវត្តិសាលាសុទ្ធ (១.១. សាវតារ + តារាងធនធានមនុស្ស {fmtNum(schoolHistoryModel.rows.length)} ឆ្នាំ)៖</strong>{' '}
                  តារាងបូកសរុបស្វ័យប្រវត្តិតាមគណិតវិទ្យា និងភ្ជាប់ទិន្នន័យរួមជាមួយទម្រង់ <strong>ឆមាសទី១ + ប្រវត្តិ</strong>។
                </span>
              ) : isSem1Combined ? (
                <span>
                  <strong>របាយការណ៍ឆមាសទី១ + ប្រវត្តិសាលា៖</strong>{' '}
                  បានបញ្ចូល <strong>I. សាវតារ</strong>, រុញលេខរ៉ូម៉ាំង <strong>II–VII</strong> និងភ្ជាប់ <strong>តារាងធនធានមនុស្ស {fmtNum(schoolHistoryModel.rows.length)} ឆ្នាំ</strong> ក្រោមផ្នែក IV. ក ដោយស្វ័យប្រវត្តិ។
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
                <span>{isHistoryOnly ? 'ស្ដារប្រវត្តិសាលាដើមវិញ' : 'បូកសរុបស្វ័យប្រវត្តិឡើងវិញ'}</span>
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
                  onClick={() => (isEditing ? handleCloseEditMode() : handleOpenEditor())}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    background: isEditing ? '#b45309' : '#f1f5f9',
                    border: isEditing ? '1px solid #92400e' : '1px solid #cbd5e1',
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
                  <span>{isEditing ? 'បិទ Edit Mode' : 'កែប្រែអត្ថបទ'}</span>
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
                      isHistoryOnly
                        ? `របាយការណ៍ប្រវត្តិសាលា (ឆ្នាំ${schoolHistoryModel.yearKhmer})`
                        : isMinistryActive
                          ? `របាយការណ៍មន្ទីរ (${ministryDocType === 'summary' ? 'សង្ខេប' : 'ពេញ'}) ឆ្នាំ${ministryModel.yearKhmer}`
                          : isSem1Combined
                            ? `របាយការណ៍ឆមាសទី១ និងប្រវត្តិសាលា (${displayModel.periodTitlePhrase})`
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
                    onClick={() => (isEditing ? handleCloseEditMode() : handleOpenEditor())}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isEditing ? '#b45309' : '#f1f5f9',
                      border: isEditing ? '1px solid #92400e' : '1px solid #cbd5e1',
                      color: isEditing ? '#ffffff' : '#1e293b',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={15} />
                    <span>{isEditing ? 'បិទ Edit Mode' : 'របៀបកែប្រែ (Edit Mode)'}</span>
                  </button>
                )}

                {canEdit && canExportOffice && !isHistoryOnly && (
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
                        isHistoryOnly
                          ? `របាយការណ៍ប្រវត្តិសាលា (ឆ្នាំ${schoolHistoryModel.yearKhmer})`
                          : isMinistryActive
                            ? `របាយការណ៍មន្ទីរ (${ministryDocType === 'summary' ? 'សង្ខេប' : 'ពេញ'}) ឆ្នាំ${ministryModel.yearKhmer}`
                            : isSem1Combined
                              ? `របាយការណ៍ឆមាសទី១ និងប្រវត្តិសាលា (${displayModel.periodTitlePhrase})`
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
      {/* SMART CLICK-TO-EDIT MODE BAR (Quick Jump Chips — PC & Mobile /mp)  */}
      {/* ================================================================== */}
      {canEdit && isEditing && (
        <ReportEditModeBar
          sections={activeEditSections}
          activeSectionId={activeEditSection}
          onSelectSection={handleSelectEditSection}
          onCloseEditMode={handleCloseEditMode}
          isMobile={isMobile}
          savedToastText={savedToastText}
          theme={isHistoryOnly || isSem1Combined ? 'sky' : 'amber'}
        />
      )}

      {/* ================================================================== */}
      {/* FOCUSED SINGLE-SECTION DRAWER (PC Side Drawer / Mobile Sheet)      */}
      {/* ================================================================== */}
      {canEdit && isEditing && (
        <ReportSectionDrawer
          isOpen={Boolean(activeEditSection)}
          isMobile={isMobile}
          sections={activeEditSections}
          activeSectionId={activeEditSection}
          onSelectSection={handleSelectEditSection}
          onSave={
            isHistoryOnly
              ? handleSaveHistoryEditor
              : isMinistryActive
                ? handleSaveMinistryEditor
                : handleSaveEditor
          }
          onCancel={handleCancelActiveDrawer}
          theme={isHistoryOnly || isSem1Combined ? 'sky' : 'amber'}
        >
          {isHistoryOnly ? (
            <HistorySectionEditorContent
              sectionId={activeEditSection}
              historyEditDraft={historyEditDraft}
              setHistoryEditDraft={setHistoryEditDraft}
              isMobile={isMobile}
              fmtNum={fmtNum}
            />
          ) : isMinistryActive ? (
            <MinistrySectionEditorContent
              sectionId={activeEditSection}
              ministryEditDraft={ministryEditDraft}
              setMinistryEditDraft={setMinistryEditDraft}
              ministryDocType={ministryDocType}
              isMobile={isMobile}
            />
          ) : (
            <AdminSectionEditorContent
              sectionId={activeEditSection}
              editDraft={editDraft}
              setEditDraft={setEditDraft}
              historyEditDraft={historyEditDraft}
              setHistoryEditDraft={setHistoryEditDraft}
              displayModel={displayModel}
              periodType={periodType}
              useKhmerNumerals={useKhmerNumerals}
              isMobile={isMobile}
              fmtNum={fmtNum}
              buildDraftStudentStatsObj={buildDraftStudentStatsObj}
              buildDraftAdminDocsObj={buildDraftAdminDocsObj}
              onTotalStudentsChange={handleTotalStudentsChange}
              onGradeCountChange={handleGradeCountChange}
              onAdminDocCountChange={handleAdminDocCountChange}
            />
          )}
        </ReportSectionDrawer>
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
              onClick={() => {
                setMinistryDocType(prev => (prev === 'full' ? 'summary' : 'full'));
                setActiveEditSection(null);
              }}
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
                handleCloseEditMode();
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
            {isHistoryOnly ? (
              <OfficialSchoolHistoryDocument
                id="printable-school-history-document"
                historyModel={schoolHistoryModel}
                useKhmerNumerals={useKhmerNumerals}
                editMode={canEdit && isEditing && !isExportingPdf}
                activeEditSection={activeEditSection}
                onSelectEditSection={handleSelectEditSection}
              />
            ) : isMinistryActive ? (
              ministryDocType === 'summary' ? (
                <OfficialMinistrySummaryDocument
                  id="printable-ministry-summary-document"
                  ministryModel={ministryModel}
                  editMode={canEdit && isEditing && !isExportingPdf}
                  activeEditSection={activeEditSection}
                  onSelectEditSection={handleSelectEditSection}
                />
              ) : (
                <OfficialMinistryReportDocument
                  id="printable-ministry-report-document"
                  ministryModel={ministryModel}
                  useKhmerNumerals={useKhmerNumerals}
                  editMode={canEdit && isEditing && !isExportingPdf}
                  activeEditSection={activeEditSection}
                  onSelectEditSection={handleSelectEditSection}
                />
              )
            ) : (
              <OfficialAdminReportDocument
                id="printable-admin-report-document"
                displayModel={displayModel}
                useKhmerNumerals={useKhmerNumerals}
                editMode={canEdit && isEditing && !isExportingPdf}
                activeEditSection={activeEditSection}
                onSelectEditSection={handleSelectEditSection}
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
                  onClick={() => {
                    setMinistryDocType(prev => (prev === 'full' ? 'summary' : 'full'));
                    setActiveEditSection(null);
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
                  handleCloseEditMode();
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
            {isHistoryOnly ? (
              <OfficialSchoolHistoryDocument
                id="printable-school-history-document"
                historyModel={schoolHistoryModel}
                useKhmerNumerals={useKhmerNumerals}
                editMode={canEdit && isEditing && !isExportingPdf}
                activeEditSection={activeEditSection}
                onSelectEditSection={handleSelectEditSection}
              />
            ) : isMinistryActive ? (
              ministryDocType === 'summary' ? (
                <OfficialMinistrySummaryDocument
                  id="printable-ministry-summary-document"
                  ministryModel={ministryModel}
                  editMode={canEdit && isEditing && !isExportingPdf}
                  activeEditSection={activeEditSection}
                  onSelectEditSection={handleSelectEditSection}
                />
              ) : (
                <OfficialMinistryReportDocument
                  id="printable-ministry-report-document"
                  ministryModel={ministryModel}
                  useKhmerNumerals={useKhmerNumerals}
                  editMode={canEdit && isEditing && !isExportingPdf}
                  activeEditSection={activeEditSection}
                  onSelectEditSection={handleSelectEditSection}
                />
              )
            ) : (
              <OfficialAdminReportDocument
                id="printable-admin-report-document"
                displayModel={displayModel}
                useKhmerNumerals={useKhmerNumerals}
                editMode={canEdit && isEditing && !isExportingPdf}
                activeEditSection={activeEditSection}
                onSelectEditSection={handleSelectEditSection}
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
                    onClick={() => {
                      setMinistryDocType(prev => (prev === 'full' ? 'summary' : 'full'));
                      setActiveEditSection(null);
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
                    handleCloseEditMode();
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

            {isHistoryOnly ? (
              <>
                {/* Standalone School History Mobile Cards */}
                <ReportEditableZone
                  editMode={canEdit && isEditing}
                  sectionId="hist_title"
                  label="ចំណងជើងរបាយការណ៍"
                  activeSectionId={activeEditSection}
                  onSelectSection={handleSelectEditSection}
                >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
                    color: '#ffffff',
                    borderRadius: 14,
                    padding: 14,
                    boxShadow: '0 4px 12px rgba(3, 105, 161, 0.22)'
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
                      <div className="font-moul" style={{ fontSize: 11.5 }}>
                        មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម
                      </div>
                      <div className="font-moul" style={{ fontSize: 11.5 }}>
                        សាលាពុទ្ធិកបឋមសិក្សា កម្រង ហ៊ុន ណេង
                      </div>
                    </div>
                  </div>
                  <div className="font-moul" style={{ fontSize: 13.5, lineHeight: 1.55, textAlign: 'center' }}>
                    របាយការណ៍ ស្ដីពី {schoolHistoryModel.title}
                  </div>
                </div>
                </ReportEditableZone>

                <ReportEditableZone
                  editMode={canEdit && isEditing}
                  sectionId="hist_bg"
                  label="១.១. សាវតារ"
                  activeSectionId={activeEditSection}
                  onSelectSection={handleSelectEditSection}
                >
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
                    style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Landmark size={16} />
                    <span>{fmtNum(1)}.{fmtNum(1)}. សាវតារ</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7 }}>
                    {(schoolHistoryModel.backgroundParagraphs || []).map((p, i) =>
                      String(p || '').trim() ? (
                        <KhmerJustifiedText
                          key={i}
                          text={p}
                          firstLineIndent={24}
                          fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                          fontSize={12.5}
                          lineHeight={1.7}
                          style={{ margin: '0 0 8px', color: '#334155' }}
                        />
                      ) : (
                        <div key={i} aria-hidden="true" style={{ height: 14 }} />
                      )
                    )}
                  </div>
                </div>
                </ReportEditableZone>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 14
                  }}
                >
                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="hist_table"
                    label="តារាង ១៦ ឆ្នាំ"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
                  {schoolHistoryModel.tableIntro && (
                    <KhmerJustifiedText
                      text={schoolHistoryModel.tableIntro}
                      firstLineIndent={24}
                      fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      fontSize={12.5}
                      lineHeight={1.65}
                      style={{ marginBottom: 10, color: '#1e293b' }}
                    />
                  )}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
                          {['ល.រ', 'ឆ្នាំសិក្សា', 'មត្តេយ្យ', 'ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣', 'សរុប', 'ផ្សេងៗ'].map(h => (
                            <th key={h} style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(schoolHistoryModel.rows || []).map((r, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.no}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>{r.academicYearDisplay}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.kgText}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.g1Text}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.g2Text}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.g3Text}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#0c4a6e' }}>{r.totalText}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.note || ''}</td>
                          </tr>
                        ))}
                        {schoolHistoryModel.totals && (
                          <tr style={{ background: '#fef3c7', fontWeight: 700, color: '#78350f' }}>
                            <td colSpan={2} style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              {schoolHistoryModel.totals.label}
                            </td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{schoolHistoryModel.totals.kgText}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{schoolHistoryModel.totals.g1Text}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{schoolHistoryModel.totals.g2Text}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{schoolHistoryModel.totals.g3Text}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{schoolHistoryModel.totals.grandTotalText}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1' }}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  </ReportEditableZone>

                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="hist_signature"
                    label="កាលបរិច្ឆេទ & ហត្ថលេខា"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
                  <div
                    style={{
                      borderTop: '1px dashed #cbd5e1',
                      marginTop: 12,
                      paddingTop: 10,
                      textAlign: 'right',
                      fontSize: 12,
                      color: '#475569'
                    }}
                  >
                    <div>{schoolHistoryModel.lunarDateLine}</div>
                    <div>{schoolHistoryModel.solarDateLine}</div>
                    <div className="font-moul" style={{ marginTop: 4, color: '#0f172a' }}>
                      {schoolHistoryModel.signerTitle}
                    </div>
                  </div>
                  </ReportEditableZone>
                </div>
              </>
            ) : isMinistryActive ? (
              ministryDocType === 'summary' ? (
                <ReportEditableZone
                  editMode={canEdit && isEditing}
                  sectionId="min_stats"
                  label="តារាងសង្ខេប ១០ ជួរ"
                  activeSectionId={activeEditSection}
                  onSelectSection={handleSelectEditSection}
                >
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
                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="min_signature"
                    label="លេខលិខិត & ហត្ថលេខា"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
                    <div
                      style={{
                        borderTop: '1px dashed #cbd5e1',
                        marginTop: 12,
                        paddingTop: 10,
                        textAlign: 'right',
                        fontSize: 12,
                        color: '#475569'
                      }}
                    >
                      <div>{ministryModel.lunarDateLine}</div>
                      <div>{ministryModel.solarDateLine}</div>
                      <div className="font-moul" style={{ marginTop: 4, color: '#0f172a' }}>
                        {ministryModel.signerTitle} / {ministryModel.reporterTitle}
                      </div>
                    </div>
                  </ReportEditableZone>
                </div>
                </ReportEditableZone>
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

                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="min_stats"
                    label="ក. ព័ត៌មានទូទៅ"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
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
                  </ReportEditableZone>

                  {/* ខ. សកម្មភាពក្នុងសាលា */}
                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="min_in_school"
                    label="ខ. ក្នុងសាលា"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                    <div className="font-moul" style={{ fontSize: 13, color: '#0369a1', marginBottom: 8 }}>
                      ខ. សកម្មភាពនៅក្នុងសាលា
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginBottom: 4 }}>ខ.១. សកម្មភាពរបស់គ្រូ</div>
                    {(ministryModel.teacherActivities || []).map((line, i) => (
                      <div key={`mt-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                    ))}
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginTop: 8, marginBottom: 4 }}>ខ.២. សកម្មភាពសមណសិស្ស សិស្ស</div>
                    {(ministryModel.studentActivities || []).map((line, i) => (
                      <div key={`ms-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                    ))}
                  </div>
                  </ReportEditableZone>

                  {/* គ. សកម្មភាពក្រៅសាលា & ឃ. ព្រះគ្រូចៅអធិការ */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ReportEditableZone
                      editMode={canEdit && isEditing}
                      sectionId="min_outside"
                      label="គ. ក្រៅសាលា"
                      activeSectionId={activeEditSection}
                      onSelectSection={handleSelectEditSection}
                    >
                      <div className="font-moul" style={{ fontSize: 13, color: '#0369a1', marginBottom: 6 }}>គ. សកម្មភាពនៅក្រៅសាលា</div>
                      {(ministryModel.outsideActivities || []).map((line, i) => (
                        <div key={`mo-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                      ))}
                    </ReportEditableZone>
                    <ReportEditableZone
                      editMode={canEdit && isEditing}
                      sectionId="min_abbot"
                      label="ឃ. ព្រះចៅអធិការ"
                      activeSectionId={activeEditSection}
                      onSelectSection={handleSelectEditSection}
                    >
                      <div className="font-moul" style={{ fontSize: 13, color: '#92400e', marginBottom: 6 }}>ឃ.១. ការទទួលខុសត្រូវព្រះគ្រូចៅអធិការ</div>
                      {(ministryModel.abbotResponsibilities || []).map((line, i) => (
                        <div key={`ma-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                      ))}
                    </ReportEditableZone>
                  </div>

                  {/* ង. គណៈគ្រប់គ្រង បណ្ណាល័យ ជំនួយ */}
                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="min_management"
                    label="ង. គណៈគ្រប់គ្រង"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                    <div className="font-moul" style={{ fontSize: 13, color: '#0369a1', marginBottom: 6 }}>ង. សកម្មភាពគណៈគ្រប់គ្រង បណ្ណាល័យ & ជំនួយ</div>
                    {(ministryModel.managementActivities || []).map((line, i) => (
                      <div key={`mm-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                    ))}
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginTop: 8, marginBottom: 4 }}>ង.១. ពុទ្ធិកបណ្ណាល័យ</div>
                    {(ministryModel.libraryLines || []).map((line, i) => (
                      <div key={`ml-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                    ))}
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginTop: 8, marginBottom: 4 }}>ង.២. ការទទួលជំនួយពីសប្បុរសជន</div>
                    {(ministryModel.donationLines || []).map((line, i) => (
                      <div key={`md-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                    ))}
                  </div>
                  </ReportEditableZone>

                  <ReportEditableZone
                    editMode={canEdit && isEditing}
                    sectionId="min_finance"
                    label="ច. ហិរញ្ញវត្ថុ"
                    activeSectionId={activeEditSection}
                    onSelectSection={handleSelectEditSection}
                  >
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
                  </ReportEditableZone>

                  {/* ឆ. គ្រូ & សិស្ស + ជ-ឈ. បញ្ហា & ដំណោះស្រាយ */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ReportEditableZone
                      editMode={canEdit && isEditing}
                      sectionId="min_relations"
                      label="ឆ. គ្រូ & សិស្ស"
                      activeSectionId={activeEditSection}
                      onSelectSection={handleSelectEditSection}
                    >
                      <div className="font-moul" style={{ fontSize: 13, color: '#0369a1', marginBottom: 6 }}>ឆ. សកម្មភាពគ្រូជាមួយសមណសិស្ស</div>
                      {(ministryModel.teacherRelations || []).map((line, i) => (
                        <div key={`mr-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                      ))}
                    </ReportEditableZone>
                    <ReportEditableZone
                      editMode={canEdit && isEditing}
                      sectionId="min_challenges"
                      label="ជ-ឈ. បញ្ហា & ដំណោះស្រាយ"
                      activeSectionId={activeEditSection}
                      onSelectSection={handleSelectEditSection}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: '#991b1b', marginBottom: 4 }}>ជ. បញ្ហាប្រឈម</div>
                      {(ministryModel.challenges || []).map((line, i) => (
                        <div key={`mc-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                      ))}
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: '#15803d', marginTop: 8, marginBottom: 4 }}>ឈ. ដំណោះស្រាយ</div>
                      {(ministryModel.solutions || []).map((line, i) => (
                        <div key={`msol-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                      ))}
                    </ReportEditableZone>
                  </div>

                  {/* ញ-ដ. សន្និដ្ឋាន សំណូមពរ & ហត្ថលេខា/CC */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ReportEditableZone
                      editMode={canEdit && isEditing}
                      sectionId="min_conclusion"
                      label="ញ-ដ. សន្និដ្ឋាន & សំណូមពរ"
                      activeSectionId={activeEditSection}
                      onSelectSection={handleSelectEditSection}
                    >
                      <div className="font-moul" style={{ fontSize: 13, color: '#78350f', marginBottom: 6 }}>ញ. សេចក្ដីសន្និដ្ឋាន</div>
                      {(ministryModel.conclusionParas || []).map((p, i) =>
                        String(p || '').trim() ? (
                          <KhmerJustifiedText
                            key={`mconc-${i}`}
                            text={p}
                            firstLineIndent={24}
                            fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                            fontSize={12.5}
                            lineHeight={1.65}
                            style={{ color: '#334155', marginBottom: 6 }}
                          />
                        ) : (
                          <div key={`mconc-${i}`} aria-hidden="true" style={{ height: 14 }} />
                        )
                      )}
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: '#b45309', marginTop: 6, marginBottom: 4 }}>ដ. សំណូមពរ</div>
                      {(ministryModel.requests || []).map((line, i) => (
                        <div key={`mreq-${i}`} style={{ fontSize: 12.5, color: '#334155', marginBottom: 3 }}>- {line}</div>
                      ))}
                    </ReportEditableZone>
                    <ReportEditableZone
                      editMode={canEdit && isEditing}
                      sectionId="min_signature"
                      label="ហត្ថលេខា & CC"
                      activeSectionId={activeEditSection}
                      onSelectSection={handleSelectEditSection}
                    >
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, fontSize: 12, color: '#475569' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div>{ministryModel.lunarDateLine}</div>
                          <div>{ministryModel.solarDateLine}</div>
                          <div className="font-moul" style={{ marginTop: 4, color: '#0f172a' }}>
                            {ministryModel.signerTitle} / {ministryModel.reporterTitle}
                          </div>
                        </div>
                        {(ministryModel.ccList || []).length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 11.5 }}>
                            <div style={{ fontWeight: 700, color: '#334155', marginBottom: 2 }}>ចម្លងប្រគេនជូន៖</div>
                            {(ministryModel.ccList || []).map((cc, i) => (
                              <div key={`mcc-${i}`}>- {cc}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ReportEditableZone>
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
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="header"
                label="លេខ/អ្នកទទួល"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
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
              </ReportEditableZone>
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="subject_intro"
                label="កម្មវត្ថុ & សេចក្ដីផ្ដើម"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div className="font-moul" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 6 }}>
                របាយការណ៍បូកសរុបលទ្ធផលការងារ{displayModel.periodTitlePhrase}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.95, lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: 6 }}>
                {displayModel.subjectText}
              </div>
              {displayModel.introParagraph && (
                <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.55, whiteSpace: 'pre-line', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 6 }}>
                  {displayModel.introParagraph}
                </div>
              )}
              </ReportEditableZone>
            </div>

            {/* Combined Mode ONLY: Card I. សាវតារ */}
            {displayModel.includeHistory && displayModel.schoolHistory && (
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="history_bg"
                label="I. សាវតារ"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #bae6fd',
                  borderRadius: 12,
                  padding: 14
                }}
              >
                <div
                  className="font-moul"
                  style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Landmark size={16} />
                  <span>I. សាវតារ</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7 }}>
                  {(displayModel.schoolHistory.backgroundParagraphs || []).map((p, i) =>
                    String(p || '').trim() ? (
                      <KhmerJustifiedText
                        key={i}
                        text={p}
                        firstLineIndent={24}
                        fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        fontSize={12.5}
                        lineHeight={1.7}
                        style={{ margin: '0 0 8px', color: '#334155' }}
                      />
                    ) : (
                      <div key={i} aria-hidden="true" style={{ height: 14 }} />
                    )
                  )}
                </div>
              </div>
              </ReportEditableZone>
            )}

            {/* Card I & II (or II & III): គណៈគ្រប់គ្រង និងស្ថិតិសមណសិស្ស */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14
              }}
            >
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="management"
                label={`${displayModel.sectionNumbers?.management || 'I'}. តួនាទី និងភារកិច្ច`}
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div
                className="font-moul"
                style={{ fontSize: 13, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <BookOpen size={16} />
                <span>
                  {displayModel.sectionNumbers?.management || 'I'} & {displayModel.sectionNumbers?.stats || 'II'}. គណៈគ្រប់គ្រង និងស្ថិតិសមណសិស្ស
                </span>
              </div>
              {displayModel.section1Intro && (
                <KhmerJustifiedText
                  text={displayModel.section1Intro}
                  firstLineIndent={24}
                  fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  fontSize={12.5}
                  lineHeight={1.65}
                  style={{ color: '#475569', marginBottom: 8 }}
                />
              )}
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8 }}>
                {(displayModel.managementRoles || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <strong>{fmtNum(i + 1)}. {m.name}</strong> — {m.role}
                  </div>
                ))}
              </div>
              </ReportEditableZone>
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="stats"
                label={`${displayModel.sectionNumbers?.stats || 'II'}. ស្ថិតិ`}
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
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
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#92400e' }}>
                  ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ
                </div>
                {(displayModel.staffStats || []).map((line, i) => (
                  <div key={`mob-staff-${i}`} style={{ marginBottom: 3 }}>- {line}</div>
                ))}
                <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 4, color: '#92400e' }}>
                  ខ-ចំនួនថ្នាក់ សមណសិស្ស
                </div>
                {(displayModel.studentStatLines || []).map((line, i) => (
                  <div key={`mob-st-${i}`} style={{ marginBottom: 3 }}>- {line}</div>
                ))}
              </div>
              </ReportEditableZone>
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
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="activities"
                label="ក. សកម្មភាព"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
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
              </ReportEditableZone>

              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="admin_docs"
                label="ខ. លិខិតរដ្ឋបាល"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginBottom: 6 }}>
                ខ. ការងារគ្រប់គ្រង តាក់តែងលិខិតរដ្ឋបាល កំណត់ហេតុ និងរបាយការណ៍
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
              </ReportEditableZone>

              {/* Combined Mode ONLY: Editable Table Intro + 16-Year Human Resource Training Table (placed after ខ) */}
              {displayModel.includeHistory && displayModel.schoolHistory && (
                <ReportEditableZone
                  editMode={canEdit && isEditing}
                  sectionId="history_table"
                  label="គ. & តារាង ១៦ ឆ្នាំ"
                  activeSectionId={activeEditSection}
                  onSelectSection={handleSelectEditSection}
                >
                <div style={{ marginTop: 12 }}>
                  {displayModel.schoolHistory.tableIntro && (
                    <KhmerJustifiedText
                      text={displayModel.schoolHistory.tableIntro}
                      firstParagraphPrefixBold="គ."
                      firstLineIndent={22}
                      indentFirstParagraphOnly
                      fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      fontSize={12.5}
                      lineHeight={1.65}
                      style={{ marginBottom: 8, color: '#1e293b' }}
                    />
                  )}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
                          {['ល.រ', 'ឆ្នាំសិក្សា', 'មត្តេយ្យ', 'ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣', 'សរុប', 'ផ្សេងៗ'].map(h => (
                            <th key={h} style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(displayModel.schoolHistory.rows || []).map((r, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.no}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>{r.academicYearDisplay}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.kgText}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.g1Text}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.g2Text}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.g3Text}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#0c4a6e' }}>{r.totalText}</td>
                            <td style={{ padding: '5px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{r.note || ''}</td>
                          </tr>
                        ))}
                        {displayModel.schoolHistory.totals && (
                          <tr style={{ background: '#fef3c7', fontWeight: 700, color: '#78350f' }}>
                            <td colSpan={2} style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              {displayModel.schoolHistory.totals.label}
                            </td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{displayModel.schoolHistory.totals.kgText}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{displayModel.schoolHistory.totals.g1Text}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{displayModel.schoolHistory.totals.g2Text}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{displayModel.schoolHistory.totals.g3Text}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{displayModel.schoolHistory.totals.grandTotalText}</td>
                            <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1' }}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                </ReportEditableZone>
              )}

              {/* Appendix items (គ/ឃ & ឃ/ង) on Mobile Card */}
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="appendix"
                label="ឧបសម្ព័ន្ធ"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: 12.5, color: '#334155' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{displayModel.section3SubCHeading}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{displayModel.section3SubDHeading}</div>
                  {(displayModel.appendixItems || []).map((line, i) => (
                    <div key={`mob-appx-${i}`} style={{ paddingLeft: 10, marginBottom: 2 }}>- {line}</div>
                  ))}
                </div>
              </ReportEditableZone>
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
                <span>{displayModel.sectionNumbers?.challenges || 'IV'}. បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ</span>
              </div>

              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="challenges"
                label="១-បញ្ហាប្រឈម"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#991b1b', marginBottom: 4 }}>
                ១-បញ្ហាប្រឈម
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, lineHeight: 1.6 }}>
                {(displayModel.challenges || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
                ))}
              </div>
              </ReportEditableZone>

              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="solutions"
                label="២-ដំណោះស្រាយ"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#15803d', marginBottom: 4 }}>
                ២-ដំណោះស្រាយ
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, lineHeight: 1.6 }}>
                {(displayModel.solutions || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
                ))}
              </div>
              </ReportEditableZone>

              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="requests"
                label="៣-សំណូមពរ"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#b45309', marginBottom: 4 }}>
                ៣-សំណូមពរ
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                {(displayModel.requests || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
                ))}
              </div>
              </ReportEditableZone>
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
              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="directions"
                label={`${displayModel.sectionNumbers?.directions || 'V'}. ទិសដៅបន្ត`}
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div
                className="font-moul"
                style={{ fontSize: 13, color: '#15803d', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Compass size={16} />
                <span>{displayModel.sectionNumbers?.directions || 'V'}. ទិសដៅបន្ត</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 12, lineHeight: 1.6 }}>
                {(displayModel.directions || []).map((line, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>- {line}</div>
                ))}
              </div>
              </ReportEditableZone>

              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="conclusion"
                label={`${displayModel.sectionNumbers?.conclusion || 'VI'}. សន្និដ្ឋាន`}
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
              <div className="font-moul" style={{ fontSize: 13, color: '#78350f', marginBottom: 6 }}>
                {displayModel.sectionNumbers?.conclusion || 'VI'}. សន្និដ្ឋាន
              </div>
              <KhmerJustifiedText
                text={displayModel.conclusionText}
                firstLineIndent={24}
                fontFamily="'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                fontSize={12.5}
                lineHeight={1.6}
                style={{ color: '#334155', marginBottom: 8 }}
              />
              </ReportEditableZone>

              <ReportEditableZone
                editMode={canEdit && isEditing}
                sectionId="signature"
                label="កាលបរិច្ឆេទ & ហត្ថលេខា"
                activeSectionId={activeEditSection}
                onSelectSection={handleSelectEditSection}
              >
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
              </ReportEditableZone>
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
          {isHistoryOnly ? (
            <OfficialSchoolHistoryDocument
              id="printable-school-history-mobile-hidden"
              historyModel={schoolHistoryModel}
              useKhmerNumerals={useKhmerNumerals}
            />
          ) : isMinistryActive ? (
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
