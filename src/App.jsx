import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MonthSelector from './components/MonthSelector';
import TabNavigation from './components/TabNavigation';
import LeaveTableView from './components/LeaveTableView';
import FinanceTableView from './components/FinanceTableView';
import UploadSection from './components/UploadSection';
import SummaryTableView from './components/SummaryTableView';
import StudentMasterModal from './components/StudentMasterModal';
import ApiKeyModal from './components/ApiKeyModal';
import ReviewModal from './components/ReviewModal';

// Mobile-Dedicated Components (Rule: Strict PC vs Mobile Isolation)
import LeaveMobileView from './components/mobile/LeaveMobileView';
import FinanceMobileView from './components/mobile/FinanceMobileView';
import SummaryMobileView from './components/mobile/SummaryMobileView';
import MobileBottomNav from './components/mobile/MobileBottomNav';
import { useDeviceMode } from './utils/useDeviceMode';

import {
  loadAppState,
  saveAppState,
  exportBackup,
  importBackup,
  DEFAULT_GEMINI_KEYS,
  getStoredApiKey,
  setStoredApiKey,
  getGeminiKeyPool,
  setStoredApiKeyPool,
  parseApiKeyList,
  getOfflineQueue,
  saveOfflineQueue,
  getStoredTrainingDataset,
  saveTrainingSample,
  saveTrainingBatch,
  exportTrainingDataset,
  fetchCloudAppState,
  syncAppStateToCloud,
  subscribeToCloudAppState,
  fetchTrainingFromCloud,
  subscribeToCloudTraining
} from './utils/storage';
import {
  processUploadedImage,
  fileToBase64,
  autoOrientDocumentImage,
  classifyMobileCapture,
  rotateImageDataUrl,
  detectUprightRotationWithAI,
  compressImageForOCR,
  formatKhmerScanError
} from './utils/ocrService';
import { parseDurationShorthand, normalizeCurrency } from './utils/khmerNumerals';

