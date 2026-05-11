"use client";

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

function LeadImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (csvFile) => {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Import failed');
      }

      return response.json();
    },
    onMutate: () => {
      setStatus('uploading');
      setErrorMsg(null);
      setResult(null);
    },
    onSuccess: (data) => {
      setStatus('success');
      setResult(data);
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      if (onSuccess) onSuccess(data);
    },
    onError: (err) => {
      setStatus('error');
      setErrorMsg(err.message);
    },
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.csv')) {
        setFile(droppedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload a CSV file');
      }
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleImport = () => {
    if (file) {
      let prog = 0;
      const interval = setInterval(() => {
        prog += 10;
        if (prog <= 90) setProgress(prog);
      }, 200);
      importMutation.mutate(file);
      setTimeout(() => clearInterval(interval), 2100);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    if (!importMutation.isPending) {
      onClose();
      handleReset();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-lg">Import Contacts from CSV</h3>
          <button onClick={handleClose} className="hover:bg-slate-100 p-2 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Upload a CSV file with contact data. Required columns:{' '}
            <strong>name</strong>, <strong>email</strong>.
            Optional: phone, whatsapp, message, score (High/Medium/Low), category, intent_summary.
          </p>

          {/* Drop Zone */}
          <div
            className={`p-6 border-2 border-dashed rounded-xl text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : file
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleChange}
              className="hidden"
              id="csv-file-input"
            />
            {file ? (
              <div className="space-y-2">
                <FileText size={32} className="mx-auto text-green-600" />
                <p className="font-medium text-slate-700">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <label htmlFor="csv-file-input" className="cursor-pointer block">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">Drag & drop a CSV file here, or click to select</p>
              </label>
            )}
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Progress */}
          {status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Success */}
          {status === 'success' && result && (
            <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle size={20} className="text-green-600 shrink-0" />
              <div className="space-y-1 w-full">
                <p className="font-bold text-green-800">{result.message}</p>
                <div className="flex gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700">
                    Imported: {result.successCount}
                  </span>
                  {result.errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700">
                      Errors: {result.errorCount}
                    </span>
                  )}
                </div>
                {result.errorCount > 0 && result.errors && result.errors.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-red-200 rounded-lg p-2">
                    <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">
                      {result.errors.slice(0, 100).join('\n')}
                      {result.errors.length > 100 && `... and ${result.errors.length - 100} more errors`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Details */}
          {status === 'error' && result?.errors?.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg p-2">
              <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">
                {result.errors.slice(0, 50).join('\n')}
                {result.errors.length > 50 && `... and ${result.errors.length - 50} more errors`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          {status === 'idle' || status === 'error' ? (
            <button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                file
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Upload size={16} />
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </button>
          ) : status === 'success' ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default LeadImportModal;
