import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { motion } from 'framer-motion'

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [question, setQuestion] = useState('')
  const [questionLoading, setQuestionLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [inputMode, setInputMode] = useState<'manual' | 'file'>('manual')
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, text: string }[]>([])
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Fetch users when Home mounts or when users panel is opened
    const fetchUsers = () => {
      fetch('http://localhost:3001/api/users')
        .then(res => res.json())
        .then(data => {
          // Map backend fields to frontend fields
          const mapped = data.map((user: any) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            createdAt: user.created_at // map created_at to createdAt
          }));
          setUsers(mapped);
        })
        .catch(err => console.error("Failed to fetch users:", err));
    };
    if (showUsers) {
      fetchUsers();
    }
    // Always fetch users on mount (so after signup, Home always has latest users)
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (users.length === 0) {
      fetchUsers();
    }
  }, [showUsers]);

  const handleSummarize = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setSummary("");
    try {
      const response = await fetch('http://localhost:8000/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });
      if (!response.ok) {
        throw new Error('Failed to get summary from backend');
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setSummary('Error: Could not get summary from backend.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleCopy = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1500)
    } catch (err) {
      setCopySuccess(false)
    }
  }

  const handleAskQuestion = async () => {
    if (!question.trim()) return
    setQuestionLoading(true)
    setAnswer('')
    try {
      const prompt = `Answer the question based on the context:\nContext: ${inputText}\nQuestion: ${question}`;
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        throw new Error('Failed to get answer from backend');
      }
      const data = await response.json();
      setAnswer(data.result);
    } catch (err) {
      setAnswer('Error: Could not get answer from backend.');
    } finally {
      setQuestionLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const newFiles: { name: string, text: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Failed to extract text from file');
        const data = await response.json();
        newFiles.push({ name: file.name, text: data.text });
      } catch (err) {
        newFiles.push({ name: file.name, text: 'Error: Could not extract text from file.' });
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    // If no file is selected, select the first new file
    if (selectedFileIndex === null && newFiles.length > 0) {
      setSelectedFileIndex(uploadedFiles.length);
      setInputText(newFiles[0].text);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      const newFiles: { name: string, text: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        try {
          const response = await fetch('http://localhost:8000/upload', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('Failed to extract text from file');
          const data = await response.json();
          newFiles.push({ name: file.name, text: data.text });
        } catch (err) {
          newFiles.push({ name: file.name, text: 'Error: Could not extract text from file.' });
        }
      }
      setUploadedFiles(prev => [...prev, ...newFiles]);
      if (selectedFileIndex === null && newFiles.length > 0) {
        setSelectedFileIndex(uploadedFiles.length);
        setInputText(newFiles[0].text);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectFile = (idx: number) => {
    setSelectedFileIndex(idx);
    setInputText(uploadedFiles[idx].text);
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== idx);
      // Update selected file and input text
      if (selectedFileIndex === idx) {
        if (newFiles.length === 0) {
          setSelectedFileIndex(null);
          setInputText('');
        } else {
          setSelectedFileIndex(0);
          setInputText(newFiles[0].text);
        }
      } else if (selectedFileIndex !== null && selectedFileIndex > idx) {
        setSelectedFileIndex(selectedFileIndex - 1);
      }
      return newFiles;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 flex flex-col"
    >
      {/* Header */}
      <header className="bg-white/80 dark:bg-secondary-800/80 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent m-0 p-0 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="inline-block w-8 h-8 mr-2 align-middle text-primary-600 dark:text-primary-400"
              fill="none"
              viewBox="0 0 32 32"
              stroke="currentColor"
              strokeWidth={2}
              style={{ verticalAlign: 'middle' }}
            >
              <rect x="4" y="6" width="10" height="20" rx="2" fill="currentColor" opacity="0.15"/>
              <rect x="18" y="6" width="10" height="20" rx="2" fill="currentColor" opacity="0.15"/>
              <rect x="4" y="6" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="18" y="6" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 10H4M28 10h-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Doc Digest
          </h1>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <button 
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Input Mode Selection */}
        <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-secondary-900 dark:text-white font-medium mb-2 sm:mb-0">Input Mode:</div>
          <div className="flex gap-2">
            <button
              className={`btn-secondary ${inputMode === 'manual' ? 'ring-2 ring-primary-500' : ''}`}
              onClick={() => setInputMode('manual')}
            >
              Manual
            </button>
            <button
              className={`btn-secondary ${inputMode === 'file' ? 'ring-2 ring-primary-500' : ''}`}
              onClick={() => setInputMode('file')}
            >
              Upload PDF/TXT
            </button>
          </div>
        </div>
        {/* Input Section */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
            Input Text
          </h2>
          {inputMode === 'manual' ? (
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your text here to summarize..."
              className="input-field min-h-[200px] resize-none"
              rows={8}
            />
          ) : (
           <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-secondary-400 dark:border-secondary-600 rounded-lg bg-secondary-50 dark:bg-secondary-800 min-h-[180px] cursor-pointer transition hover:bg-secondary-100 dark:hover:bg-secondary-700 p-6 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={handleFileClick}
            >
              <svg className="mx-auto mb-2" width="32" height="32" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 16V4M12 4l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="4" y="16" width="16" height="4" rx="2" fill="#fff" />
              </svg>
              <div className="text-secondary-700 dark:text-secondary-100 text-sm font-medium">Click or drag here to upload PDF/TXT files</div>
              <input
                type="file"
                accept=".pdf,.txt"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
            </div>
          )}

          {/* Uploaded Files List Section (inside input card, above summarize button) */}
          {inputMode === 'file' && uploadedFiles.length > 0 && (
            <div className="w-full my-4">
              <div className="text-xs text-secondary-500 mb-2">Uploaded Files:</div>
              <ul className="space-y-1">
                {uploadedFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <button
                      className={`flex-1 text-left px-2 py-1 rounded transition-colors ${selectedFileIndex === idx ? 'bg-primary-100 dark:bg-secondary-700 font-semibold' : 'hover:bg-secondary-100 dark:hover:bg-secondary-700'} text-secondary-900 dark:text-white`}
                      onClick={e => { e.stopPropagation(); handleSelectFile(idx); }}
                    >
                      {file.name}
                    </button>
                    <button
                      className="text-xs text-red-500 hover:underline px-2 py-1"
                      onClick={e => { e.stopPropagation(); handleRemoveFile(idx); }}
                      title="Remove file"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-secondary-500">
              {inputText.length} characters
            </span>
            <button
              onClick={handleSummarize}
              disabled={!inputText.trim() || isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Summarizing...</span>
                </div>
              ) : (
                'Summarize'
              )}
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
            Summary
          </h2>
          <div className="min-h-[200px] bg-secondary-50 dark:bg-secondary-700 rounded-lg p-4 border border-secondary-200 dark:border-secondary-600">
            {summary ? (
              <p className="text-secondary-800 dark:text-secondary-200 leading-relaxed">
                {summary}
              </p>
            ) : (
              <p className="text-secondary-500 dark:text-secondary-400 italic">
                Your short summary will appear here...
              </p>
            )}
          </div>
          {summary && (
            <div className="mt-4 flex justify-end space-x-3">
              <button className="btn-secondary" onClick={handleCopy}>
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
              <button className="btn-primary">
                Download
              </button>
            </div>
          )}
        </div>

        {/* Ask a Question Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Ask a question about the context
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Type your question here..."
              className="input-field flex-1"
              disabled={!summary || questionLoading}
            />
            <button
              className="btn-primary"
              onClick={handleAskQuestion}
              disabled={!question.trim() || questionLoading || !summary}
            >
              {questionLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          {answer && (
            <div className="mt-4 p-4 bg-secondary-100 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700">
              <span className="text-secondary-900 dark:text-secondary-100">{answer}</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-secondary-500 dark:text-secondary-400 text-sm border-t border-secondary-200 dark:border-secondary-700 bg-white/80 dark:bg-secondary-800/80">
        &copy; {new Date().getFullYear()} ContextSummarizer. All rights reserved.
      </footer>
    </motion.div>
  )
} 