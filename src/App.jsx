import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MonthSelector from './components/MonthSelector';
import TabNavigation from './components/TabNavigation';
import LeaveTableView from './components/LeaveTableView';
import FinanceTableView from './components/FinanceTableView';
import UploadSection from './components/UploadSection';
import StudentMasterModal from './components/StudentMasterModal';
import ApiKeyModal from './components/ApiKeyModal';
import ReviewModal from './components/ReviewModal';

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
  exportTrainingDataset,
  fetchCloudAppState,
  syncAppStateToCloud,
  subscribeToCloudAppState,
  fetchTrainingFromCloud
} from './utils/storage';
import { processUploadedImage } from './utils/ocrService';

export default function App() {
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
      if (cloudData) {
        if (cloudData.meta?.geminiKey) {
          setApiKey(cloudData.meta.geminiKey);
          setStoredApiKey(cloudData.meta.geminiKey);
        }
        if (cloudData.leaves && cloudData.finance) {
          setAppState(prev => ({
            ...prev,
            ...cloudData,
            meta: {
              ...prev.meta,
              ...(cloudData.meta || {}),
              geminiKey: cloudData.meta?.geminiKey || prev.meta?.geminiKey
            }
          }));
          setCloudStatus('connected');
        } else {
          // If cloud table has no leaves/finance yet, push current initial data
          syncAppStateToCloud({
            ...appState,
            meta: {
              ...appState.meta,
              geminiKey: cloudData.meta?.geminiKey || apiKey || ''
            }
          }).then(ok => {
            if (isMounted && ok) setCloudStatus('connected');
          });
        }
      }
    });

    const unsubscribe = subscribeToCloudAppState((remoteState) => {
      if (remoteState) {
        if (remoteState.meta?.geminiKey) {
          setApiKey(remoteState.meta.geminiKey);
          setStoredApiKey(remoteState.meta.geminiKey);
        }
        if (remoteState.leaves && remoteState.finance) {
          setAppState(prev => ({
            ...prev,
            ...remoteState,
            meta: { ...prev.meta, ...(remoteState.meta || {}) }
          }));
          setCloudStatus('connected');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Auto-save locally and debounce sync to Cloud
  useEffect(() => {
    saveAppState(appState);
    const timer = setTimeout(() => {
      setCloudStatus('syncing');
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

  // 3. Queue & Upload Actions (Instant Auto-Scan & Immediate Review Flow)
  const handleAddToQueue = async (files, docTypeHint) => {
    const newItems = files.map(file => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      docTypeHint,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      processedData: null
    }));

    const combined = [...newItems, ...queue];
    setQueue(combined);
    setActiveTab('upload');
    setIsProcessing(true);

    // Auto-process the newly added items immediately into inline table!
    const updatedQueue = [...combined];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === 'pending') {
        try {
          const res = await processUploadedImage(item.file, {
            docTypeHint: item.docTypeHint,
            apiKey,
            studentMaster: appState.studentMaster
          });

          updatedQueue[i] = {
            ...item,
            status: 'processed',
            processedData: {
              ...(res.result || {}),
              rawScan: res
            }
          };
          setQueue([...updatedQueue]);
        } catch (err) {
          console.error('Error processing item', err);
          updatedQueue[i] = {
            ...item,
            status: 'error',
            error: err.message
          };
          setQueue([...updatedQueue]);
        }
      }
    }

    setIsProcessing(false);
  };

  const handleRemoveFromQueue = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  const handleUpdateQueueItem = (id, updates) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          ...updates
        };
      }
      return item;
    }));
  };

  const handleProcessQueue = async () => {
    const pendingItems = queue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsProcessing(true);

    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === 'pending') {
        try {
          const res = await processUploadedImage(item.file, {
            docTypeHint: item.docTypeHint,
            apiKey,
            studentMaster: appState.studentMaster
          });

          updatedQueue[i] = {
            ...item,
            status: 'processed',
            processedData: {
              ...(res.result || {}),
              rawScan: res
            }
          };
          setQueue([...updatedQueue]);
        } catch (err) {
          console.error('Error processing item', err);
          updatedQueue[i] = {
            ...item,
            status: 'error',
            error: err.message
          };
          setQueue([...updatedQueue]);
        }
      }
    }

    setIsProcessing(false);
  };

  const handleApproveQueueItem = ({ type, item, queueId, rawOcr, imagePreview, fileName }) => {
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

    // 2. AI Flywheel: Harvest verified ground-truth training pair
    const sample = {
      id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      fileName: fileName || 'sample',
      docType: type,
      timestamp: new Date().toISOString(),
      rawOcr: rawOcr || null,
      groundTruth: finalItem,
      imagePreview: imagePreview || null
    };
    const updatedDataset = saveTrainingSample(sample);
    setTrainingCount(updatedDataset.length);

    // 3. Remove approved item from queue
    const remainingQueue = queue.filter(q => q.id !== queueId);
    setQueue(remainingQueue);

    // 4. If all items in queue are approved, navigate to table tab
    if (remainingQueue.length === 0) {
      if (type === 'leave') {
        setActiveTab('leave');
      } else {
        setActiveTab('finance');
      }
    }
  };

  const handleApproveSingleItem = (qItem) => {
    const type = qItem.processedData?.detectedType || qItem.docTypeHint || 'leave';
    if (type === 'leave') {
      const l = qItem.processedData?.leaveItems?.[0] || {};
      handleApproveQueueItem({
        type: 'leave',
        item: {
          id: `leave-${Date.now()}`,
          name: l.name?.trim() || 'សមណសិស្ស',
          grade: l.grade || '៣',
          reason: l.reason || 'ការងារផ្ទាល់ខ្លួន',
          duration: l.duration || '១ថ្ងៃ',
          date: l.date || new Date().toLocaleDateString('en-GB'),
          note: l.note || ''
        },
        queueId: qItem.id,
        rawOcr: qItem.processedData,
        imagePreview: qItem.previewUrl,
        fileName: qItem.fileName
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
        fileName: qItem.fileName
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

    readyItems.forEach(qItem => {
      const type = qItem.processedData?.detectedType || qItem.docTypeHint || 'leave';
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
          duration: l.duration || '១ថ្ងៃ',
          date: cleanDate,
          note: l.note || ''
        };
        newLeaves.push(leaveRecord);
        saveTrainingSample({
          id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fileName: qItem.fileName,
          docType: 'leave',
          timestamp: new Date().toISOString(),
          groundTruth: leaveRecord,
          imagePreview: qItem.previewUrl
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
        saveTrainingSample({
          id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fileName: qItem.fileName,
          docType: 'finance',
          timestamp: new Date().toISOString(),
          groundTruth: finRecord,
          imagePreview: qItem.previewUrl
        });
      }
    });

    mutateLeaves(newLeaves);
    mutateFinance(newFinance);
    setTrainingCount(getStoredTrainingDataset().length);
    setQueue(prev => prev.filter(q => q.status !== 'processed'));
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

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          leaveCount={currentLeaves.length}
          queueCount={queue.filter(q => q.status === 'pending').length}
          useKhmerNumerals={appState.meta.useKhmerNumerals}
        />

        {/* View 1: Student Leave Table (PDF 2) */}
        {activeTab === 'leave' && (
          <LeaveTableView
            records={currentLeaves}
            monthKey={currentMonthKey}
            metadata={appState.meta}
            useKhmerNumerals={appState.meta.useKhmerNumerals}
            studentMaster={appState.studentMaster}
            onUpdateRecords={mutateLeaves}
            onPrint={handlePrint}
          />
        )}

        {/* View 2: Finance Table (PDF 1) */}
        {activeTab === 'finance' && (
          <FinanceTableView
            financeData={currentFinance}
            monthKey={currentMonthKey}
            metadata={appState.meta}
            useKhmerNumerals={appState.meta.useKhmerNumerals}
            onUpdateFinance={mutateFinance}
            onPrint={handlePrint}
          />
        )}

        {/* View 3: Upload & OCR Scanner (Direct Inline Review Table) */}
        {activeTab === 'upload' && (
          <UploadSection
            queue={queue}
            studentMaster={appState.studentMaster}
            onAddToQueue={handleAddToQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
            onProcessQueue={handleProcessQueue}
            onUpdateQueueItem={handleUpdateQueueItem}
            onApproveItem={handleApproveSingleItem}
            onApproveAll={handleApproveAllQueue}
            isProcessing={isProcessing}
          />
        )}
      </main>

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
