import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import HangingBulletEditor from './HangingBulletEditor';
import SchoolHistoryEditorFields from './SchoolHistoryEditorFields';
import {
  DEFAULT_STAFF_STATS,
  DEFAULT_MANAGEMENT_ROLES,
  DEFAULT_SECTION1_INTRO,
  buildAutoStudentStatLines,
  buildAutoAdminDocLines
} from '../utils/adminReportBuilder';
import { MINISTRY_SEM1_MONTHS, MINISTRY_SEM2_MONTHS } from '../utils/ministryReportBuilder';

function cleanBulletLines(txt) {
  return String(txt || '')
    .split('\n')
    .map(s => s.replace(/^[-•❖▪◦\s]+/, '').trim())
    .filter(Boolean);
}

function formatLinesWithBullet(items = [], bullet = '-') {
  return (items || [])
    .map(s => String(s || '').replace(/^[-•❖▪◦\s]+/, '').trim())
    .filter(Boolean)
    .map(s => `${bullet} ${s}`)
    .join('\n');
}

const fieldLabelStyle = {
  fontSize: 12.5,
  fontWeight: 700,
  color: '#0f172a',
  display: 'block',
  marginBottom: 4
};

const inputBaseStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  boxSizing: 'border-box',
  background: '#ffffff'
};

const resetPillStyle = {
  background: '#ffffff',
  border: '1px solid #f59e0b',
  color: '#b45309',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0
};

/**
 * Focused Admin Report Section Editor (used inside ReportSectionDrawer on PC & Mobile /mp)
 */