export default function App() {
  // Device mode detection (Rule: Clean PC vs Mobile Separation)
  const { isMobile, isDesktop, overrideMode, setViewMode } = useDeviceMode();

  // 1. Central App State (Rule 7: Single State Mutator Guard)
  const [appState, setAppState] = useState(() => loadAppState());
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [queue, setQueue] = useState(() => getOfflineQueue());
  const [trainingCount, setTrainingCount] = useState(() => getStoredTrainingDataset().length);

  // Active view states
  const [activeTab, setActiveTab] = useState('leave'); // 'leave' | 'finance' | 'upload'
  const [isProcessing, setIsProcessing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('idle'); // 'idle' | 'connected' | 'syncing' | 'error'

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [reviewQueueItem, setReviewQueueItem] = useState(null);

  // Cloud-First Hydration & Echo Shield Guards (Rule 7: Single State Mutator Guard)
  // Prevents stale local storage from stomping/overwriting Supabase on initial refresh (Zombie Data fix)
  const isHydratedRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);

  // 1. Initial Cloud Sync on Mount & Realtime Subscription
  useEffect(() => {
    let isMounted = true;
    // Auto-load Training Dataset from Supabase cloud on startup (silent background)
    fetchTrainingFromCloud().then(merged => {
      if (isMounted && merged) {
        setTrainingCount(merged.length);
      }
    });

    fetchCloudAppState().then(cloudData => {
      if (!isMounted) return;
      if (cloudData && cloudData.leaves && cloudData.finance) {
        const existingCloudPool = parseApiKeyList(cloudData.meta?.geminiKeys);
        const mergedKeyPool = Array.from(new Set([
          ...existingCloudPool,
          ...DEFAULT_GEMINI_KEYS,
          ...parseApiKeyList(cloudData.meta?.geminiKey),
          ...parseApiKeyList(apiKey)
        ]));
        if (mergedKeyPool.length > 0) {
          setStoredApiKeyPool(mergedKeyPool);
          setApiKey(mergedKeyPool[0]);
          setStoredApiKey(mergedKeyPool[0]);
        }
        const cloudMeta = {
          ...appState.meta,
          ...(cloudData.meta || {}),
          geminiKey: mergedKeyPool[0] || cloudData.meta?.geminiKey || appState.meta?.geminiKey || apiKey || '',
          geminiKeys: mergedKeyPool.length > 0
            ? mergedKeyPool.join(',')
            : (cloudData.meta?.geminiKeys || appState.meta?.geminiKeys || '')
        };
        let needsCloudUpdate = mergedKeyPool.length > existingCloudPool.length;
        if (!cloudMeta.directorTitle || cloudMeta.directorTitle === 'ព្រះនាយក' || cloudMeta.directorTitle === 'ព្រះចៅអធិការ') {
          cloudMeta.directorTitle = 'នាយកសាលា';
          needsCloudUpdate = true;
        }
        const mergedState = {
          ...appState,
          ...cloudData,
          meta: cloudMeta
        };
        // Mark as remote update so debounced auto-sync does NOT push back to Supabase!
        isRemoteUpdateRef.current = true;
        setAppState(mergedState);
        saveAppState(mergedState); // Refresh local storage with true authoritative cloud data
        isHydratedRef.current = true;
        setCloudStatus('connected');
        if (needsCloudUpdate) {
          syncAppStateToCloud(mergedState).catch(e => console.warn('Sync updated cloud meta error:', e));
        }
      } else if (cloudData) {
        const seedPool = Array.from(new Set([
          ...parseApiKeyList(cloudData.meta?.geminiKeys),
          ...DEFAULT_GEMINI_KEYS,
          ...parseApiKeyList(cloudData.meta?.geminiKey),
          ...parseApiKeyList(apiKey)
        ]));
        if (seedPool.length > 0) {
          setStoredApiKeyPool(seedPool);
        }
        // Table exists but is completely empty: seed with initial state
        syncAppStateToCloud({
          ...appState,
          meta: {
            ...appState.meta,
            geminiKey: seedPool[0] || cloudData.meta?.geminiKey || apiKey || '',
            geminiKeys: seedPool.join(',')
          }
        }).then(ok => {
          if (isMounted) {
            isHydratedRef.current = true;
            setCloudStatus(ok ? 'connected' : 'idle');
          }
        });
      } else {
        // Offline or cloud unreachable: allow local operation
        isHydratedRef.current = true;
        setCloudStatus('idle');
      }
    }).catch(err => {
      console.warn('Initial cloud fetch error:', err);
      if (isMounted) {
        isHydratedRef.current = true;
      }
    });

    const unsubscribe = subscribeToCloudAppState((remoteState) => {
      if (remoteState && remoteState.leaves && remoteState.finance) {
        const remotePool = Array.from(new Set([
          ...parseApiKeyList(remoteState.meta?.geminiKeys),
          ...DEFAULT_GEMINI_KEYS,
          ...parseApiKeyList(remoteState.meta?.geminiKey)
        ]));
        if (remotePool.length > 0) {
          setStoredApiKeyPool(remotePool);
          setApiKey(remotePool[0]);
          setStoredApiKey(remotePool[0]);
        }
        // Mark as incoming remote update to prevent echo loop!
        isRemoteUpdateRef.current = true;
        setAppState(prev => {
          const mergedMeta = {
            ...prev.meta,
            ...(remoteState.meta || {}),
            geminiKey: remotePool[0] || remoteState.meta?.geminiKey || prev.meta?.geminiKey || '',
            geminiKeys: remotePool.length > 0
              ? remotePool.join(',')
              : (remoteState.meta?.geminiKeys || prev.meta?.geminiKeys || '')
          };
          if (!mergedMeta.directorTitle || mergedMeta.directorTitle === 'ព្រះនាយក' || mergedMeta.directorTitle === 'ព្រះចៅអធិការ') {
            mergedMeta.directorTitle = 'នាយកសាលា';
          }
          const merged = {
            ...prev,
            ...remoteState,
            meta: mergedMeta
          };
          saveAppState(merged); // Sync to device memory
          return merged;
        });
        setCloudStatus('connected');
      }
    });

    const unsubscribeTraining = subscribeToCloudTraining((remoteTraining) => {
      if (isMounted && Array.isArray(remoteTraining)) {
        setTrainingCount(remoteTraining.length);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeTraining();
    };
  }, []);

  // 2. Auto-save locally and debounce sync to Cloud (Guarded against Zombie overwrites)
  useEffect(() => {
    // 1. Always persist locally
    saveAppState(appState);

    // GUARD 1: If not yet hydrated from cloud, DO NOT sync to cloud (prevents stale localStorage stomping)
    if (!isHydratedRef.current) {
      return;
    }

    // GUARD 2: If this state change was caused by remote realtime or initial cloud fetch, DO NOT echo back!
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    // 2. Genuine user edit on this device: debounce sync to Cloud
    setCloudStatus('syncing');
    const timer = setTimeout(() => {
      const fullPool = getGeminiKeyPool();
      const stateToSync = {
        ...appState,
        meta: {
          ...appState.meta,
          geminiKey: apiKey || fullPool[0] || appState.meta?.geminiKey || '',
          geminiKeys: fullPool.length > 0 ? fullPool.join(',') : (appState.meta?.geminiKeys || '')
        }
      };
      syncAppStateToCloud(stateToSync).then(ok => {
        setCloudStatus(ok ? 'connected' : 'error');
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [appState, apiKey]);

  useEffect(() => {
    saveOfflineQueue(queue);
  }, [queue]);

  const currentMonthKey = appState.meta.currentMonth || '2026-07';
  const activeYear = (currentMonthKey || '2026-07').split('-')[0] || '2026';

  // Scoped available months for the currently selected activeYear
  const availableMonths = Array.from(new Set([
    ...Object.keys(appState.leaves).filter(k => k.startsWith(`${activeYear}-`)),
    ...Object.keys(appState.finance).filter(k => k.startsWith(`${activeYear}-`)),
    currentMonthKey
  ])).sort().reverse();

  // Compute Year Stats List for the Left School Logo Drawer (2027, 2026, 2025 + any custom year)
  const allYearKeys = Array.from(new Set([
    '2027',
    '2026',
    '2025',
    ...(appState.meta.availableYears || []),
    ...Object.keys(appState.leaves).map(k => k.split('-')[0]).filter(Boolean),
    ...Object.keys(appState.finance).map(k => k.split('-')[0]).filter(Boolean),
    activeYear
  ])).sort().reverse();

  const yearStatsList = allYearKeys.map(yr => {
    const monthKeysInYear = Array.from(new Set([
      ...Object.keys(appState.leaves).filter(k => k.startsWith(`${yr}-`)),
      ...Object.keys(appState.finance).filter(k => k.startsWith(`${yr}-`))
    ]));
    let leaveCount = 0;
    let financeCount = 0;
    let activeMonthsCount = 0;
    monthKeysInYear.forEach(mk => {
      const l = appState.leaves[mk]?.length || 0;
      const f = (appState.finance[mk]?.income?.length || 0) + (appState.finance[mk]?.expense?.length || 0);
      leaveCount += l;
      financeCount += f;
      if (l > 0 || f > 0) activeMonthsCount += 1;
    });
    return {
      year: yr,
      activeMonthsCount,
      leaveCount,
      financeCount
    };
  });

  const currentLeaves = appState.leaves[currentMonthKey] || [];
  const currentFinance = appState.finance[currentMonthKey] || { income: [], expense: [] };

  // 2. Central Mutator Functions
  const mutateLeaves = useCallback((updatedLeaves) => {
    setAppState(prev => ({
      ...prev,
      leaves: {
        ...prev.leaves,
        [currentMonthKey]: updatedLeaves
      }
    }));
  }, [currentMonthKey]);

  const mutateFinance = useCallback((updatedFinance) => {
    setAppState(prev => ({
      ...prev,
      finance: {
        ...prev.finance,
        [currentMonthKey]: updatedFinance
      }
    }));
  }, [currentMonthKey]);

  const mutateStudents = useCallback((updatedStudents) => {
    setAppState(prev => ({
      ...prev,
      studentMaster: updatedStudents
    }));
  }, []);

  const mutateMonth = useCallback((monthKey) => {
    setAppState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        currentMonth: monthKey
      }
    }));
  }, []);

  const mutateAddNewMonth = useCallback((newMonthKey) => {
    setAppState(prev => ({
      ...prev,
      leaves: {
        ...prev.leaves,
        [newMonthKey]: prev.leaves[newMonthKey] || []
      },
      finance: {
        ...prev.finance,
        [newMonthKey]: prev.finance[newMonthKey] || { income: [], expense: [] }
      },
      meta: {
        ...prev.meta,
        currentMonth: newMonthKey
      }
    }));
  }, []);

  const mutateToggleNumerals = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        useKhmerNumerals: !prev.meta.useKhmerNumerals
      }
    }));
  }, []);

  const mutateSelectYear = useCallback((targetYear) => {
    const cleanYr = String(targetYear || '').trim();
    if (!cleanYr) return;
    setAppState(prev => {
      const existingMonthsInYear = Array.from(new Set([
        ...Object.keys(prev.leaves || {}).filter(k => k.startsWith(`${cleanYr}-`)),
        ...Object.keys(prev.finance || {}).filter(k => k.startsWith(`${cleanYr}-`))
      ])).sort().reverse();

      const nextMonthKey = existingMonthsInYear[0] || `${cleanYr}-01`;
      const prevYears = Array.isArray(prev.meta?.availableYears) ? prev.meta.availableYears : [];
      const updatedYears = Array.from(new Set([...prevYears, cleanYr]));

      return {
        ...prev,
        leaves: {
          ...prev.leaves,
          [nextMonthKey]: prev.leaves[nextMonthKey] || []
        },
        finance: {
          ...prev.finance,
          [nextMonthKey]: prev.finance[nextMonthKey] || { income: [], expense: [] }
        },
        meta: {
          ...prev.meta,
          currentMonth: nextMonthKey,
          availableYears: updatedYears
        }
      };
    });
  }, []);

  // 3. Queue & Upload Actions (Concurrent-Safe Auto-Scan & Sequential Review Pipeline)
  const queueRef = useRef(queue);
  const isWorkerRunningRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const updateQueueSafe = useCallback((updater) => {
    setQueue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  }, []);

  const processQueueWorker = useCallback(async () => {
    if (isWorkerRunningRef.current) return;
    isWorkerRunningRef.current = true;
    setIsProcessing(true);

    try {
      // Non-blocking background cloud training fetch so image rotation starts at 0ms without network wait!
      let batchTrainingDataset = getStoredTrainingDataset();
      const cloudTrainingPromise = navigator.onLine
        ? Promise.race([
          fetchTrainingFromCloud().catch(() => null),
          new Promise(resolve => setTimeout(() => resolve(null), 900))
        ])
        : Promise.resolve(null);

      while (true) {
        // Pick next item that needs processing (status is 'pending')
        const currentList = queueRef.current || [];
        const nextItem = currentList.find(q => q.status === 'pending');
        if (!nextItem) break;

        const itemId = nextItem.id;
        const targetFile = nextItem.file;
        const targetDocType = nextItem.docTypeHint || 'auto';
        const oldBlobUrl = (nextItem.previewUrl && nextItem.previewUrl.startsWith('blob:')) ? nextItem.previewUrl : '';

        // 1. Mark this item as 'processing' with real start timestamp & stage so live countdown ticks immediately
        const startedAt = Date.now();
        updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
          ...q,
          status: 'processing',
          scanStartedAt: startedAt,
          scanStage: 'orient',
          error: null
        } : q));

        // 2. Orientation check:
        //    - Mobile (/mobile): instant on-device 2-format check (~0.1s, 0 Gemini calls, max 1800px!)
        //      * Format 1 (upright full page) -> keep 0°
        //      * Format 2 (sideways top-half) -> rotate 270°
        //      * Unknown (dark/blank/non-doc) -> reject immediately without calling Gemini
        //    - PC: existing AI 4-candidate orientation check
        let orientedDataUrl = nextItem.previewUrl;
        let preResolvedDocType = '';
        let preRouterError = '';
        let mobileRejectedEarly = false;
        // Mobile Format-2 (sideways) guard: remember the original photo so a receipt that was
        // wrongly rotated 270° (vertical table borders look like sideways text) can be restored after OCR.
        let mobileOriginalDataUrl = '';
        let mobileSidewaysRotated = false;
        let deferredBlobUrlToRevoke = '';
        try {
          if (targetFile) {
            const { dataUrl } = await fileToBase64(targetFile);
            if (isMobile) {
              const mobileCheck = await classifyMobileCapture(dataUrl, targetDocType);
              if (mobileCheck.format === 'unknown') {
                mobileRejectedEarly = true;
                const rejectMsg = targetDocType === 'leave'
                  ? 'ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ (រូបងងឹត ព្រិល ឬមិនមែនជាក្រដាសច្បាប់)។ សូមថតម្ដងទៀតតាមទម្រង់ទី ១ ឬទី ២។'
                  : 'ប្រព័ន្ធមិនអាចសម្គាល់ឯកសារបានទេ (រូបងងឹតខ្លាំង ឬព្រិលខ្លាំង)។ សូមថតឱ្យច្បាស់ម្ដងទៀត។';
                updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
                  ...q,
                  previewUrl: dataUrl,
                  status: 'unrecognized',
                  scanStage: null,
                  error: rejectMsg,
                  processedData: {
                    detectedType: targetDocType === 'finance' ? 'finance' : 'leave',
                    unrecognizedFormat: true,
                    unrecognizedReason: rejectMsg,
                    leaveItems: [],
                    financeItems: []
                  }
                } : q));
              } else if (mobileCheck?.dataUrl) {
                orientedDataUrl = mobileCheck.dataUrl;
                if (mobileCheck.format === 'sideways_half') {
                  mobileOriginalDataUrl = dataUrl;
                  mobileSidewaysRotated = true;
                  deferredBlobUrlToRevoke = oldBlobUrl;
                  updateQueueSafe(prev => prev.map(q => q.id === itemId ? { ...q, scanStage: 'ocr' } : q));
                } else {
                  updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
                    ...q,
                    previewUrl: orientedDataUrl,
                    scanStage: 'ocr'
                  } : q));
                  if (oldBlobUrl) {
                    try { URL.revokeObjectURL(oldBlobUrl); } catch { /* ignore */ }
                  }
                }
              }
            } else {
              const oriented = await autoOrientDocumentImage(dataUrl, targetDocType, apiKey);
              preResolvedDocType = oriented?.detectedDocType || '';
              preRouterError = oriented?.routerError || '';
              if (oriented?.dataUrl) {
                orientedDataUrl = oriented.dataUrl;
                updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
                  ...q,
                  previewUrl: orientedDataUrl,
                  scanStage: 'ocr'
                } : q));
                if (oldBlobUrl) {
                  try { URL.revokeObjectURL(oldBlobUrl); } catch { /* ignore */ }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Pre-orientation fallback for item', itemId, e);
        }

        if (mobileRejectedEarly) {
          continue;
        }

        // Resolve non-blocking cloud training dataset if ready
        try {
          const cloudMerged = await cloudTrainingPromise;
          if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
            batchTrainingDataset = cloudMerged;
          }
        } catch {
          // Keep local batchTrainingDataset
        }

        // 3. AI OCR Recognition (Isolated Leave vs Finance Engines)
        try {
          const res = await processUploadedImage(targetFile, {
            docTypeHint: targetDocType,
            resolvedDocType: preResolvedDocType,
            preRouterError,
            apiKey,
            studentMaster: appState.studentMaster,
            allLeaves: appState.leaves,
            preOrientedDataUrl: (orientedDataUrl && orientedDataUrl.startsWith('data:')) ? orientedDataUrl : '',
            isMobileCapture: isMobile,
            prefetchedTrainingDataset: batchTrainingDataset,
            onStageChange: (stage) => {
              updateQueueSafe(prev => prev.map(q => q.id === itemId ? { ...q, scanStage: stage } : q));
            }
          });

          // Receipt Orientation Restore: the local Mobile check rotated this photo 270° as a sideways
          // leave slip, but OCR says it is a finance receipt → pick the true upright angle from the ORIGINAL
          // photo (AI 4-candidate check), fallback to Gemini's own rotate hint, and never leave it sideways.
          let finalPreviewUrl = res.previewUrl || orientedDataUrl;
          const resolvedType = res.result?.detectedType;
          if (mobileSidewaysRotated && mobileOriginalDataUrl && resolvedType === 'finance') {
            try {
              const upright = await detectUprightRotationWithAI(mobileOriginalDataUrl, apiKey || getStoredApiKey());
              let restoreDegrees;
              if (upright) {
                restoreDegrees = upright.degrees;
              } else {
                const geminiHint = Number(res.result?.rotateClockwiseDegrees) || 0;
                restoreDegrees = [90, 180, 270].includes(geminiHint) ? (270 + geminiHint) % 360 : 0;
              }
              if (restoreDegrees === 0) {
                const compressed = await compressImageForOCR(mobileOriginalDataUrl, targetFile?.size || 0, 'image/jpeg');
                finalPreviewUrl = compressed?.dataUrl || mobileOriginalDataUrl;
              } else {
                const rotated = await rotateImageDataUrl(mobileOriginalDataUrl, restoreDegrees, 1800);
                finalPreviewUrl = rotated?.dataUrl || finalPreviewUrl;
              }
              console.log(`🧾 [Receipt Orientation Restore] finance receipt → upright at ${restoreDegrees}° (${upright ? 'AI' : 'hint'})`);
            } catch (orientErr) {
              console.warn('Receipt orientation restore failed, keeping scanned preview', orientErr);
            }
          }
          if (deferredBlobUrlToRevoke) {
            try { URL.revokeObjectURL(deferredBlobUrlToRevoke); } catch { /* ignore */ }
            deferredBlobUrlToRevoke = '';
          }

          const isUnrecognized = Boolean(isMobile && (res.unrecognizedFormat || res.result?.unrecognizedFormat));
          const unrecognizedReason = res.unrecognizedReason || res.result?.unrecognizedReason || '';
          const slimRawScan = res ? { ...res, previewUrl: undefined } : null;

          updateQueueSafe(prev => prev.map(q => {
            if (q.id !== itemId) return q;
            return {
              ...q,
              previewUrl: finalPreviewUrl || q.previewUrl,
              status: isUnrecognized ? 'unrecognized' : 'processed',
              scanStage: null,
              error: isUnrecognized ? unrecognizedReason : null,
              imageHash: res.imageHash || res.result?.imageHash || '',
              processedData: {
                ...(res.result || {}),
                unrecognizedFormat: isUnrecognized,
                unrecognizedReason,
                imageHash: res.imageHash || res.result?.imageHash || '',
                initialOcrName: res.result?.initialOcrName || res.result?.leaveItems?.[0]?.initialOcrName || '',
                initialFinanceItems: res.result?.initialFinanceItems || res.result?.financeItems || [],
                rawScan: slimRawScan
              }
            };
          }));
        } catch (err) {
          console.error('Error processing queue item', itemId, err);
          updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
            ...q,
            status: 'error',
            scanStage: null,
            error: formatKhmerScanError(err)
          } : q));
        }
      }
    } finally {
      isWorkerRunningRef.current = false;
      // If new pending items arrived while finishing, loop again
      const hasMorePending = (queueRef.current || []).some(q => q.status === 'pending');
      if (hasMorePending) {
        setTimeout(() => {
          processQueueWorker();
        }, 50);
      } else {
        setIsProcessing(false);
      }
    }
  }, [apiKey, appState.studentMaster, appState.leaves, isMobile, updateQueueSafe]);

  const handleAddToQueue = useCallback((files, docTypeHint) => {
    setActiveTab('upload');

    // Instantly enroll all files into queue with object URLs and pending status
    const newItems = files.map((file, idx) => ({
      id: `q-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      docTypeHint,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      processedData: null
    }));

    // Atomically prepend new items so user sees them appear immediately on top
    updateQueueSafe(prev => [...newItems, ...prev]);

    // Kick off worker safely
    setTimeout(() => {
      processQueueWorker();
    }, 10);
  }, [updateQueueSafe, processQueueWorker]);

  const handleRetakeQueueItem = useCallback((id, newFile) => {
    if (!newFile) return;
    updateQueueSafe(prev => prev.map(item => item.id === id ? {
      ...item,
      file: newFile,
      fileName: newFile.name,
      fileSize: newFile.size,
      previewUrl: URL.createObjectURL(newFile),
      status: 'pending',
      error: null,
      processedData: null
    } : item));

    setTimeout(() => {
      processQueueWorker();
    }, 10);
  }, [updateQueueSafe, processQueueWorker]);

  const handleRotateQueueItem = async (id, degreesClockwise = 90) => {
    const currentList = queueRef.current || queue;
    const target = currentList.find(q => q.id === id);
    if (!target || !target.previewUrl) return;

    try {
      const rotated = await rotateImageDataUrl(target.previewUrl, degreesClockwise);
      if (!rotated?.dataUrl) return;

      // Immediately update previewUrl so user sees the rotated image right away
      updateQueueSafe(prev => prev.map(item => item.id === id ? {
        ...item,
        previewUrl: rotated.dataUrl,
        status: 'processing',
        scanStartedAt: Date.now(),
        scanStage: 'ocr',
        error: null
      } : item));

      // Re-run OCR on the newly rotated upright image (skipOrientRetry: true so manual rotation is respected)
      const knownType = target.processedData?.detectedType;
      const effectiveRotateHint = (knownType === 'leave' || knownType === 'finance')
        ? knownType
        : target.docTypeHint;
      const res = await processUploadedImage(target.file, {
        docTypeHint: effectiveRotateHint,
        apiKey,
        studentMaster: appState.studentMaster,
        allLeaves: appState.leaves,
        preOrientedDataUrl: rotated.dataUrl,
        skipOrientRetry: true,
        isMobileCapture: isMobile,
        prefetchedTrainingDataset: getStoredTrainingDataset(),
        onStageChange: (stage) => {
          updateQueueSafe(prev => prev.map(item => item.id === id ? { ...item, scanStage: stage } : item));
        }
      });

      const slimRawScan = res ? { ...res, previewUrl: undefined } : null;

      updateQueueSafe(prev => prev.map(item => item.id === id ? {
        ...item,
        previewUrl: res.previewUrl || rotated.dataUrl,
        status: 'processed',
        scanStage: null,
        error: null,
        imageHash: res.imageHash || res.result?.imageHash || '',
        processedData: {
          ...(res.result || {}),
          unrecognizedFormat: false,
          unrecognizedReason: '',
          imageHash: res.imageHash || res.result?.imageHash || '',
          initialOcrName: res.result?.initialOcrName || res.result?.leaveItems?.[0]?.initialOcrName || '',
          initialFinanceItems: res.result?.initialFinanceItems || res.result?.financeItems || [],
          rawScan: slimRawScan
        }
      } : item));
    } catch (err) {
      console.error('Error rotating queue item:', err);
      updateQueueSafe(prev => prev.map(item => item.id === id ? {
        ...item,
        status: 'error',
        scanStage: null,
        error: formatKhmerScanError(err)
      } : item));
    }
  };

  const handleRemoveFromQueue = (id) => {
    updateQueueSafe(prev => prev.filter(item => item.id !== id));
  };

  const handleClearQueue = () => {
    updateQueueSafe([]);
  };

  const handleUpdateQueueItem = (id, updates) => {
    updateQueueSafe(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          ...updates
        };
      }
      return item;
    }));
  };

  const handleProcessQueue = useCallback(() => {
    processQueueWorker();
  }, [processQueueWorker]);

  const handleApproveQueueItem = ({ type, item, queueId, rawOcr, imagePreview, fileName, fileSize, imageHash }) => {
    // 1. Add to active monthly table
    let finalItem = item;
    if (type === 'leave') {
      let cleanDate = String(item.date || '').trim();
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-')) {
        const parts = cleanDate.split(/ដល់|-/);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      finalItem = { ...item, date: cleanDate };
      mutateLeaves([...currentLeaves, finalItem]);
    } else {
      const rawFinanceItems = rawOcr?.financeItems;
      if (Array.isArray(rawFinanceItems) && rawFinanceItems.length > 1) {
        let updatedFin = {
          ...currentFinance,
          income: [...(currentFinance.income || [])],
          expense: [...(currentFinance.expense || [])]
        };
        rawFinanceItems.forEach((f, idx) => {
          const sec = f.category === 'income' ? 'income' : 'expense';
          updatedFin[sec].push({
            id: `fin-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            category: sec,
            desc: f.desc?.trim() || 'ទំនិញ/សេវា',
            qty: f.qty || '1',
            unitPrice: Number(f.unitPrice) || 0,
            total: Number(f.total) || 0,
            currency: normalizeCurrency(f.currency),
            note: f.note || ''
          });
        });
        mutateFinance(updatedFin);
        finalItem = { items: rawFinanceItems };
      } else {
        const section = item.category === 'income' ? 'income' : 'expense';
        mutateFinance({
          ...currentFinance,
          [section]: [...(currentFinance[section] || []), item]
        });
      }
    }

    // 2. AI Flywheel: Harvest verified ground-truth training pair with Visual Fingerprint & Learned Corrections
    const resolvedHash = imageHash || rawOcr?.imageHash || rawOcr?.rawScan?.imageHash || '';
    const resolvedRawName = rawOcr?.initialOcrName || rawOcr?.leaveItems?.[0]?.initialOcrName || '';
    const resolvedRawFinanceItems = type === 'finance'
      ? (rawOcr?.initialFinanceItems || rawOcr?.rawScan?.result?.initialFinanceItems || rawOcr?.rawScan?.result?.financeItems || undefined)
      : undefined;
    const sample = {
      id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      fileName: fileName || 'sample',
      originalFileName: fileName || 'sample',
      fileSize: fileSize || rawOcr?.rawScan?.fileSize || undefined,
      imageHash: resolvedHash || undefined,
      rawOcrName: resolvedRawName || undefined,
      rawOcrFinanceItems: resolvedRawFinanceItems,
      docType: type,
      timestamp: new Date().toISOString(),
      rawOcr: rawOcr || null,
      groundTruth: finalItem,
      imagePreview: imagePreview || null
    };
    const updatedDataset = saveTrainingSample(sample);
    setTrainingCount(updatedDataset.length);

    // 3. Remove approved item from queue safely
    updateQueueSafe(prev => {
      const remainingQueue = prev.filter(q => q.id !== queueId);
      // 4. If all items in queue are approved, navigate to table tab
      if (remainingQueue.length === 0) {
        if (type === 'leave') {
          setActiveTab('leave');
        } else {
          setActiveTab('finance');
        }
      }
      return remainingQueue;
    });
  };

  const handleApproveSingleItem = (qItem) => {
    const type = qItem.processedData?.detectedType || qItem.docTypeHint || 'leave';
    const itemHash = qItem.imageHash || qItem.processedData?.imageHash || qItem.processedData?.rawScan?.imageHash || '';
    if (type === 'leave') {
      const l = qItem.processedData?.leaveItems?.[0] || {};
      handleApproveQueueItem({
        type: 'leave',
        item: {
          id: `leave-${Date.now()}`,
          name: l.name?.trim() || 'សមណសិស្ស',
          grade: l.grade || '៣',
          reason: l.reason || 'ការងារផ្ទាល់ខ្លួន',
          duration: parseDurationShorthand(l.duration) || '១ថ្ងៃ',
          date: l.date || new Date().toLocaleDateString('en-GB'),
          note: l.note || ''
        },
        queueId: qItem.id,
        rawOcr: qItem.processedData,
        imagePreview: qItem.previewUrl,
        fileName: qItem.fileName,
        fileSize: qItem.fileSize,
        imageHash: itemHash
      });
    } else {
      const f = qItem.processedData?.financeItems?.[0] || {};
      handleApproveQueueItem({
        type: 'finance',
        item: {
          id: `fin-${Date.now()}`,
          category: f.category || 'expense',
          desc: f.desc?.trim() || 'ទំនិញ/សេវា',
          qty: f.qty || '1',
          unitPrice: Number(f.unitPrice) || 0,
          total: Number(f.total) || 0,
          currency: normalizeCurrency(f.currency),
          note: f.note || ''
        },
        queueId: qItem.id,
        rawOcr: qItem.processedData,
        imagePreview: qItem.previewUrl,
        fileName: qItem.fileName,
        fileSize: qItem.fileSize,
        imageHash: itemHash
      });
    }
  };

  const handleApproveAllQueue = () => {
    const readyItems = queue.filter(q => q.status === 'processed');
    if (readyItems.length === 0) return;

    let newLeaves = [...currentLeaves];
    let newFinance = {
      ...currentFinance,
      income: [...(currentFinance.income || [])],
      expense: [...(currentFinance.expense || [])]
    };
    const batchSamples = [];

    readyItems.forEach(qItem => {
      const type = qItem.processedData?.detectedType || qItem.docTypeHint || 'leave';
      const itemHash = qItem.imageHash || qItem.processedData?.imageHash || qItem.processedData?.rawScan?.imageHash || '';
      const resolvedRawName = qItem.processedData?.initialOcrName || qItem.processedData?.leaveItems?.[0]?.initialOcrName || '';
      if (type === 'leave') {
        const l = qItem.processedData?.leaveItems?.[0] || {};
        let cleanDate = String(l.date || new Date().toLocaleDateString('en-GB')).trim();
        cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
        if (cleanDate.includes('ដល់') || cleanDate.includes('-')) {
          const parts = cleanDate.split(/ដល់|-/);
          if (parts[0] && parts[0].trim().length >= 6) {
            cleanDate = parts[0].trim();
          }
        }
        const leaveRecord = {
          id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: l.name?.trim() || 'សមណសិស្ស',
          grade: l.grade || '៣',
          reason: l.reason || 'ការងារផ្ទាល់ខ្លួន',
          duration: parseDurationShorthand(l.duration) || '១ថ្ងៃ',
          date: cleanDate,
          note: l.note || ''
        };
        newLeaves.push(leaveRecord);
        batchSamples.push({
          id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fileName: qItem.fileName,
          originalFileName: qItem.fileName,
          fileSize: qItem.fileSize,
          imageHash: itemHash || undefined,
          rawOcrName: resolvedRawName || undefined,
          docType: 'leave',
          timestamp: new Date().toISOString(),
          groundTruth: leaveRecord
        });
      } else {
        const rawFinanceItems = qItem.processedData?.financeItems;
        if (Array.isArray(rawFinanceItems) && rawFinanceItems.length > 0) {
          rawFinanceItems.forEach((f, fIdx) => {
            const cat = f.category === 'income' ? 'income' : 'expense';
            const finRecord = {
              id: `fin-${Date.now()}-${fIdx}-${Math.random().toString(36).substr(2, 5)}`,
              category: cat,
              desc: f.desc?.trim() || 'ទំនិញ/សេវា',
              qty: f.qty || '1',
              unitPrice: Number(f.unitPrice) || 0,
              total: Number(f.total) || 0,
              currency: normalizeCurrency(f.currency),
              note: f.note || ''
            };
            newFinance[cat].push(finRecord);
          });
          batchSamples.push({
            id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            fileName: qItem.fileName,
            originalFileName: qItem.fileName,
            fileSize: qItem.fileSize,
            imageHash: itemHash || undefined,
            rawOcrFinanceItems: qItem.processedData?.initialFinanceItems || qItem.processedData?.rawScan?.result?.financeItems || undefined,
            docType: 'finance',
            timestamp: new Date().toISOString(),
            groundTruth: { items: rawFinanceItems }
          });
        }
      }
    });

    const updatedDataset = saveTrainingBatch(batchSamples);
    mutateLeaves(newLeaves);
    mutateFinance(newFinance);
    setTrainingCount(updatedDataset.length);
    updateQueueSafe(prev => prev.filter(q => q.status !== 'processed'));
    setActiveTab('leave');
  };

  // 4. Backup & Restore
  const handleExportBackup = () => {
    exportBackup(appState);
  };

  const handleImportBackup = async (file) => {
    try {
      const restored = await importBackup(file);
      setAppState(restored);
      alert('បានបញ្ចូលទិន្នន័យបម្រុងទុកដោយជោគជ័យ!');
    } catch (err) {
      alert('មានបញ្ហាក្នុងការអាន File Backup: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="monastic-app">
      {/* Top Header */}
      <Header
        metadata={appState.meta}
        activeYear={activeYear}
        yearStatsList={yearStatsList}
        onSelectYear={mutateSelectYear}
        onAddYear={mutateSelectYear}
        studentCount={appState.studentMaster.length}
        trainingCount={trainingCount}
        hasApiKey={Boolean(apiKey || getGeminiKeyPool().length > 0)}
        cloudStatus={cloudStatus}
        onExportTrainingDataset={exportTrainingDataset}
        onOpenStudentMaster={() => setIsStudentModalOpen(true)}
        onOpenSettings={() => setIsApiKeyModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onPrint={handlePrint}
      />

      {/* Main Content Area */}
      <main className="app-container">
        {/* Month Selector Bar */}
        <MonthSelector
          currentMonth={currentMonthKey}
          availableMonths={availableMonths}
          onSelectMonth={mutateMonth}
          onAddNewMonth={mutateAddNewMonth}
          useKhmerNumerals={appState.meta.useKhmerNumerals}
          onToggleNumerals={mutateToggleNumerals}
        />

        {/* View Switcher Banner for Mobile users who manually forced PC view */}
        {overrideMode === 'desktop' && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#92400e'
          }}>
            <span>កំពុងមើលទម្រង់ <strong>PC A4 (Desktop View)</strong></span>
            <button
              onClick={() => setViewMode('auto')}
              style={{
                background: '#b45309',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📱 ប្ដូរមក Mobile វិញ
            </button>
          </div>
        )}

        {/* Desktop Tab Navigation (Hidden on Mobile since Mobile has bottom nav) */}
        {!isMobile && (
          <TabNavigation
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            leaveCount={currentLeaves.length}
            queueCount={queue.filter(q => q.status === 'pending').length}
            useKhmerNumerals={appState.meta.useKhmerNumerals}
          />
        )}

        {/* ======================================================== */}
        {/* VIEW 1: STUDENT LEAVE VIEW (PDF 2)                       */}
        {/* ======================================================== */}
        {activeTab === 'leave' && (
          isMobile ? (
            <LeaveMobileView
              records={currentLeaves}
              monthKey={currentMonthKey}
              metadata={appState.meta}
              useKhmerNumerals={appState.meta.useKhmerNumerals}
              studentMaster={appState.studentMaster}
              onUpdateRecords={mutateLeaves}
              onPrint={handlePrint}
              onSwitchToDesktop={() => setViewMode('desktop')}
            />
          ) : (
            <LeaveTableView
              records={currentLeaves}
              monthKey={currentMonthKey}
              metadata={appState.meta}
              useKhmerNumerals={appState.meta.useKhmerNumerals}
              studentMaster={appState.studentMaster}
              onUpdateRecords={mutateLeaves}
              onPrint={handlePrint}
            />
          )
        )}

        {/* ======================================================== */}
        {/* VIEW 2: FINANCE VIEW (PDF 1)                             */}
        {/* ======================================================== */}
        {activeTab === 'finance' && (
          isMobile ? (
            <FinanceMobileView
              financeData={currentFinance}
              monthKey={currentMonthKey}
              metadata={appState.meta}
              useKhmerNumerals={appState.meta.useKhmerNumerals}
              onUpdateFinance={mutateFinance}
              onPrint={handlePrint}
              onSwitchToDesktop={() => setViewMode('desktop')}
            />
          ) : (
            <FinanceTableView
              financeData={currentFinance}
              monthKey={currentMonthKey}
              metadata={appState.meta}
              useKhmerNumerals={appState.meta.useKhmerNumerals}
              onUpdateFinance={mutateFinance}
              onPrint={handlePrint}
            />
          )
        )}

        {/* ======================================================== */}
        {/* VIEW 3: UPLOAD & OCR SCANNER                             */}
        {/* ======================================================== */}
        {activeTab === 'upload' && (
          <UploadSection
            queue={queue}
            studentMaster={appState.studentMaster}
            allLeaves={appState.leaves}
            onAddToQueue={handleAddToQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
            onProcessQueue={handleProcessQueue}
            onUpdateQueueItem={handleUpdateQueueItem}
            onRotateQueueItem={handleRotateQueueItem}
            onRetakeQueueItem={handleRetakeQueueItem}
            onApproveItem={handleApproveSingleItem}
            onApproveAll={handleApproveAllQueue}
            isProcessing={isProcessing}
            isMobile={isMobile}
          />
        )}

        {/* ======================================================== */}
        {/* VIEW 4: MONTHLY & YEARLY SUMMARY ANALYTICS               */}
        {/* ======================================================== */}
        {activeTab === 'summary' && (
          isMobile ? (
            <SummaryMobileView
              currentMonthKey={currentMonthKey}
              allLeaves={appState.leaves}
              allFinance={appState.finance}
              studentMaster={appState.studentMaster}
              useKhmerNumerals={appState.meta.useKhmerNumerals}
              onSelectMonth={mutateMonth}
              onSelectYear={mutateSelectYear}
            />
          ) : (
            <SummaryTableView
              currentMonthKey={currentMonthKey}
              allLeaves={appState.leaves}
              allFinance={appState.finance}
              studentMaster={appState.studentMaster}
              useKhmerNumerals={appState.meta.useKhmerNumerals}
              onSelectMonth={mutateMonth}
              onSelectYear={mutateSelectYear}
            />
          )
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {isMobile && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          leaveCount={currentLeaves.length}
          queueCount={queue.filter(q => q.status === 'pending').length}
          useKhmerNumerals={appState.meta.useKhmerNumerals}
          isForcedDesktop={overrideMode === 'desktop'}
          onToggleViewMode={() => setViewMode(overrideMode === 'desktop' ? 'mobile' : 'desktop')}
        />
      )}

      {/* Modals */}
      <StudentMasterModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        students={appState.studentMaster}
        onUpdateStudents={mutateStudents}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={key => setApiKey(key)}
      />
    </div>
  );
}
