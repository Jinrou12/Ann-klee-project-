import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MonthSelector from './components/MonthSelector';
import TabNavigation from './components/TabNavigation';
import LeaveTableView from './components/LeaveTableView';
import FinanceTableView from './components/FinanceTableView';
import UploadSection from './components/UploadSection';
import StudentMasterModal from './components/StudentMasterModal';
import ApiKeyModal from './components/ApiKeyModal';
import ReviewModal from './components/ReviewModal';

// Mobile-Dedicated Components (Rule: Strict PC vs Mobile Isolation)
import LeaveMobileView from './components/mobile/LeaveMobileView';
import FinanceMobileView from './components/mobile/FinanceMobileView';
import MobileBottomNav from './components/mobile/MobileBottomNav';
import { useDeviceMode } from './utils/useDeviceMode';

import {
  loadAppState,
  saveAppState,
  exportBackup,
  importBackup,
  getStoredApiKey,
  setStoredApiKey,
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
  rotateImageDataUrl
} from './utils/ocrService';
import { parseDurationShorthand } from './utils/khmerNumerals';

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
        if (cloudData.meta?.geminiKey) {
          setApiKey(cloudData.meta.geminiKey);
          setStoredApiKey(cloudData.meta.geminiKey);
        }
        const cloudMeta = {
          ...appState.meta,
          ...(cloudData.meta || {}),
          geminiKey: cloudData.meta?.geminiKey || appState.meta?.geminiKey || apiKey || ''
        };
        let needsCloudUpdate = false;
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
          syncAppStateToCloud(mergedState).catch(e => console.warn('Sync updated director title error:', e));
        }
      } else if (cloudData) {
        // Table exists but is completely empty: seed with initial state
        syncAppStateToCloud({
          ...appState,
          meta: {
            ...appState.meta,
            geminiKey: cloudData.meta?.geminiKey || apiKey || ''
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
        if (remoteState.meta?.geminiKey) {
          setApiKey(remoteState.meta.geminiKey);
          setStoredApiKey(remoteState.meta.geminiKey);
        }
        // Mark as incoming remote update to prevent echo loop!
        isRemoteUpdateRef.current = true;
        setAppState(prev => {
          const mergedMeta = { ...prev.meta, ...(remoteState.meta || {}) };
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
      const stateToSync = {
        ...appState,
        meta: {
          ...appState.meta,
          geminiKey: apiKey || appState.meta?.geminiKey || ''
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
  const availableMonths = Array.from(new Set([
    ...Object.keys(appState.leaves),
    ...Object.keys(appState.finance),
    currentMonthKey
  ])).sort().reverse();

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
      while (true) {
        // Pick next item that needs processing (status is 'pending')
        const currentList = queueRef.current || [];
        const nextItem = currentList.find(q => q.status === 'pending');
        if (!nextItem) break;

        const itemId = nextItem.id;
        const targetFile = nextItem.file;
        const targetDocType = nextItem.docTypeHint || 'auto';

        // 1. Mark this item as 'processing' so it is never picked twice
        updateQueueSafe(prev => prev.map(q => q.id === itemId ? { ...q, status: 'processing' } : q));

        // 2. Pre-orientation check (AI 4-Candidate Auto-Orientation: 0/90/180/270 deg)
        let orientedDataUrl = nextItem.previewUrl;
        try {
          if (targetFile) {
            const { dataUrl } = await fileToBase64(targetFile);
            const oriented = await autoOrientDocumentImage(dataUrl, targetDocType, apiKey);
            if (oriented?.dataUrl) {
              orientedDataUrl = oriented.dataUrl;
              updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
                ...q,
                previewUrl: orientedDataUrl
              } : q));
            }
          }
        } catch (e) {
          console.warn('Pre-orientation fallback for item', itemId, e);
        }

        // 3. AI OCR Recognition
        try {
          const res = await processUploadedImage(targetFile, {
            docTypeHint: targetDocType,
            apiKey,
            studentMaster: appState.studentMaster,
            allLeaves: appState.leaves,
            preOrientedDataUrl: (orientedDataUrl && orientedDataUrl.startsWith('data:')) ? orientedDataUrl : ''
          });

          updateQueueSafe(prev => prev.map(q => {
            if (q.id !== itemId) return q;
            return {
              ...q,
              previewUrl: res.previewUrl || orientedDataUrl || q.previewUrl,
              status: 'processed',
              imageHash: res.imageHash || res.result?.imageHash || '',
              processedData: {
                ...(res.result || {}),
                imageHash: res.imageHash || res.result?.imageHash || '',
                initialOcrName: res.result?.initialOcrName || res.result?.leaveItems?.[0]?.initialOcrName || '',
                rawScan: res
              }
            };
          }));
        } catch (err) {
          console.error('Error processing queue item', itemId, err);
          updateQueueSafe(prev => prev.map(q => q.id === itemId ? {
            ...q,
            status: 'error',
            error: err.message || 'ការស្កេនបរាជ័យ'
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
  }, [apiKey, appState.studentMaster, appState.leaves, updateQueueSafe]);

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
        status: 'processing'
      } : item));

      // Re-run OCR on the newly rotated upright image
      const res = await processUploadedImage(target.file, {
        docTypeHint: target.docTypeHint,
        apiKey,
        studentMaster: appState.studentMaster,
        allLeaves: appState.leaves,
        preOrientedDataUrl: rotated.dataUrl
      });

      updateQueueSafe(prev => prev.map(item => item.id === id ? {
        ...item,
        previewUrl: rotated.dataUrl,
        status: 'processed',
        imageHash: res.imageHash || res.result?.imageHash || '',
        processedData: {
          ...(res.result || {}),
          imageHash: res.imageHash || res.result?.imageHash || '',
          initialOcrName: res.result?.initialOcrName || res.result?.leaveItems?.[0]?.initialOcrName || '',
          rawScan: res
        }
      } : item));
    } catch (err) {
      console.error('Error rotating queue item:', err);
      updateQueueSafe(prev => prev.map(item => item.id === id ? {
        ...item,
        status: 'error',
        error: err.message
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
      const section = item.category === 'income' ? 'income' : 'expense';
      mutateFinance({
        ...currentFinance,
        [section]: [...currentFinance[section], item]
      });
    }

    // 2. AI Flywheel: Harvest verified ground-truth training pair with Visual Fingerprint & Learned Name Correction
    const resolvedHash = imageHash || rawOcr?.imageHash || rawOcr?.rawScan?.imageHash || '';
    const resolvedRawName = rawOcr?.initialOcrName || rawOcr?.leaveItems?.[0]?.initialOcrName || '';
    const sample = {
      id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      fileName: fileName || 'sample',
      originalFileName: fileName || 'sample',
      fileSize: fileSize || rawOcr?.rawScan?.fileSize || undefined,
      imageHash: resolvedHash || undefined,
      rawOcrName: resolvedRawName || undefined,
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
        const f = qItem.processedData?.financeItems?.[0] || {};
        const cat = f.category === 'income' ? 'income' : 'expense';
        const finRecord = {
          id: `fin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: cat,
          desc: f.desc?.trim() || 'ទំនិញ/សេវា',
          qty: f.qty || '1',
          unitPrice: Number(f.unitPrice) || 0,
          total: Number(f.total) || 0,
          note: f.note || ''
        };
        newFinance[cat].push(finRecord);
        batchSamples.push({
          id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fileName: qItem.fileName,
          originalFileName: qItem.fileName,
          fileSize: qItem.fileSize,
          imageHash: itemHash || undefined,
          docType: 'finance',
          timestamp: new Date().toISOString(),
          groundTruth: finRecord
        });
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
        studentCount={appState.studentMaster.length}
        trainingCount={trainingCount}
        hasApiKey={Boolean(apiKey)}
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
            onApproveItem={handleApproveSingleItem}
            onApproveAll={handleApproveAllQueue}
            isProcessing={isProcessing}
            isMobile={isMobile}
          />
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