export function AdminSectionEditorContent({
  sectionId,
  editDraft,
  setEditDraft,
  historyEditDraft,
  setHistoryEditDraft,
  displayModel,
  periodType,
  useKhmerNumerals,
  isMobile,
  fmtNum,
  buildDraftStudentStatsObj,
  buildDraftAdminDocsObj,
  onTotalStudentsChange,
  onGradeCountChange,
  onAdminDocCountChange
}) {
  if (!sectionId) return null;

  if (sectionId === 'history_bg') {
    return (
      <SchoolHistoryEditorFields
        draft={historyEditDraft}
        onChangeDraft={setHistoryEditDraft}
        showStandaloneMeta={false}
        sectionMode="background"
        isMobile={isMobile}
        fmtNum={fmtNum}
      />
    );
  }

  if (sectionId === 'history_table') {
    return (
      <SchoolHistoryEditorFields
        draft={historyEditDraft}
        onChangeDraft={setHistoryEditDraft}
        showStandaloneMeta={false}
        sectionMode="table"
        isMobile={isMobile}
        fmtNum={fmtNum}
      />
    );
  }

  if (!editDraft) return null;

  switch (sectionId) {
    case 'header':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>លេខលិខិត (ឧ. ......................ព.ប.ហ.ណ)</label>
            <input
              type="text"
              value={editDraft.docNumber ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, docNumber: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>ព្រះនាម / តួនាទីអ្នកទទួល (គោរពប្រគេន)</label>
            <input
              type="text"
              value={editDraft.recipientTitle ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, recipientTitle: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
        </div>
      );

    case 'subject_intro': {
      const subjectChanged =
        String(editDraft.subjectText || '').trim() !== String(displayModel.defaultAutoSubject || '').trim();
      const introChanged =
        String(editDraft.introParagraph || '').trim() !== String(displayModel.defaultAutoIntroParagraph || '').trim();
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(subjectChanged || introChanged) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() =>
                  setEditDraft(prev => ({
                    ...prev,
                    subjectText: displayModel.defaultAutoSubject || '',
                    introParagraph: displayModel.defaultAutoIntroParagraph || ''
                  }))
                }
                style={resetPillStyle}
              >
                ប្រើអត្ថបទដើមវិញ
              </button>
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>១. កម្មវត្ថុ៖ (អាចចុច Enter ចុះបន្ទាត់បាន)</label>
            <textarea
              rows={3}
              value={editDraft.subjectText ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, subjectText: e.target.value }))}
              placeholder={displayModel.defaultAutoSubject || ''}
              style={{ ...inputBaseStyle, lineHeight: 1.6, fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>២. សេចក្ដីផ្ដើម — សេចក្ដីដូចមានចែង... (អាចចុច Enter ចុះបន្ទាត់បាន)</label>
            <textarea
              rows={6}
              value={editDraft.introParagraph ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, introParagraph: e.target.value }))}
              placeholder={displayModel.defaultAutoIntroParagraph || ''}
              style={{ ...inputBaseStyle, lineHeight: 1.6, fontFamily: 'inherit' }}
            />
          </div>
        </div>
      );
    }

    case 'management': {
      const roles = Array.isArray(editDraft.managementRoles) ? editDraft.managementRoles : [];
      const handleRoleChange = (idx, field, val) => {
        setEditDraft(prev => ({
          ...prev,
          managementRoles: (prev.managementRoles || []).map((r, i) =>
            i === idx ? { ...r, [field]: val } : r
          )
        }));
      };
      const handleAddRole = () => {
        setEditDraft(prev => ({
          ...prev,
          managementRoles: [...(prev.managementRoles || []), { name: '', role: '' }]
        }));
      };
      const handleDeleteRole = (idx) => {
        setEditDraft(prev => ({
          ...prev,
          managementRoles: (prev.managementRoles || []).filter((_, i) => i !== idx)
        }));
      };
      const introChanged =
        String(editDraft.section1Intro || '').trim() !== String(DEFAULT_SECTION1_INTRO).trim();
      const rolesChanged = JSON.stringify(roles) !== JSON.stringify(DEFAULT_MANAGEMENT_ROLES);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(introChanged || rolesChanged) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() =>
                  setEditDraft(prev => ({
                    ...prev,
                    section1Intro: DEFAULT_SECTION1_INTRO,
                    managementRoles: DEFAULT_MANAGEMENT_ROLES.map(r => ({ ...r }))
                  }))
                }
                style={resetPillStyle}
              >
                ប្រើអត្ថបទដើមវិញ
              </button>
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>កថាខណ្ឌផ្ដើម (ផ្អែកតាមប្រកាសលេខ...)</label>
            <textarea
              rows={5}
              value={editDraft.section1Intro ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, section1Intro: e.target.value }))}
              style={{ ...inputBaseStyle, lineHeight: 1.65, fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 6
              }}
            >
              <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>
                បញ្ជីគណៈគ្រប់គ្រង និងតួនាទី ({fmtNum(roles.length)} រូប)
              </label>
              <button
                type="button"
                onClick={handleAddRole}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 7,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} />
                <span>បន្ថែមឈ្មោះ</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 9,
                    padding: 9,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>
                      សមាជិកទី {fmtNum(idx + 1)}
                    </span>
                    <button
                      type="button"
                      disabled={roles.length <= 1}
                      onClick={() => handleDeleteRole(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: roles.length <= 1 ? '#cbd5e1' : '#dc2626',
                        cursor: roles.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: 2
                      }}
                      title="លុបសមាជិកនេះ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="ព្រះនាម / ឈ្មោះ (ឧ. ភិក្ខុ អ៊ាន់ ឃ្លី)"
                    value={m.name ?? ''}
                    onChange={e => handleRoleChange(idx, 'name', e.target.value)}
                    style={inputBaseStyle}
                  />
                  <input
                    type="text"
                    placeholder="តួនាទី (ឧ. ជានាយករងទទួលបន្ទុករដ្ឋបាល)"
                    value={m.role ?? ''}
                    onChange={e => handleRoleChange(idx, 'role', e.target.value)}
                    style={inputBaseStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'stats': {
      const autoStudentLinesForDraft = buildAutoStudentStatLines({
        periodType,
        studentStats: buildDraftStudentStatsObj(editDraft),
        useKhmerNumerals
      });
      const staffChanged =
        JSON.stringify(cleanBulletLines(editDraft.staffStatsText)) !== JSON.stringify(DEFAULT_STAFF_STATS);
      const studentLinesChanged =
        JSON.stringify(cleanBulletLines(editDraft.studentStatLinesText)) !==
        JSON.stringify(autoStudentLinesForDraft);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quick 5 student numbers (auto-sync with ខ- box below) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 10
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              ប្រអប់លេខរហ័ស (ប្ដូរលេខ ប្រអប់ ខ- ខាងក្រោមនឹង Sync ស្វ័យប្រវត្តិ)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: 8
              }}
            >
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                  សមណសិស្សសរុប
                </label>
                <input
                  type="number"
                  value={editDraft.totalStudents}
                  onChange={e => onTotalStudentsChange(e.target.value)}
                  style={{ ...inputBaseStyle, padding: '6px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                  ថ្នាក់មត្តេយ្យ
                </label>
                <input
                  type="number"
                  value={editDraft.gradeKindergarten}
                  onChange={e => onGradeCountChange('gradeKindergarten', e.target.value)}
                  style={{ ...inputBaseStyle, padding: '6px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                  ថ្នាក់ទី១
                </label>
                <input
                  type="number"
                  value={editDraft.grade1}
                  onChange={e => onGradeCountChange('grade1', e.target.value)}
                  style={{ ...inputBaseStyle, padding: '6px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                  ថ្នាក់ទី២
                </label>
                <input
                  type="number"
                  value={editDraft.grade2}
                  onChange={e => onGradeCountChange('grade2', e.target.value)}
                  style={{ ...inputBaseStyle, padding: '6px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                  ថ្នាក់ទី៣
                </label>
                <input
                  type="number"
                  value={editDraft.grade3}
                  onChange={e => onGradeCountChange('grade3', e.target.value)}
                  style={{ ...inputBaseStyle, padding: '6px 8px' }}
                />
              </div>
            </div>
          </div>

          {/* ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <label style={{ ...fieldLabelStyle, marginBottom: 0, color: '#78350f' }}>
                ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              {staffChanged && (
                <button
                  type="button"
                  onClick={() =>
                    setEditDraft(prev => ({
                      ...prev,
                      staffStatsText: formatLinesWithBullet(DEFAULT_STAFF_STATS, '-')
                    }))
                  }
                  style={resetPillStyle}
                >
                  ប្រើអត្ថបទដើមវិញ
                </button>
              )}
            </div>
            <HangingBulletEditor
              rows={4}
              bullet="-"
              value={editDraft.staffStatsText}
              onChange={nextVal => setEditDraft(prev => ({ ...prev, staffStatsText: nextVal }))}
            />
          </div>

          {/* ខ-ចំនួនថ្នាក់ សមណសិស្ស */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <label style={{ ...fieldLabelStyle, marginBottom: 0, color: '#78350f' }}>
                ខ-ចំនួនថ្នាក់ សមណសិស្ស (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              {studentLinesChanged && (
                <button
                  type="button"
                  onClick={() =>
                    setEditDraft(prev => ({
                      ...prev,
                      studentStatLinesText: formatLinesWithBullet(autoStudentLinesForDraft, '-')
                    }))
                  }
                  style={resetPillStyle}
                >
                  កំណត់តាមលេខស្វ័យប្រវត្តិវិញ
                </button>
              )}
            </div>
            <HangingBulletEditor
              rows={6}
              bullet="-"
              value={editDraft.studentStatLinesText}
              onChange={nextVal => setEditDraft(prev => ({ ...prev, studentStatLinesText: nextVal }))}
            />
          </div>
        </div>
      );
    }

    case 'activities':
      return (
        <div>
          <label style={fieldLabelStyle}>
            {displayModel.section3SubAHeading || 'ក. សកម្មភាពការងារ'} (❖ ចុច Enter ចុះបន្ទាត់ថ្មី)
          </label>
          <HangingBulletEditor
            rows={10}
            maxHeight={460}
            bullet="❖"
            value={editDraft.activitiesText}
            onChange={nextVal => setEditDraft(prev => ({ ...prev, activitiesText: nextVal }))}
          />
        </div>
      );

    case 'admin_docs': {
      const autoAdminDocLinesForDraft = buildAutoAdminDocLines({
        adminDocs: buildDraftAdminDocsObj(editDraft),
        useKhmerNumerals
      });
      const adminDocLinesChanged =
        JSON.stringify(cleanBulletLines(editDraft.adminDocLinesText)) !==
        JSON.stringify(autoAdminDocLinesForDraft);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 10,
              padding: 10
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0c4a6e', marginBottom: 8 }}>
              ប្រអប់លេខរហ័ស (ប្ដូរលេខ អត្ថបទខាងក្រោមនឹង Sync ស្វ័យប្រវត្តិ)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: 8
              }}
            >
              {[
                { key: 'outgoingLetters', label: 'លិខិតចេញ (ច្បាប់)' },
                { key: 'incomingLetters', label: 'លិខិតចូល (ច្បាប់)' },
                { key: 'schoolMinutes', label: 'កំណត់ហេតុប្រជុំ (ច្បាប់)' },
                { key: 'schoolReportsToMinistry', label: 'របាយការណ៍ទៅមន្ទីរ' },
                { key: 'ministryMeetings', label: 'ប្រជុំក្នុងមន្ទីរ (លើក)' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 3 }}>
                    {f.label}
                  </label>
                  <input
                    type="number"
                    value={editDraft[f.key]}
                    onChange={e => onAdminDocCountChange(f.key, e.target.value)}
                    style={{ ...inputBaseStyle, padding: '6px 8px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>
                អត្ថបទលម្អិត (- ចុច Enter ចុះបន្ទាត់ថ្មី)
              </label>
              {adminDocLinesChanged && (
                <button
                  type="button"
                  onClick={() =>
                    setEditDraft(prev => ({
                      ...prev,
                      adminDocLinesText: formatLinesWithBullet(autoAdminDocLinesForDraft, '-')
                    }))
                  }
                  style={{ ...resetPillStyle, borderColor: '#0284c7', color: '#0369a1' }}
                >
                  កំណត់តាមលេខស្វ័យប្រវត្តិវិញ
                </button>
              )}
            </div>
            <HangingBulletEditor
              rows={8}
              maxHeight={380}
              bullet="-"
              value={editDraft.adminDocLinesText}
              onChange={nextVal => setEditDraft(prev => ({ ...prev, adminDocLinesText: nextVal }))}
            />
          </div>
        </div>
      );
    }

    case 'appendix':
      return (
        <div>
          <label style={fieldLabelStyle}>
            បញ្ជីចំណាយឧបសម្ព័ន្ធ ({displayModel.section3SubDHeading}) (- ចុច Enter ចុះបន្ទាត់ថ្មី)
          </label>
          <HangingBulletEditor
            rows={6}
            bullet="-"
            value={editDraft.appendixText}
            onChange={nextVal => setEditDraft(prev => ({ ...prev, appendixText: nextVal }))}
          />
        </div>
      );

    case 'challenges':
      return (
        <div>
          <label style={fieldLabelStyle}>១-បញ្ហាប្រឈម (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={9}
            maxHeight={420}
            bullet="-"
            value={editDraft.challengesText}
            onChange={nextVal => setEditDraft(prev => ({ ...prev, challengesText: nextVal }))}
          />
        </div>
      );

    case 'solutions':
      return (
        <div>
          <label style={fieldLabelStyle}>២-ដំណោះស្រាយ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={8}
            maxHeight={420}
            bullet="-"
            value={editDraft.solutionsText}
            onChange={nextVal => setEditDraft(prev => ({ ...prev, solutionsText: nextVal }))}
          />
        </div>
      );

    case 'requests':
      return (
        <div>
          <label style={fieldLabelStyle}>៣-សំណូមពរ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={8}
            maxHeight={420}
            bullet="-"
            value={editDraft.requestsText}
            onChange={nextVal => setEditDraft(prev => ({ ...prev, requestsText: nextVal }))}
          />
        </div>
      );

    case 'directions':
      return (
        <div>
          <label style={fieldLabelStyle}>ទិសដៅបន្ត (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={9}
            maxHeight={420}
            bullet="-"
            value={editDraft.directionsText}
            onChange={nextVal => setEditDraft(prev => ({ ...prev, directionsText: nextVal }))}
          />
        </div>
      );

    case 'conclusion':
      return (
        <div>
          <label style={fieldLabelStyle}>សេចក្ដីសន្និដ្ឋាន (អាចចុច Enter ចុះបន្ទាត់បាន)</label>
          <textarea
            rows={9}
            value={editDraft.conclusionText ?? ''}
            onChange={e => setEditDraft(prev => ({ ...prev, conclusionText: e.target.value }))}
            style={{ ...inputBaseStyle, lineHeight: 1.68, fontFamily: 'inherit' }}
          />
        </div>
      );

    case 'signature':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>កាលបរិច្ឆេទច័ន្ទគតិ</label>
            <input
              type="text"
              value={editDraft.lunarDateLine ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, lunarDateLine: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>កាលបរិច្ឆេទសុរិយគតិ</label>
            <input
              type="text"
              value={editDraft.solarDateLine ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, solarDateLine: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>តួនាទីអ្នកចុះហត្ថលេខា</label>
            <input
              type="text"
              value={editDraft.signerTitle ?? ''}
              onChange={e => setEditDraft(prev => ({ ...prev, signerTitle: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

/**
 * Focused Standalone School History Section Editor
 */
export function HistorySectionEditorContent({
  sectionId,
  historyEditDraft,
  setHistoryEditDraft,
  isMobile,
  fmtNum
}) {
  if (!sectionId || !historyEditDraft) return null;
  const modeMap = {
    hist_title: 'title',
    hist_bg: 'background',
    hist_table: 'table',
    hist_signature: 'signature'
  };
  return (
    <SchoolHistoryEditorFields
      draft={historyEditDraft}
      onChangeDraft={setHistoryEditDraft}
      showStandaloneMeta={true}
      sectionMode={modeMap[sectionId] || 'all'}
      isMobile={isMobile}
      fmtNum={fmtNum}
    />
  );
}

/**
 * Focused Ministry Annual Report Section Editor (Full A4 & 1-Page Summary)
 */
export function MinistrySectionEditorContent({
  sectionId,
  ministryEditDraft,
  setMinistryEditDraft,
  ministryDocType,
  isMobile
}) {
  if (!sectionId || !ministryEditDraft) return null;

  switch (sectionId) {
    case 'min_stats':
      return (
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
            កែស្ថិតិសិស្ស គ្រូបង្រៀន ការប្រឡង និងកុំព្យូទ័រ (ស៊ីសង្វាក់គ្នាទាំងទម្រង់ពេញ និងតារាងសង្ខេប ១០ ជួរ)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: 10
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
              { key: 'computerNoteText', label: 'សម្គាល់កុំព្យូទ័រ', type: 'text' }
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={ministryEditDraft[f.key] ?? ''}
                  onChange={e =>
                    setMinistryEditDraft(prev => ({ ...prev, [f.key]: e.target.value }))
                  }
                  style={{ ...inputBaseStyle, padding: '6px 8px', fontSize: 12.5 }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case 'min_in_school':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>ខ.១. សកម្មភាពរបស់គ្រូ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={6}
              bullet="-"
              value={ministryEditDraft.teacherActivitiesText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, teacherActivitiesText: nextVal }))}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>ខ.២. សកម្មភាពសមណសិស្ស សិស្ស (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={6}
              bullet="-"
              value={ministryEditDraft.studentActivitiesText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, studentActivitiesText: nextVal }))}
            />
          </div>
        </div>
      );

    case 'min_outside':
      return (
        <div>
          <label style={fieldLabelStyle}>គ. សកម្មភាពនៅក្រៅសាលា (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={8}
            maxHeight={420}
            bullet="-"
            value={ministryEditDraft.outsideActivitiesText || ''}
            onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, outsideActivitiesText: nextVal }))}
          />
        </div>
      );

    case 'min_abbot':
      return (
        <div>
          <label style={fieldLabelStyle}>ឃ.១. ការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={8}
            maxHeight={420}
            bullet="-"
            value={ministryEditDraft.abbotResponsibilitiesText || ''}
            onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, abbotResponsibilitiesText: nextVal }))}
          />
        </div>
      );

    case 'min_management':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>ង. សកម្មភាពគណៈគ្រប់គ្រង (រួមទាំងព្រឹត្តិការណ៍ពិសេស)</label>
            <HangingBulletEditor
              rows={6}
              bullet="-"
              value={ministryEditDraft.managementActivitiesText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, managementActivitiesText: nextVal }))}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>ង.១. ពុទ្ធិកបណ្ណាល័យ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={5}
              bullet="-"
              value={ministryEditDraft.libraryLinesText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, libraryLinesText: nextVal }))}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>ង.២. ការទទួលជំនួយពីសប្បុរសជន (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={4}
              bullet="-"
              value={ministryEditDraft.donationLinesText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, donationLinesText: nextVal }))}
            />
          </div>
        </div>
      );

    case 'min_finance':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: '#92400e', marginBottom: 6 }}>
              ១. ចំណូលប្រាក់ម៉ោងតាមខែ (៛) — ទុកទទេ ឬដាក់ 0 បើគ្មាន (ចំណាយ និងចំនួនម៉ោងទាញស្វ័យប្រវត្តិពីផ្ទាំងចំណូលចំណាយ)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                gap: 8,
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
                      setMinistryEditDraft(prev => ({
                        ...prev,
                        hourlyIncomeByMonth: {
                          ...(prev.hourlyIncomeByMonth || {}),
                          [m.num]: e.target.value
                        }
                      }))
                    }
                    style={{ ...inputBaseStyle, padding: '6px 8px', borderColor: '#fcd34d', fontSize: 12.5 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0c4a6e', marginBottom: 6 }}>
              ២. ចំណូល-ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ (៛)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 10,
                background: '#f8fafc',
                padding: 12,
                borderRadius: 10,
                border: '1px solid #e2e8f0'
              }}
            >
              {[
                { key: 'awardCeremonyIncome1', label: 'ចំណូលចែកបណ្ណសរសើរ (៛)' },
                { key: 'awardCeremonyIncome2', label: 'ចំណូលពីវត្ត-បណ្ណសរសើរ (៛)' },
                { key: 'awardCeremonyExpense', label: 'ចំណាយចែកបណ្ណសរសើរ (៛)' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    {f.label}
                  </label>
                  <input
                    type="number"
                    value={ministryEditDraft[f.key] ?? ''}
                    onChange={e =>
                      setMinistryEditDraft(prev => ({ ...prev, [f.key]: e.target.value }))
                    }
                    style={{ ...inputBaseStyle, padding: '6px 8px', fontSize: 12.5 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'min_relations':
      return (
        <div>
          <label style={fieldLabelStyle}>ឆ. សកម្មភាពគ្រូបង្រៀនជាមួយសមណសិស្ស (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
          <HangingBulletEditor
            rows={8}
            maxHeight={420}
            bullet="-"
            value={ministryEditDraft.teacherRelationsText || ''}
            onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, teacherRelationsText: nextVal }))}
          />
        </div>
      );

    case 'min_challenges':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>ជ. បញ្ហាប្រឈម (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={6}
              bullet="-"
              value={ministryEditDraft.challengesText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, challengesText: nextVal }))}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>ឈ. ដំណោះស្រាយ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={6}
              bullet="-"
              value={ministryEditDraft.solutionsText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, solutionsText: nextVal }))}
            />
          </div>
        </div>
      );

    case 'min_conclusion':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>ញ. សេចក្ដីសន្និដ្ឋាន (ចុច Enter ដើម្បីចុះកថាខណ្ឌថ្មី)</label>
            <textarea
              rows={6}
              value={ministryEditDraft.conclusionParasText || ''}
              onChange={e =>
                setMinistryEditDraft(prev => ({ ...prev, conclusionParasText: e.target.value }))
              }
              style={{ ...inputBaseStyle, lineHeight: 1.65, fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>ដ. សំណូមពរ (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
            <HangingBulletEditor
              rows={5}
              bullet="-"
              value={ministryEditDraft.requestsText || ''}
              onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, requestsText: nextVal }))}
            />
          </div>
        </div>
      );

    case 'min_signature':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>លេខលិខិត</label>
            <input
              type="text"
              value={ministryEditDraft.docNumber ?? ''}
              onChange={e => setMinistryEditDraft(prev => ({ ...prev, docNumber: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>កាលបរិច្ឆេទច័ន្ទគតិ</label>
            <input
              type="text"
              value={ministryEditDraft.lunarDateLine ?? ''}
              onChange={e => setMinistryEditDraft(prev => ({ ...prev, lunarDateLine: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>កាលបរិច្ឆេទសុរិយគតិ</label>
            <input
              type="text"
              value={ministryEditDraft.solarDateLine ?? ''}
              onChange={e => setMinistryEditDraft(prev => ({ ...prev, solarDateLine: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>តួនាទីអ្នកធ្វើរបាយការណ៍</label>
            <input
              type="text"
              value={ministryEditDraft.reporterTitle ?? ''}
              onChange={e => setMinistryEditDraft(prev => ({ ...prev, reporterTitle: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>តួនាទីអ្នកចុះហត្ថលេខា (ព្រះនាយក)</label>
            <input
              type="text"
              value={ministryEditDraft.signerTitle ?? ''}
              onChange={e => setMinistryEditDraft(prev => ({ ...prev, signerTitle: e.target.value }))}
              style={inputBaseStyle}
            />
          </div>
          {ministryDocType !== 'summary' && (
            <div>
              <label style={fieldLabelStyle}>ចម្លងប្រគេនជូន (CC) (- ចុច Enter ចុះបន្ទាត់ថ្មី)</label>
              <HangingBulletEditor
                rows={4}
                bullet="-"
                value={ministryEditDraft.ccListText || ''}
                onChange={nextVal => setMinistryEditDraft(prev => ({ ...prev, ccListText: nextVal }))}
              />
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

