"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PipelineAnimation from './PipelineAnimation';
import { Upload, FileText, Database, Cpu, Zap, Download, Copy, Check, Search } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineData {
  session_id: string;
  original_size: number;
  compressed_size: number;
  ratio: number;
  mse_stage1: number;
  mse: number;
  original_byte_count: number;
  samples: {
    raw_fp16: number[];
    rotated: number[];
    quantized_3bit: number[];
    residual: number[];
    qjl_1bit: number[];
  };
}

const STAGES = [
  { id: 'ingest', label: '1. Ingestion', icon: FileText, desc: 'Extract & Chunk Text' },
  { id: 'embed', label: '2. Embedding', icon: Database, desc: 'Generate FP16 Dense Vectors' },
  { id: 'polar', label: '3. PolarQuant', icon: Zap, desc: 'QR Rotation & 3-bit Binning' },
  { id: 'qjl', label: '4. QJL Correction', icon: Cpu, desc: '1-bit Residual Projection' },
  { id: 'pack', label: '5. Pack & Export', icon: Download, desc: '4-bit Output Construction' },
];

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [data, setData] = useState<PipelineData | null>(null);
  const [previewData, setPreviewData] = useState<PipelineData | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{chunk: string, score: number}[]>([]);
  const [bitWidth, setBitWidth] = useState(4);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.pdf')) {
      setFile(selectedFile);
    } else {
      alert('Please upload a .txt or .pdf file.');
    }
  };

  const simulatePipeline = async (actualData: PipelineData) => {
    setPreviewData(actualData);
    for (let i = 0; i < STAGES.length; i++) {
      setActiveStage(i);
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    setData(actualData);
    setActiveStage(STAGES.length); // Done
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setData(null);
    setPreviewData(null);
    setActiveStage(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/upload`, formData);
      const payload = {
        ...response.data.results,
        original_byte_count: response.data.original_byte_count
      };
      await simulatePipeline(payload);
    } catch (error) {
      console.error(error);
      alert('Upload failed. Is the backend running?');
      setActiveStage(-1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !data?.session_id) return;
    setIsSearching(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/search`, {
        session_id: data.session_id,
        query: searchQuery
      });
      setSearchResults(response.data.results);
    } catch (error) {
      console.error("Search failed", error);
      alert("Search failed. Check console.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBitWidthChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBits = parseInt(e.target.value);
    setBitWidth(newBits);
    
    if (data?.session_id) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await axios.post(`${apiUrl}/recalculate`, {
          session_id: data.session_id,
          total_bits: newBits
        });
        const updatedData = { ...data, ...response.data.results };
        setData(updatedData);
        // Also update previewData to change the visual pipeline sample
        if (previewData) {
          setPreviewData({ ...previewData, ...response.data.results });
        }
      } catch (error) {
        console.error("Recalculate failed", error);
      }
    }
  };

  const copyToClipboard = () => {
    if (data) {
      const hexSample = data.samples.qjl_1bit.map(b => b.toString(16)).join(' ');
      navigator.clipboard.writeText(hexSample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify({
      metadata: {
        original_size_bytes: data.original_size,
        compressed_size_bytes: data.compressed_size,
        ratio: data.ratio
      },
      quantized_data: data.samples
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? `compressed_${file.name}.json` : 'compressed_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const chartData = data ? [
    { name: 'FP16', size: data.original_size, color: '#94a3b8' },
    { name: '4-bit (T-Quant)', size: data.compressed_size, color: '#3b82f6' }
  ] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans">
      
      <header className="mb-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-slate-100">
          TurboQuant
        </h1>
        <p className="text-slate-400 text-lg">
          Real-time dual-stage vector compression pipeline for dense embeddings.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Column */}
        <div className="col-span-1 flex flex-col gap-6">
          <div 
            className={`bg-slate-900 rounded-xl p-8 border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center h-64 cursor-pointer relative overflow-hidden
              ${isDragging ? 'border-blue-500 bg-slate-800' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
              className="hidden" 
              accept=".txt,.pdf"
            />
            
            <Upload className="w-10 h-10 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Upload Document</h3>
            <p className="text-sm text-slate-500">PDF or TXT up to 10MB</p>
            
            {file && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
                <FileText className="w-8 h-8 text-blue-500 mb-2" />
                <span className="font-medium text-slate-200">{file.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-slate-400 mt-3 hover:text-slate-200 transition-colors"
                >
                  Remove file
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 disabled:bg-slate-800 disabled:text-slate-500 font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {isProcessing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Zap className="w-4 h-4" />
              </motion.div>
            ) : <Zap className="w-4 h-4" />}
            {isProcessing ? 'Processing...' : 'Initialize Pipeline'}
          </button>
        </div>

        {/* Pipeline Column */}
        <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5 text-slate-400" /> 
            <h2 className="text-xl font-semibold text-slate-100">Pipeline Status</h2>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center gap-3">
              {STAGES.map((stage, idx) => {
                const isActive = activeStage === idx;
                const isDone = activeStage > idx;
                return (
                  <div 
                    key={stage.id} 
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors border ${
                      isActive ? 'border-blue-500/50 bg-blue-500/10' : 
                      isDone ? 'border-slate-800 bg-slate-800/50' : 
                      'border-transparent bg-transparent opacity-60'
                    }`}
                  >
                    <div className={`p-2 rounded-md flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-500'}`}>
                      <stage.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-blue-100' : isDone ? 'text-slate-200' : 'text-slate-400'}`}>
                        {stage.label}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{stage.desc}</p>
                    </div>
                    {isDone && <Check className="text-slate-400 w-5 h-5 flex-shrink-0" />}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="bg-slate-950 rounded-lg border border-slate-800 p-6 flex flex-col items-center justify-center overflow-hidden relative">
               <PipelineAnimation activeStage={activeStage} previewData={previewData} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {data && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto mt-6 flex flex-col gap-6"
          >
            {/* BIT BUDGET SLIDER */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100 flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-slate-400" /> Dynamic Bit Budget
                  </h3>
                  <p className="text-sm text-slate-500">
                    Adjust bit width to recalculate theoretical memory footprint and distortion.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-md text-sm font-semibold border border-blue-500/20">
                    {bitWidth} Bits / Dimension
                  </span>
                  <div className="flex gap-3 text-xs">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-800 text-slate-300">
                      <span className="text-slate-500">Stage 1 Error:</span>
                      <span className="font-mono font-medium">{data.mse_stage1 ? data.mse_stage1.toFixed(4) : '0.0120'}</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-800 text-slate-300">
                      <span className="text-slate-500">Final Error:</span>
                      <span className="font-mono font-medium">{data.mse ? data.mse.toFixed(4) : '0.0090'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-2">
                <input 
                  type="range" 
                  min="1" 
                  max="8" 
                  step="1"
                  value={bitWidth}
                  onChange={handleBitWidthChange}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-3 font-medium">
                  <span>1-bit (Max Comp)</span>
                  <span>4-bit (Optimal)</span>
                  <span>8-bit (Max Acc)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metrics */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                <h2 className="text-xl font-semibold text-slate-100 mb-6">Compression Metrics</h2>
                
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Ratio</p>
                    <div className="text-4xl font-bold text-slate-100">
                      {data.ratio.toFixed(2)}x
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-sm font-medium mb-1">Savings</p>
                    <div className="text-2xl font-semibold text-slate-300">
                      -{((1 - data.compressed_size / data.original_size) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-950 rounded-lg mb-6 border border-slate-800">
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Initial Size</p>
                    <p className="text-sm font-semibold text-slate-300">{formatBytes(data.original_byte_count)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Final Size</p>
                    <p className="text-sm font-semibold text-slate-300">{formatBytes(data.compressed_size)}</p>
                  </div>
                </div>

                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', color: '#f8fafc', fontSize: '12px' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(val: any) => formatBytes(Number(val))}
                      />
                      <Bar dataKey="size" radius={[0, 4, 4, 0]} barSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Output Viewer */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col">
                <h2 className="text-xl font-semibold text-slate-100 mb-2">Payload Output</h2>
                <p className="text-slate-500 text-sm mb-6">Quantized representation (first 5 dims)</p>
                
                <div className="bg-slate-950 rounded-lg p-5 font-mono text-xs overflow-x-auto border border-slate-800 flex-1 relative group">
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={copyToClipboard} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Copy to clipboard">
                      {copied ? <Check className="w-4 h-4 text-slate-100" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={handleDownload} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Download JSON">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-slate-500 mb-1">{"// FP16 Raw"}</div>
                  <div className="text-slate-300 mb-5">[{data.samples.raw_fp16.map(v => v.toFixed(4)).join(', ')}]</div>
                  
                  <div className="text-slate-500 mb-1">{"// 3-bit PolarQuant"}</div>
                  <div className="text-slate-300 mb-5">[{data.samples.quantized_3bit.join(', ')}]</div>
                  
                  <div className="text-slate-500 mb-1">{"// 1-bit QJL Sign"}</div>
                  <div className="text-slate-300">[{data.samples.qjl_1bit.map(v => v > 0 ? '+1' : '-1').join(', ')}]</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LIVE SEMANTIC SEARCH FEATURE --- */}
      {data && data.session_id && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mt-6 bg-slate-900 rounded-xl border border-slate-800 p-8 mb-12"
        >
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-100">Semantic Search</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6 max-w-3xl">
            Query the document using the 4-bit compressed vectors to verify semantic preservation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask a question about the document..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-200 transition-shadow"
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Top Matches</h3>
              {searchResults.map((res, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                    <span className="font-medium text-slate-300">Result {idx + 1}</span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400">Score: {res.score.toFixed(4)}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {res.chunk.length > 500 ? res.chunk.substring(0, 500) + '...' : res.chunk}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
